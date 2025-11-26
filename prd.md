# 01 – Product Requirements Document (PRD)
## Project: CMMS Dashboard for Retail Operations
## Version: v1.0

---

## 1. Overview

### 1.1 Product Summary  
This project is a **Computerized Maintenance Management System (CMMS)** dashboard for a **retail / gas station / convenience store** environment.  

The system helps managers and technicians:

- Track **assets** (pumps, coolers, HVAC, POS terminals, etc.)
- Manage **work orders** (repairs, inspections, preventive tasks)
- Monitor **inventory of spare parts**
- See **high-level KPIs** on equipment health and maintenance performance

The application is **web-based** and built with **Next.js + React + TypeScript + Tailwind**, with **Next.js API routes** as the backend. Data will start as **in-memory/dummy data** in v1, with a clear path to plug in a real database later.

---

## 2. Goals & Non-Goals

### 2.1 Primary Goals (v1)

1. Provide a **single dashboard** showing:
   - Number of **open**, **in-progress**, **completed today**, and **overdue** work orders.
   - A **simple trend chart** of work orders over the last 7 days.
   - A **recent work orders table**.

2. Allow users to **view lists** of:
   - Work orders  
   - Assets  
   - Inventory items  
   - Technicians (for assignment / display only)

3. Support **basic work order lifecycle:**
   - Created → Open  
   - Assigned / started → In Progress  
   - Completed → Completed  

4. Use a **clean, modern UI**:
   - Sidebar navigation  
   - Top navbar  
   - Responsive layout (desktop first, tablet-friendly)

5. Be built in a way that is **AI-friendly**:
   - Clear data models  
   - Clear API contracts  
   - Modular components  

### 2.2 Non-Goals (not in v1)

- Authentication / multi-tenant account system
- Complex role-based permissions (Admin vs Tech vs Viewer) – v1 assumes a single “logged-in” user
- Mobile app (native iOS/Android) – only responsive web
- Real-time live updates (no WebSockets yet)
- Notifications (email/SMS/push)
- Integrations with external systems (e.g., ERP, BMS, vendor APIs)

---

## 3. Users & Roles

> v1 can assume a single user, but we design with roles in mind.

### 3.1 Admin / Maintenance Manager
- Owns the system.
- Reviews dashboard KPIs.
- Sees all work orders and asset states.
- Eventually (future) will create/assign work orders, adjust schedules.

### 3.2 Technician
- Looks at **assigned work orders**.
- Updates status (Open → In Progress → Completed).
- Adds completion notes (future).

### 3.3 Viewer (Optional / Future)
- Read-only access to dashboard & lists.

For v1, **UI behavior** assumes **Admin/Manager using the system** on a desktop.

---

## 4. Core Use Cases & User Stories

### 4.1 Dashboard Monitoring

**US-01 – See Maintenance Status at a Glance**  
As a **maintenance manager**, I want to see **counts of open, in-progress, completed today, and overdue work orders** so that I can understand the current maintenance load and risk.

**Acceptance:**
- Dashboard shows four KPI cards with clear labels and counts.
- Counts are derived from existing work orders.
- Overdue means `dueDate < now` and `status` is not `Completed` or `Cancelled`.

---

### 4.2 Work Orders

**US-02 – View All Work Orders**  
As a **manager**, I want a table of all work orders so that I can scan and manage maintenance tasks.

**Acceptance:**
- A “Work Orders” page accessible from sidebar.
- Table with: ID, Title, Asset, Priority, Status, Assigned To, Due Date.
- Reasonable formatting (dates readable, priority/status shown with visual badges).

**US-03 – View Only Recent Work Orders on Dashboard**  
As a **manager**, I want to see only the most recent work orders on the dashboard so that the main page is not cluttered.

**Acceptance:**
- Recent work orders table on Dashboard shows only the last N items (e.g., 5–10).
- Sorted by `createdAt` descending.

*(Creation/editing of work orders can be mocked or limited in v1 – e.g., button with no full form yet.)*

---

### 4.3 Assets

**US-04 – View Assets and Their Status**  
As a **manager**, I want a list of assets (e.g., pumps, fridges, HVAC units) with their status so that I can see which equipment is down or due for maintenance.

**Acceptance:**
- “Assets” page accessible from sidebar.
- Table with: Asset ID, Name, Location, Status, Last Maintenance Date, Next Maintenance Date.
- Status displayed clearly: Active / Down / Retired.

---

### 4.4 Inventory

**US-05 – View Inventory of Spare Parts**  
As a **manager**, I want to see the inventory of spare parts so that I know if we can complete upcoming work orders without delays.

**Acceptance:**
- “Inventory” page accessible from sidebar.
- Table with: Name, Part Number, Quantity on hand, Reorder threshold, Location (optional).
- Items with `quantityOnHand <= reorderThreshold` can be visually highlighted (later enhancement).

---

### 4.5 Technicians

**US-06 – View Technicians List (for assignment UIs)**  
As a **manager**, I want a list of technicians so that I can assign work orders (v2) or at least display assignment labels in tables.

**Acceptance:**
- Technicians data structure exists.
- Used in “Assigned To” columns where relevant.
- Simple GET API for technicians.

---

## 5. Functional Requirements (v1)

### 5.1 Dashboard Page

- **URL**: `/` (root)
- **Sections**:
  1. **KPI Cards** row
     - Open Work Orders (count)
     - In Progress (count)
     - Completed Today (count)
     - Overdue (count)
  2. **Trend Chart**
     - Work orders created per day (last 7 days)
     - Can use dummy static data in v1
  3. **Recent Work Orders Table**
     - Columns: ID, Title, Asset name, Priority, Status, Due Date
     - Shows last 5–10 work orders

- **States**:
  - Loading: skeleton / “Loading…” text
  - Error: “Unable to load dashboard data.”
  - Empty: Show friendly text (“No work orders yet.”) when no data.

---

### 5.2 Work Orders Page

- **URL**: `/workorders`
- **Components**:
  - Page title: “Work Orders”
  - Optional "New Work Order" button (can be placeholder in v1)
  - Table with:
    - ID
    - Title
    - Asset (name derived from assetId)
    - Priority (Low, Medium, High) with colored badges
    - Status (Open, In Progress, Completed, Cancelled) with colored badges
    - Assigned To (technician name or `—`)
    - Due Date

- **Behavior**:
  - By default, fetches all work orders from `/api/workorders`.
  - Sorted by `createdAt` descending.
  - v1 does not require full filtering/search, but table structure should allow it easily later.

---

### 5.3 Assets Page

- **URL**: `/assets`
- **Components**:
  - Title: “Assets”
  - Table:
    - Asset ID
    - Name
    - Location (e.g., “Store #1 – Pump 3”)
    - Status (Active/Down/Retired)
    - Last Maintenance Date
    - Next Maintenance Date

- **Behavior**:
  - Data fetched from `/api/assets`.
  - Basic loading/error states.

---

### 5.4 Inventory Page

- **URL**: `/inventory`
- **Components**:
  - Title: “Inventory”
  - Table:
    - Name
    - Part Number
    - Quantity on hand
    - Reorder threshold
    - Location (optional)

- **Behavior**:
  - Data fetched from `/api/inventory`.
  - In future, highlight low-stock items visually.

---

### 5.5 Layout & Navigation

- **Main layout** shared across all pages:
  - **Sidebar** (left):
    - Logo / App Name at top (“CMMS Dashboard” – can be changed to brand later)
    - Nav items:
      - Dashboard
      - Work Orders
      - Assets
      - Inventory
  - **Top Navbar**:
    - Page title / breadcrumbs (optional)
    - Placeholder user avatar/name on the right
  - **Content Area**:
    - Scrollable main content with padding.

- Should be **responsive**:
  - Desktop first.
  - On smaller screens, sidebar can collapse / become a top menu (basic version is fine).

---

## 6. Data & API Requirements (High Level)

> Detailed types and routes will live in `02-DataModel.md` and `03-API-Routes.md`. This PRD just defines the expectations.

### 6.1 Core Entities (simplified here)

- **WorkOrder**
  - `id`, `title`, `description`, `assetId`, `priority`, `status`, `assignedTo`, `createdAt`, `dueDate`, `completedAt`

- **Asset**
  - `id`, `name`, `location`, `status`, `lastMaintenanceDate`, `nextMaintenanceDate`

- **Technician**
  - `id`, `name`, `email`, `phone`, `active`

- **InventoryItem**
  - `id`, `name`, `partNumber`, `quantityOnHand`, `reorderThreshold`, `location`

### 6.2 API Expectations (v1)

- `/api/workorders` – GET (list)
- `/api/assets` – GET (list)
- `/api/inventory` – GET (list)
- `/api/technicians` – GET (list)

For v1, **all APIs can be served from in-memory arrays**. The important part is:
- Consistent data shape.
- Same contract will be used later when connected to a real DB.

---

## 7. Non-Functional Requirements

### 7.1 Performance
- v1 only needs to support **small data sets** (e.g., < 1,000 work orders, assets, etc.).
- Free-page load time: **< 2–3 seconds** on local/dev.

### 7.2 Reliability
- In-memory data means state resets when server restarts (acceptable for v1).
- Error handling must be explicit:
  - Show messages instead of silent failures.

### 7.3 Security
- No real auth / multi-tenant in v1.
- Later, will add:
  - Auth
  - Input validation/sanitization
  - Rate limiting (if exposed publicly)

### 7.4 UX & Design
- Clean, modern look using **Tailwind CSS**.
- Consistent spacing, typography, and card styles.
- Dark mode is not required for v1 (nice-to-have later).

---

## 8. Tech Stack & Implementation Guidelines

### 8.1 Frontend

- **Framework:** Next.js (App Router)  
- **Language:** TypeScript  
- **UI:** React components + Tailwind  
- Optional: shadcn/ui for cards, tables, buttons (if used, keep config consistent).

### 8.2 Backend

- **Next.js API Routes** under `/app/api/...` or `/pages/api/...` (depending on chosen routing mode).
- Data layer for v1:
  - In-memory arrays defined in a single module (e.g., `lib/data.ts`).
  - API routes import from this module.

### 8.3 AI Usage Guidelines (for CursorAI)

When using AI (Cursor) to generate code:

- Always remind it to:
  - Respect **data models** in `02-DataModel.md`.
  - Respect **API contracts** in `03-API-Routes.md`.
  - Match **UI behavior** in `04-UI-Dashboard.md`.

- Prefer:
  - Functional React components
  - Strong TypeScript typing
  - Separation of concerns:
    - Layout components
    - Page components
    - Reusable table/card components

---

## 9. Acceptance Criteria (v1 Complete Definition)

The v1 CMMS dashboard is considered **DONE** when:

1. **Dashboard page**:
   - Shows correct counts for work orders by status (Open, In Progress, Completed Today, Overdue).
   - Shows a simple trend chart (static or derived from data).
   - Shows a recent work orders table.

2. **Work Orders page**:
   - Accessible from sidebar.
   - Fetches / displays all work orders in a table.
   - Includes columns: ID, Title, Asset, Priority, Status, Assigned To, Due Date.
   - Handles loading and error states.

3. **Assets page**:
   - Accessible from sidebar.
   - Fetches / displays all assets in a table with defined columns.
   - Handles loading and error states.

4. **Inventory page**:
   - Accessible from sidebar.
   - Fetches / displays all inventory items in a table.
   - Handles loading and error states.

5. **Layout**:
   - Shared layout with sidebar + top navbar.
   - Navigation works correctly between main pages.
   - Reasonably responsive.

6. **Code Quality**:
   - Uses TypeScript types/interfaces that match `02-DataModel.md`.
   - API routes match definitions in `03-API-Routes.md`.
   - Project builds and runs locally without TypeScript errors.

---

## 10. Future Roadmap (Beyond v1)

- Add work order creation/edit flows.
- Attach images/files to work orders.
- Add basic authentication and user management.
- Integrate with real database (Postgres / Prisma).
- Implement preventive maintenance scheduling module.
- Add per-store / per-location filtering and views.
- Add analytics and export/reporting tools.
