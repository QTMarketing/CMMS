# Dashboard Analytics Specification

## KPIs

### 1. Open Work Orders
Count of WOs where status="Open".

### 2. In Progress
Count of WOs where status="In Progress".

### 3. Completed Today
- status="Completed"
- completedAt NOT null
- completedAt date-only equals today's date

### 4. Overdue
A WO is overdue when:
- dueDate exists
- dueDate date-only < today date-only
- status != "Completed" AND status != "Cancelled"

## Trend Chart Logic (Last 14 Days)
For each day D in the last 14 days:
- createdCount = number of WOs where createdAt date-only == D
- completedCount = number of WOs where completedAt date-only == D

## Recent Work Orders
- Sorted by createdAt DESC
- Top 5 items
