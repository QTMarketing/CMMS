import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike, isMasterAdmin } from "@/lib/roles";
import { getScopedStoreId } from "@/lib/storeAccess";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isAdminLike((session.user as any)?.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const role = (session.user as any)?.role as string | undefined;
    const userStoreId = ((session.user as any)?.storeId ?? null) as string | null;

    const formData = await req.formData();
    // Cast to any to avoid TS lib mismatch between Node and DOM FormData types
    const file = (formData as any).get("file") as File | null;
    const storeIdParam = (formData as any).get("storeId") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Determine store ID
    let storeId: string | null = null;
    if (isMasterAdmin(role)) {
      if (!storeIdParam) {
        return NextResponse.json(
          { success: false, error: "Store ID is required for bulk import." },
          { status: 400 }
        );
      }
      storeId = storeIdParam;
    } else {
      const scopedStoreId = getScopedStoreId(role, userStoreId);
      if (!scopedStoreId) {
        return NextResponse.json(
          { success: false, error: "Your user account is not associated with a store." },
          { status: 400 }
        );
      }
      storeId = scopedStoreId;
    }

    // Verify store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Invalid store selected." },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "application/vnd.oasis.opendocument.spreadsheet", // .ods
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|ods)$/i)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Only Excel files (.xlsx, .xls, .ods) are allowed." },
        { status: 400 }
      );
    }

    // Read and parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { success: false, error: "Excel file is empty or invalid." },
        { status: 400 }
      );
    }

    // Expected column mappings (flexible - case-insensitive matching)
    const columnMap: Record<string, string> = {
      "name": "name",
      "part name": "name",
      "partname": "name",
      "part_name": "name",
      "part number": "partNumber",
      "partnumber": "partNumber",
      "part_number": "partNumber",
      "quantity on hand": "quantityOnHand",
      "quantityonhand": "quantityOnHand",
      "quantity_on_hand": "quantityOnHand",
      "qty": "quantityOnHand",
      "quantity": "quantityOnHand",
      "reorder threshold": "reorderThreshold",
      "reorderthreshold": "reorderThreshold",
      "reorder_threshold": "reorderThreshold",
      "threshold": "reorderThreshold",
      "location": "location",
    };

    // Normalize column names from first row
    const firstRow = data[0] as Record<string, any>;
    const normalizedColumns: Record<string, string> = {};
    Object.keys(firstRow).forEach((key) => {
      const normalized = key.toLowerCase().trim();
      if (columnMap[normalized]) {
        normalizedColumns[key] = columnMap[normalized];
      }
    });

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as Record<string, any>;
      
      try {
        // Extract values using normalized column mapping
        const name = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "name") || ""]?.toString().trim();
        const partNumber = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "partNumber") || ""]?.toString().trim();
        
        if (!name) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Part name is required`);
          continue;
        }

        if (!partNumber) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Part number is required`);
          continue;
        }

        const quantityOnHand = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "quantityOnHand") || ""];
        const quantityOnHandNum = quantityOnHand ? parseInt(String(quantityOnHand).trim(), 10) : 0;
        
        if (isNaN(quantityOnHandNum)) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Invalid quantity on hand`);
          continue;
        }

        const reorderThreshold = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "reorderThreshold") || ""];
        const reorderThresholdNum = reorderThreshold ? parseInt(String(reorderThreshold).trim(), 10) : 0;
        
        if (isNaN(reorderThresholdNum)) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Invalid reorder threshold`);
          continue;
        }

        const location = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "location") || ""]?.toString().trim() || null;

        await prisma.inventoryItem.create({
          data: {
            id: crypto.randomUUID(),
            name,
            partNumber,
            quantityOnHand: quantityOnHandNum,
            reorderThreshold: reorderThresholdNum,
            location,
            storeId: store.id,
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Row ${i + 2}: ${error.message || "Failed to create inventory item"}`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          total: data.length,
          successful: results.success,
          failed: results.failed,
          errors: results.errors.slice(0, 50), // Limit to first 50 errors
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error bulk importing inventory items:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process Excel file" },
      { status: 500 }
    );
  }
}

