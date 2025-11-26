# 05 – Roadmap & TODO

## Phase 1 – View-Only Core (DONE)
- [x] Work Orders: filters, search, details drawer
- [x] Assets: status highlight, Next Due (days), details + WO history
- [x] Inventory: low stock highlight, LOW badge

## Phase 1.5 – UI / Theme / Responsive (PENDING)
- [ ] Finish orange/white theme across all pages:
  - [ ] Sidebar + navbar final colors
  - [ ] KPI card visual polish
  - [ ] Button styles
  - [ ] Chart color = orange
- [ ] Mobile responsiveness:
  - [ ] Sidebar collapses on small screens
  - [ ] Tables scroll nicely on mobile
  - [ ] KPI cards stack on small screens
- [ ] Optional Dribbble polish:
  - [ ] Spacing, typography
  - [ ] Icons, micro-interactions

## Phase 2 – Work Order Actions (NEXT)
- [ ] Add “New Work Order” modal
- [ ] Allow status changes (Open → In Progress → Completed)
- [ ] Allow technician reassignment
- [ ] Add description/notes field

## Phase 3 – Preventive Maintenance (LATER)
- [ ] Schedules page
- [ ] Recurring tasks → auto-create WOs

## Phase 4 – Persistence & Auth (DB + Login)
- [ ] Postgres + Prisma
- [ ] Login + roles (Admin/Manager/Tech)
- [ ] Add Prisma + SQLite/Postgres
- [ ] Move WorkOrder/Asset/Technician/Inventory to DB
- [ ] Update API routes to use DB
- [ ] Add seed data
- [ ] (Optional) Add login + roles
