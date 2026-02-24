import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const rows = [
    {
      Name: "Vendor One",
      Email: "vendor1@example.com",
      Phone: "(555) 111-2222",
      "Service on": "Electrical",
      Note: "Preferred for store A",
      Store: "",
    },
    {
      Name: "Vendor Two",
      Email: "vendor2@example.com",
      Phone: "",
      "Service on": "HVAC",
      Note: "",
      Store: "",
    },
  ];
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Vendors");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=vendor_import_template.xlsx",
    },
  });
}
