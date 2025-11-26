# Work Orders Module Specification

## Overview
Work Orders (WOs) represent actionable maintenance or operational tasks. They can be created manually by managers or automatically via Preventive Maintenance schedules.

## Required Fields (Prisma WorkOrder model)
- id: String @id
- title: String
- description: String?
- priority: "Low" | "Medium" | "High"
- status: "Open" | "In Progress" | "Completed" | "Cancelled"
- createdAt: DateTime
- dueDate: DateTime?
- completedAt: DateTime?
- assetId: String
- assignedToId: String?

## Status Flow
- Open → In Progress
- In Progress → Completed (sets completedAt)
- Completed → Open (reopens WO, clears completedAt)
- Any → Cancelled

## Dashboard Behavior
- Overdue = dueDate < today AND status != Completed/Cancelled
- Completed Today = completedAt is today (date-only)
- Open = status="Open"
- In Progress = status="In Progress"

## Work Orders Page Requirements
- List all WOs with: id, title, asset, priority badge, status badge, due date
- Status control (Start / Complete / Reopen)
- Overdue filter using the overdue logic above
- Integration with Prisma (no mock data)
