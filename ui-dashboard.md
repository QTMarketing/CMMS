# 04 – UI & Dashboard Specification  
## CMMS Dashboard – Layout, Components & Interaction Rules  
## Version: v1.0 (Fully Detailed)

This document defines **all user interface requirements, layout structures, visual states, component behaviors, and rendering rules** for the CMMS dashboard.

Cursor MUST follow this document EXACTLY when generating React components, Tailwind styling, layouts, and UI logic.

---

# 1. GENERAL UI GUIDELINES

Cursor MUST follow these UI design rules:

### ✔ Framework Requirements
- Use **Next.js 15 (App Router)**  
- Use **TypeScript**  
- Use **Tailwind CSS**  
- Use **functional components** only  
- Use **server components** for layouts when appropriate  
- Use **client components** for interactive widgets (tables, charts)

### ✔ Styling Requirements
- Use Tailwind utility classes only  
- No external CSS files  
- No inline styles unless required  
- Keep spacing consistent (`p-6`, `py-4`, `px-6`, `gap-6`)

### ✔ Components Folder Structure
```
/components
  /layout
  /dashboard
  /ui
```

### ✔ Layout Rules
- Sidebar is fixed on the left
- Top navbar is fixed on top of content area
- Content uses padding (`p-6`)
- Everything must be clean, minimal, enterprise-style

---

# 2. APPLICATION LAYOUT (REQUIRED)

Cursor MUST implement a global layout at:

```
/app/layout.tsx
```

### Layout Must Include:
1. **Left Sidebar (Navigation)**
2. **Top Navigation Bar**
3. **Main Content Area**

## 2.1 Sidebar Requirements

### Sidebar Location
- Fixed on left side  
- Width: `w-64`  
- Background: `bg-gray-900`  
- Text: `text-white`

### Sidebar Items
Cursor MUST include EXACT items in this order:

1. Dashboard  
2. Work Orders  
3. Assets  
4. Inventory  

Each must use a **link** to:

- `/`
- `/workorders`
- `/assets`
- `/inventory`

### Sidebar Interaction Rules
- Highlight the current page  
- Use hover states (`hover:bg-gray-800`)  
- Use icons only if Cursor can choose standard React icons

---

## 2.2 Top Navbar Requirements

Navbar must include:

- Page title (dynamic)
- Optional placeholder for user avatar/name on right
- Background: `bg-white shadow`
- Height: `h-16`
- Padding: `px-6`

---

# 3. DASHBOARD PAGE (REQUIRED)

Dashboard Route:
```
/app/page.tsx
```

Dashboard MUST include:

## 3.1 Top KPI Cards (4 Cards)

### Cards MUST include:

1. **Open Work Orders**
2. **In Progress**
3. **Completed Today**
4. **Overdue**

### Card Structure
- Title (small text)
- Large number (bold, xl)
- Icon (optional)
- Background: `bg-white`
- Rounded: `rounded-xl`
- Padding: `p-6`
- Shadow: `shadow-sm`

### KPI Logic
Cursor MUST compute:

- **Open** → status = "Open"
- **In Progress** → status = "In Progress"
- **Completed Today** → status = "Completed" AND completedAt = today
- **Overdue** → dueDate < now AND status != "Completed" AND status != "Cancelled"

---

## 3.2 Trend Chart (7-Day Work Order Trend)

### Chart Requirements
Cursor MUST generate:

- A simple line or bar chart  
- Using static dummy data  
- Or using lightweight chart library (Recharts preferred if auto-selected)

Data Structure:
```ts
{ date: string; count: number }
```

### Rules
- Show last 7 days  
- Smooth, minimal styling  
- Goes in a white card container (`rounded-xl bg-white p-6 shadow`)

---

## 3.3 Recent Work Orders Table

### Table Columns
Cursor MUST include:

| Column         | Data Source            |
|----------------|------------------------|
| ID             | workOrder.id           |
| Title          | workOrder.title        |
| Asset          | asset.name             |
| Priority       | workOrder.priority     |
| Status         | workOrder.status       |
| Due Date       | workOrder.dueDate      |

### Rules
- MUST join Asset name using assetId → Asset.id
- MUST show last 5–10 work orders
- MUST sort by `createdAt` DESC
- MUST color-code:
  - Priority:  
    - High → red  
    - Medium → yellow  
    - Low → green  
  - Status:  
    - Open → blue  
    - In Progress → yellow  
    - Completed → green  
    - Cancelled → gray

### Table Container Styling
- `bg-white`
- `rounded-xl`
- `p-6`
- `shadow-sm`

---

# 4. WORK ORDERS PAGE

Route:
```
/workorders/page.tsx
```

Cursor MUST implement:

### 4.1 Page Title
```
Work Orders
```

### 4.2 Button
A **New Work Order** button (no form needed in v1)

### 4.3 Full Table (same columns as Dashboard but full dataset)

### 4.4 Sorting Rules
- Default sort: `createdAt` DESC
- Must be stable sorting

### 4.5 Badge Styling (MANDATORY)
Cursor MUST use Tailwind badge styles:

#### Priority Badges
- High → `bg-red-100 text-red-600`
- Medium → `bg-yellow-100 text-yellow-600`
- Low → `bg-green-100 text-green-600`

#### Status Badges
- Open → `bg-blue-100 text-blue-600`
- In Progress → `bg-yellow-100 text-yellow-600`
- Completed → `bg-green-100 text-green-600`
- Cancelled → `bg-gray-200 text-gray-600`

---

# 5. ASSETS PAGE

Route:
```
/assets/page.tsx
```

### Required Table Columns
| Column | Source |
|--------|--------|
| Asset ID | id |
| Name | name |
| Location | location |
| Status | status |
| Last Maint. | lastMaintenanceDate |
| Next Maint. | nextMaintenanceDate |

Sorting:
- Default → sort by name ASC

---

# 6. INVENTORY PAGE

Route:
```
/inventory/page.tsx
```

### Required Table Columns
| Column | Source |
|--------|--------|
| ID | id |
| Name | name |
| Part # | partNumber |
| Qty | quantityOnHand |
| Threshold | reorderThreshold |
| Location | location |

### LOW STOCK RULE
Cursor MUST add `LOW` badge when:
```
quantityOnHand <= reorderThreshold
```

Badge styling:
```
bg-red-100 text-red-600
```

---

# 7. COMPONENT REQUIREMENTS

Cursor MUST break UI into reusable components:

## 7.1 KPI Card Component
Path:
```
/components/dashboard/KpiCard.tsx
```

Props:
```ts
{
  title: string;
  value: number;
}
```

## 7.2 Table Component
Path:
```
/components/ui/Table.tsx
```

Reusable table with:
- header row  
- rows  
- cells  
- consistent padding + spacing  

## 7.3 Badge Component
Path:
```
/components/ui/Badge.tsx
```

Used for priority + status labels.

---

# 8. UI STATES (MANDATORY)

Cursor MUST implement:

### Loading State
- Skeleton components  
OR  
- Simple text: `"Loading..."`

### Empty State
- Friendly message:
```
No data available.
```

### Error State
- Display:
```
Something went wrong. Please try again.
```

---

# 9. CURSOR IMPLEMENTATION RULES

Cursor MUST:

1. Use TypeScript + Tailwind.  
2. Use modular components for cards, tables, badges, charts.  
3. NEVER change field names or types from DataModel.md.  
4. Treat this file as the **source of truth** for UI generation.  
5. Always join WorkOrder.assetId → Asset.id to display asset names.  
6. Use consistent spacing (`p-6`, `gap-6`).  
7. Use rounded-xl + shadow-sm for all cards and containers.  
8. Ensure pages are responsive (desktop-first).  
9. Keep UI minimal, clean, and professional.  
10. Sort and filter data exactly as defined above.  

---

# END OF FILE
