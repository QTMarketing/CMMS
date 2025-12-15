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
    const file = formData.get("file") as File | null;
    const storeIdParam = formData.get("storeId") as string | null;

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
      "asset id": "assetId",
      "assetid": "assetId",
      "asset_id": "assetId",
      "asset name": "name",
      "assetname": "name",
      "asset_name": "name",
      "name": "name",
      "parent asset id": "parentAssetIdNumber",
      "parentassetid": "parentAssetIdNumber",
      "parent_asset_id": "parentAssetIdNumber",
      "parent asset name": "parentAssetName",
      "parentassetname": "parentAssetName",
      "parent_asset_name": "parentAssetName",
      "location": "location",
      "status": "status",
      "make": "make",
      "model": "model",
      "category": "category",
      "tool check-out": "toolCheckOut",
      "toolcheckout": "toolCheckOut",
      "tool_check_out": "toolCheckOut",
      "check-out requires approval": "checkOutRequiresApproval",
      "checkoutrequiresapproval": "checkOutRequiresApproval",
      "check_out_requires_approval": "checkOutRequiresApproval",
      "default wo template": "defaultWOTemplate",
      "defaultwotemplate": "defaultWOTemplate",
      "default_wo_template": "defaultWOTemplate",
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
        
        if (!name) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Asset name is required`);
          continue;
        }

        const assetId = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "assetId") || ""];
        const assetIdNum = assetId ? parseInt(String(assetId).trim(), 10) : null;
        
        // Check if assetId already exists (if provided)
        // Note: This uses raw SQL to work around Prisma Client limitations before migration is applied
        if (assetIdNum !== null && !isNaN(assetIdNum)) {
          try {
            const existing = await prisma.$queryRaw<Array<{ id: string }>>`
              SELECT id FROM "Asset" WHERE "assetId" = ${assetIdNum} LIMIT 1
            `;
            if (existing && existing.length > 0) {
              results.failed++;
              results.errors.push(`Row ${i + 2}: Asset ID ${assetIdNum} already exists`);
              continue;
            }
          } catch (err: any) {
            // If assetId column doesn't exist yet, skip duplicate check
            // This allows import to proceed even if migration hasn't been run
            if (!err.message?.includes('column "assetId" does not exist')) {
              console.warn(`Could not check for duplicate assetId: ${err.message}`);
            }
          }
        }

        const location = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "location") || ""]?.toString().trim() || "";
        const status = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "status") || ""]?.toString().trim() || "Active";
        const make = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "make") || ""]?.toString().trim() || null;
        const model = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "model") || ""]?.toString().trim() || null;
        const category = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "category") || ""]?.toString().trim() || null;
        
        const parentAssetIdNumber = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "parentAssetIdNumber") || ""];
        const parentAssetIdNum = parentAssetIdNumber ? parseInt(String(parentAssetIdNumber).trim(), 10) : null;
        
        const parentAssetName = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "parentAssetName") || ""]?.toString().trim() || null;
        
        // If parentAssetIdNumber is provided, try to find the parent asset
        // Note: This uses raw SQL to work around Prisma Client limitations before migration is applied
        let parentAssetId: string | null = null;
        let resolvedParentAssetName: string | null = null;
        if (parentAssetIdNum !== null && !isNaN(parentAssetIdNum)) {
          try {
            const parentAssets = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
              SELECT id, name FROM "Asset" WHERE "assetId" = ${parentAssetIdNum} LIMIT 1
            `;
            if (parentAssets && parentAssets.length > 0) {
              parentAssetId = parentAssets[0].id;
              resolvedParentAssetName = parentAssets[0].name;
            }
          } catch (err: any) {
            // If assetId column doesn't exist yet, skip parent lookup
            if (!err.message?.includes('column "assetId" does not exist')) {
              console.warn(`Could not find parent asset by assetId: ${err.message}`);
            }
          }
        }

        const toolCheckOut = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "toolCheckOut") || ""];
        const toolCheckOutNum = toolCheckOut ? parseInt(String(toolCheckOut).trim(), 10) : 0;
        
        const checkOutRequiresApproval = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "checkOutRequiresApproval") || ""];
        const checkOutApprovalNum = checkOutRequiresApproval ? (String(checkOutRequiresApproval).toLowerCase() === "yes" || String(checkOutRequiresApproval) === "1" ? 1 : 0) : 0;
        
        const defaultWOTemplate = row[Object.keys(normalizedColumns).find(k => normalizedColumns[k] === "defaultWOTemplate") || ""];
        const defaultWOTemplateNum = defaultWOTemplate ? parseInt(String(defaultWOTemplate).trim(), 10) : null;

        await prisma.asset.create({
          data: {
            id: crypto.randomUUID(),
            assetId: assetIdNum && !isNaN(assetIdNum) ? assetIdNum : null,
            name,
            location,
            status: ["Active", "Down", "Retired"].includes(status) ? status : "Active",
            make,
            model,
            category,
            parentAssetId,
            parentAssetIdNumber: parentAssetIdNum && !isNaN(parentAssetIdNum) ? parentAssetIdNum : null,
            parentAssetName: parentAssetName || resolvedParentAssetName,
            toolCheckOut: toolCheckOutNum || 0,
            checkOutRequiresApproval: checkOutApprovalNum,
            defaultWOTemplate: defaultWOTemplateNum && !isNaN(defaultWOTemplateNum) ? defaultWOTemplateNum : null,
            storeId: store.id,
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Row ${i + 2}: ${error.message || "Failed to create asset"}`);
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
    console.error("Error bulk importing assets:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process Excel file" },
      { status: 500 }
    );
  }
}

