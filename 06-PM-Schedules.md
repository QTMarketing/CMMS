# 06 – Preventive Maintenance Schedules (PM)
## Version: v1.0

This document defines the data model, API routes, and UI behavior for basic preventive maintenance schedules.

---

## 1. Data Model: PreventiveSchedule

```ts
interface PreventiveSchedule {
  id: string;              // e.g. "PM-001"
  title: string;           // e.g. "Inspect Gas Pump #3"
  assetId: string;         // must match Asset.id
  frequencyDays: number;   // e.g. 30
  nextDueDate: string;     // ISO date string
  active: boolean;         // true = schedule running
}
