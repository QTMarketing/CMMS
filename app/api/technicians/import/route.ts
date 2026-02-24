import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike, isMasterAdmin, isVendor } from "@/lib/roles";

type ImportRow = {
  name: string;
  email: string;
  phone?: string | null;
  serviceOn?: string | null;
  note?: string | null;
  storeCodeOrName?: string | null;
  storeId?: string | null;
};

function normalizeHeader(h: string): string {
  return (h ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function rowFromSheetRow(row: Record<string, unknown>): ImportRow | null {
  const keys = Object.keys(row);
  const byKey: Record<string, string> = {};
  keys.forEach((k) => {
    const v = row[k];
    if (v !== undefined && v !== null) byKey[normalizeHeader(k)] = String(v).trim();
  });

  const name = byKey["name"] ?? byKey["vendor's name"] ?? byKey["vendor name"];
  const email = byKey["email"];
  if (!name || !email) return null;

  return {
    name,
    email,
    phone: byKey["phone"] || null,
    serviceOn: byKey["service on"] ?? byKey["serviceon"] ?? null,
    note: byKey["note"] ?? null,
    storeCodeOrName: byKey["store"] ?? byKey["store code"] ?? byKey["location"] ?? null,
    storeId: byKey["storeid"] ?? byKey["store id"] ?? null,
  };
}

function parseExcel(buffer: Buffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  const rows: ImportRow[] = [];
  for (const row of json) {
    const r = rowFromSheetRow(row);
    if (r) rows.push(r);
  }
  return rows;
}

function parseXml(buffer: Buffer): ImportRow[] {
  const text = buffer.toString("utf-8");
  const rows: ImportRow[] = [];
  const vendorRegex = /<vendor[^>]*>([\s\S]*?)<\/vendor>/gi;
  const getTag = (block: string, tag: string): string | null => {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
    const m = block.match(re);
    return m ? m[1].trim() : null;
  };
  let m: RegExpExecArray | null;
  while ((m = vendorRegex.exec(text)) !== null) {
    const block = m[1];
    const name = getTag(block, "name") ?? getTag(block, "vendorName");
    const email = getTag(block, "email");
    if (!name || !email) continue;
    rows.push({
      name,
      email,
      phone: getTag(block, "phone") ?? null,
      serviceOn: getTag(block, "serviceOn") ?? getTag(block, "service_on") ?? null,
      note: getTag(block, "note") ?? null,
      storeCodeOrName: getTag(block, "store") ?? getTag(block, "storeCode") ?? getTag(block, "location") ?? null,
      storeId: getTag(block, "storeId") ?? null,
    });
  }
  return rows;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role as string | undefined;
    const userStoreId = ((session.user as any)?.storeId ?? null) as string | null;

    if (!isAdminLike(role) || isVendor(role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const defaultStoreIdParam = (formData.get("storeId") as string)?.trim() || null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided. Upload an Excel (.xlsx, .xls) or XML file." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const name = (file.name || "").toLowerCase();

    let rows: ImportRow[];
    if (name.endsWith(".xml")) {
      rows = parseXml(buffer);
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      rows = parseExcel(buffer);
    } else {
      return NextResponse.json(
        { success: false, error: "Unsupported file type. Use .xlsx, .xls, or .xml" },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid rows found. Ensure the file has at least Name and Email columns (Excel) or <name> and <email> inside <vendor> (XML)." },
        { status: 400 }
      );
    }

    const isMaster = isMasterAdmin(role);
    const defaultStoreId = isMaster ? defaultStoreIdParam : userStoreId;

    if (!isMaster && !userStoreId) {
      return NextResponse.json(
        { success: false, error: "Your account has no store assigned." },
        { status: 400 }
      );
    }

    const stores = await prisma.store.findMany({
      select: { id: true, name: true, code: true },
    });
    const storeById = new Map(stores.map((s) => [s.id, s]));
    const storeByCode = new Map(stores.filter((s) => s.code).map((s) => [s.code!.toLowerCase().trim(), s]));
    const storeByName = new Map(stores.map((s) => [s.name.toLowerCase().trim(), s]));

    function resolveStoreId(row: ImportRow): string | null {
      if (row.storeId && storeById.has(row.storeId)) return row.storeId;
      if (row.storeCodeOrName) {
        const key = row.storeCodeOrName.toLowerCase().trim();
        const byCode = storeByCode.get(key);
        if (byCode) return byCode.id;
        const byName = storeByName.get(key);
        if (byName) return byName.id;
      }
      return defaultStoreId;
    }

    const result = { created: 0, skipped: 0, errors: [] as { row: number; email: string; message: string } };
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      if (!emailPattern.test(row.email)) {
        result.errors.push({ row: rowNum, email: row.email, message: "Invalid email address." });
        result.skipped++;
        continue;
      }

      const storeId = resolveStoreId(row);
      if (!storeId) {
        result.errors.push({
          row: rowNum,
          email: row.email,
          message: "Could not determine store. Set a default store or include Store/Store Code in the file.",
        });
        result.skipped++;
        continue;
      }

      const existingVendor = await prisma.vendor.findFirst({
        where: { email: row.email.trim() },
      });
      if (existingVendor) {
        result.errors.push({ row: rowNum, email: row.email, message: "Vendor with this email already exists." });
        result.skipped++;
        continue;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: row.email.trim() },
      });
      if (existingUser) {
        result.errors.push({ row: rowNum, email: row.email, message: "A user account with this email already exists." });
        result.skipped++;
        continue;
      }

      try {
        await prisma.vendor.create({
          data: {
            id: crypto.randomUUID(),
            name: row.name.trim(),
            email: row.email.trim(),
            phone: row.phone?.trim() || null,
            serviceOn: row.serviceOn?.trim() || null,
            note: row.note?.trim() || null,
            active: true,
            storeId,
          },
        });
        result.created++;
      } catch (err) {
        result.errors.push({ row: rowNum, email: row.email, message: (err as Error).message });
        result.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created: result.created,
        skipped: result.skipped,
        total: rows.length,
        errors: result.errors.slice(0, 50),
      },
    });
  } catch (err) {
    console.error("Vendor import error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message || "Import failed." },
      { status: 500 }
    );
  }
}
