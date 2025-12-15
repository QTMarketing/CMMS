# Excel Bulk Import Guide

This guide explains how to bulk import Assets and Inventory Items (Parts) using Excel files.

## Overview

The system supports bulk importing data from Excel files (.xlsx, .xls, or .ods format). You must select a store before uploading the file, and all imported items will be associated with that store.

## Access Requirements

- **MASTER_ADMIN**: Can import to any store (must select store before upload)
- **STORE_ADMIN**: Can only import to their own store (store is automatically selected)
- **USER/TECHNICIAN**: Cannot import data

## Importing Assets

### Location
- Navigate to **Assets** page
- Click **"Import Assets from Excel"** button

### Excel File Format

Your Excel file should have the following columns (column names are case-insensitive and flexible):

| Column Name (Examples) | Required | Description | Example Values |
|------------------------|----------|-------------|----------------|
| Asset ID / AssetID / Asset_ID | No | Numeric asset ID (must be unique) | 1001, 2005 |
| Asset Name / AssetName / Name | **Yes** | Name of the asset | "HVAC Unit - Store 1" |
| Location | No | Physical location | "Store #1 - Roof" |
| Status | No | Asset status (defaults to "Active") | Active, Down, Retired |
| Make | No | Manufacturer name | Caterpillar, John Deere |
| Model | No | Model number/name | CAT 320D, JD 850K |
| Category | No | Asset category | Heavy Equipment, Vehicles, Tools |
| Parent Asset ID / ParentAssetID | No | Numeric ID of parent asset | 1000 |
| Parent Asset Name / ParentAssetName | No | Name of parent asset | "Main Building" |
| Tool Check-Out / ToolCheckOut | No | Number of tools checked out (default: 0) | 0, 5, 10 |
| Check-Out Requires Approval / CheckOutRequiresApproval | No | 1 = Yes, 0 = No (default: 0) | 0, 1 |
| Default WO Template / DefaultWOTemplate | No | Default work order template ID | 1, 2, 3 |

### Example Excel File (Assets)

```
Asset ID | Asset Name              | Location        | Status | Make         | Model  | Category          | Parent Asset ID | Tool Check-Out | Check-Out Requires Approval
---------|-------------------------|-----------------|--------|--------------|--------|-------------------|-----------------|----------------|----------------------------
1001     | HVAC Unit - Store 1     | Store #1 - Roof | Active | Carrier      | 50RT   | HVAC              |                 | 0              | 0
1002     | Fuel Pump #1            | Store #1        | Active | Gilbarco     | Encore | Fuel Equipment    |                 | 2              | 1
1003     | Cooler Unit A            | Store #1 - Back | Active | True         | T-49   | Refrigeration     | 1001            | 0              | 0
```

### Notes for Assets Import

- **Asset Name** is required for each row
- **Asset ID** must be unique if provided (will skip duplicates)
- **Parent Asset ID** must reference an existing asset's Asset ID (not the database ID)
- If **Parent Asset ID** is provided but **Parent Asset Name** is not, the system will auto-fill the name
- **Status** defaults to "Active" if not provided or invalid
- Rows with missing required fields will be skipped with error messages

---

## Importing Inventory Items (Parts)

### Location
- Navigate to **Inventory** page
- Click **"Import Inventory Items from Excel"** button

### Excel File Format

Your Excel file should have the following columns (column names are case-insensitive and flexible):

| Column Name (Examples) | Required | Description | Example Values |
|------------------------|----------|-------------|----------------|
| Name / Part Name / PartName | **Yes** | Name of the inventory item | "HVAC Filter" |
| Part Number / PartNumber / Part_Number | **Yes** | Part number/SKU | "FIL-001", "ABC123" |
| Quantity On Hand / QuantityOnHand / Qty | **Yes** | Current stock quantity | 50, 100 |
| Reorder Threshold / ReorderThreshold / Threshold | **Yes** | Minimum stock level | 10, 20 |
| Location | No | Storage location | "Warehouse A", "Shelf 3" |

### Example Excel File (Inventory)

```
Name              | Part Number | Quantity On Hand | Reorder Threshold | Location
------------------|-------------|------------------|-------------------|------------
HVAC Filter       | FIL-001     | 50               | 10                | Warehouse A
Fuel Pump Nozzle  | FP-200      | 25               | 5                 | Store #1
Cooler Thermostat | CT-150      | 15               | 3                 | Warehouse B
```

### Notes for Inventory Import

- **Name** and **Part Number** are required for each row
- **Quantity On Hand** and **Reorder Threshold** must be valid numbers
- Rows with missing required fields or invalid numbers will be skipped with error messages

---

## Import Process

1. **Select Store** (Master Admin only)
   - Master Admins must select a store from the dropdown
   - Store Admins automatically use their assigned store

2. **Choose Excel File**
   - Click "Choose file..." button
   - Select your Excel file (.xlsx, .xls, or .ods)
   - File name will be displayed

3. **Import**
   - Click "Import [Assets/Inventory Items]" button
   - System will process the file and show results

4. **Review Results**
   - Success count: Number of items successfully imported
   - Failed count: Number of rows that failed (with error messages)
   - Error list: Detailed error messages for failed rows

## Error Handling

The import process will:
- **Skip** rows with missing required fields
- **Skip** rows with invalid data (e.g., non-numeric values where numbers are expected)
- **Skip** duplicate Asset IDs (if Asset ID is provided)
- **Continue** processing remaining rows even if some fail

All errors are displayed in the results, showing the row number and reason for failure.

## Tips

1. **Test with a small file first** to verify your format is correct
2. **Use consistent column names** - the system is flexible but consistent naming helps
3. **Check for duplicates** - ensure Asset IDs are unique before importing
4. **Verify parent assets exist** - if using Parent Asset ID, ensure those assets are already in the system
5. **Save your Excel file** before uploading to ensure all data is saved

## Troubleshooting

### "Invalid file type" error
- Ensure your file is saved as .xlsx, .xls, or .ods format
- Try saving the file again with a different name

### "Store ID is required" error
- Master Admins must select a store before uploading
- Store Admins should see their store automatically selected

### "Excel file is empty" error
- Ensure your Excel file has data in the first sheet
- Check that the first row contains column headers

### Import shows 0 successful
- Check the error messages for each row
- Verify required columns are present and named correctly
- Ensure data types match expected formats (numbers for numeric fields)

