# 02 – Data Model Specification
## CMMS Dashboard – Core Entities, Rules & Data Constraints
## Version: v1.0 (Fully Detailed)

This document defines **all data models**, **constraints**, **relationships**, and **validation rules** for the CMMS system.  
Cursor MUST follow these structures exactly when generating:

- Database schemas
- TypeScript interfaces
- API request/response handlers
- Validation logic
- Mock/dummy data
- UI table definitions
- Status transitions
- Sorting logic

---

# 1. Core Entities in v1

The CMMS v1 includes the following entities:

1. **WorkOrder** (core)
2. **Asset** (core)
3. **Technician** (core)
4. **InventoryItem** (core)

Future entities (NOT needed now):
- User
- PreventiveMaintenanceSchedule
- MaintenanceEvent

---

# 2. WORK ORDER MODEL (Required, core of CMMS)

Represents a repair, maintenance task, inspection, or scheduled service.

## TypeScript Interface

```ts
type Priority = "Low" | "Medium" | "High";
type WorkOrderStatus = "Open" | "In Progress" | "Completed" | "Cancelled";

interface WorkOrder {
  id: string;              // MUST be unique (e.g., "WO-001")
  title: string;           // Required
  description?: string;    // Optional

  assetId: string;         // MUST match an Asset.id
  priority: Priority;      // Required

  status: WorkOrderStatus; // Required
  assignedTo?: string;     // Must match Technician.id when present

  createdAt: string;       // MUST be a valid ISO timestamp
  dueDate?: string;        // Optional ISO date
  completedAt?: string;    // MUST ONLY exist when status = "Completed"
}
```

## Work Order Rules (IMPORTANT)
Cursor must enforce ALL of these:

### ✔ ID rules
- `id` must be **unique**
- Recommended format: `WO-###` (e.g., WO-001)

### ✔ Required fields
- `title`
- `assetId`
- `priority`
- `status`
- `createdAt`

### ✔ Optional fields
- `description`
- `dueDate`
- `assignedTo`
- `completedAt` (only allowed with Completed status)

### ✔ Status & Completion Rules
- If `status = "Completed"` → MUST include `completedAt`
- If `status != "Completed"` → MUST NOT include `completedAt`
- Valid transitions:
  - Open → In Progress
  - In Progress → Completed
  - Open → Cancelled

### ✔ Sorting Rules
Cursor MUST sort WorkOrders as follows:
- **Dashboard Recent Table:** `createdAt` descending
- **Scheduling Views:** `dueDate` ascending

### ✔ Relationship Rules
- `assetId` MUST reference `Asset.id`
- `assignedTo` MUST reference `Technician.id` (if present)

---

# 3. ASSET MODEL (Required)

Represents store equipment like pumps, HVAC units, freezers, coolers, generators, POS terminals, etc.

## TypeScript Interface

```ts
type AssetStatus = "Active" | "Down" | "Retired";

interface Asset {
  id: string;                 // MUST be unique (e.g., "A-001")
  name: string;               // Required
  location: string;           // Required (e.g., "Store #1 – Pump 3")
  status: AssetStatus;        // Required

  lastMaintenanceDate?: string;  // ISO date
  nextMaintenanceDate?: string;  // ISO date
}
```

## Asset Rules
- Assets MUST remain referenceable by Work Orders.
- Assets with `status = "Down"` should be visually highlighted in UI.
- Assets must be displayed with fields:
  - name
  - location
  - status
  - lastMaintenanceDate
  - nextMaintenanceDate

---

# 4. TECHNICIAN MODEL (Required)

Represents maintenance staff who can be assigned work orders.

## TypeScript Interface

```ts
interface Technician {
  id: string;         // Unique (e.g., "T-001")
  name: string;       // Required
  email: string;      // Required
  phone?: string;     // Optional
  active: boolean;    // Required (true = available)
}
```

## Technician Rules
- Inactive technicians must NOT appear in assignment dropdowns.
- Technicians MUST have unique IDs.
- `assignedTo` in Work Orders MUST reference a valid technician.

---

# 5. INVENTORY MODEL (Required)

Represents consumable or reusable spare parts used for repairs and maintenance.

## TypeScript Interface

```ts
interface InventoryItem {
  id: string;                // Unique (e.g., "INV-001")
  name: string;              // Required
  partNumber: string;        // Required
  quantityOnHand: number;    // Required
  reorderThreshold: number;  // Required
  location?: string;         // Optional
}
```

## Inventory Rules
- Items should be visually marked as **LOW STOCK** when:
  `quantityOnHand <= reorderThreshold`
- Inventory tables MUST be sorted by item `name` ascending.
- Cursor MUST ensure values are non-negative integers.

---

# 6. SAMPLE DATA FOR DEVELOPMENT

Cursor MUST use these exact data shapes for dummy data in API routes and UI components.

## Work Orders

```ts
export const workOrders: WorkOrder[] = [
  {
    id: "WO-001",
    title: "Replace HVAC Filter – Unit 3",
    description: "Filter clogged, needs replacement.",
    assetId: "A-001",
    priority: "High",
    status: "Open",
    assignedTo: "T-001",
    createdAt: "2025-01-10T09:00:00Z",
    dueDate: "2025-01-12T17:00:00Z"
  },
  {
    id: "WO-002",
    title: "Fix gas pump nozzle leak",
    assetId: "A-005",
    priority: "Medium",
    status: "In Progress",
    assignedTo: "T-002",
    createdAt: "2025-01-11T11:30:00Z"
  }
];
```

## Assets

```ts
export const assets: Asset[] = [
  {
    id: "A-001",
    name: "HVAC Unit – Store 1",
    location: "Store #1 – Roof",
    status: "Active",
    lastMaintenanceDate: "2024-12-10",
    nextMaintenanceDate: "2025-02-10"
  },
  {
    id: "A-005",
    name: "Gas Pump #3",
    location: "Store #1 – Pump Island",
    status: "Down"
  }
];
```

## Technicians

```ts
export const technicians: Technician[] = [
  {
    id: "T-001",
    name: "John Martinez",
    email: "john.martinez@example.com",
    phone: "555-201-4499",
    active: true
  },
  {
    id: "T-002",
    name: "Sarah Lee",
    email: "sarah.lee@example.com",
    active: true
  }
];
```

## Inventory

```ts
export const inventory: InventoryItem[] = [
  {
    id: "INV-001",
    name: "HVAC Filter – Type A",
    partNumber: "FILTER-A-2025",
    quantityOnHand: 8,
    reorderThreshold: 3,
    location: "Warehouse Shelf B2"
  },
  {
    id: "INV-014",
    name: "Pump Nozzle",
    partNumber: "PNZ-445",
    quantityOnHand: 2,
    reorderThreshold: 5
  }
];
```

---

# 7. RELATIONSHIPS (MANDATORY)

Cursor MUST enforce these:

### WorkOrder → Asset
- `assetId` MUST match an Asset.id

### WorkOrder → Technician
- `assignedTo` MUST match Technician.id when present

### Inventory  
- Not linked in v1 (v2 will add consumption tracking)

---

# 8. MULTI-STORE / MULTI-TENANT PREPARATION (Phase 6)

To support multiple stores/locations, the data model is being extended with a
`Store` entity and optional `storeId` references on core models. Existing logic
remains single-store for now.

## 8.1 Store Model

```ts
interface Store {
  id: string;        // cuid
  name: string;      // Store name (e.g. "Store #1")
  code?: string;     // Optional short code (e.g. "ST1")
  address?: string;
  city?: string;
  state?: string;
  timezone?: string;
  createdAt: string; // ISO timestamp
}
```

## 8.2 Store Relationships

- `User.storeId?: string | null` → optional store a user is scoped to  
  - Global / master admins will have `storeId = null`.
- `Technician.storeId?: string | null` → store this technician belongs to.
- `Asset.storeId?: string | null` → store that owns the asset.
- `WorkOrder.storeId?: string | null` → store that owns the work order.
- `PreventiveSchedule.storeId?: string | null` → store for the PM schedule.
- `Request.storeId?: string | null` → store that submitted/owns the request.

All of these are optional to remain backwards compatible with existing data and
single-store behavior. Store-scoped filtering will be added in later Phase 6 steps.

## 8.3 Roles (Upcoming Structure)

The `User.role` string field will progressively move toward the following
semantics:

- `"MASTER_ADMIN"` – global across all stores; can see/manage everything.
- `"STORE_ADMIN"` – scoped to a single store via `storeId`.
- `"TECHNICIAN"` – scoped to a single store via `storeId`.

For now, existing `"ADMIN"` / `"TECHNICIAN"` string values continue to work
unchanged; new role values will be phased in alongside store-aware logic.

---

# 9. VALIDATION RULES (Cursor MUST implement in API layer)

## WorkOrder Validation
- title → required  
- assetId → required & must match Asset.id  
- priority → required  
- status → required  
- createdAt → required  
- completedAt:
  - required when status = Completed
  - NOT allowed otherwise  
- assignedTo:
  - MUST match Technician.id or be undefined

## Asset Validation
- name → required  
- location → required  
- status → required  

## Technician Validation
- name → required  
- email → required  
- active → required  

## Inventory Validation
- name → required  
- partNumber → required  
- quantityOnHand → must be >= 0  
- reorderThreshold → must be >= 0  

---

# 9. CURSOR IMPLEMENTATION RULES

Cursor MUST:

1. Use these TypeScript interfaces EXACTLY.
2. Use sample data for all mock API routes.
3. Validate all requests against these structures.
4. Maintain consistent field names across all layers.
5. Apply sorting rules when generating UI tables.
6. Never rename fields without explicit instruction.
7. Treat this document as the **source of truth** for all models.

---

# END OF FILE
