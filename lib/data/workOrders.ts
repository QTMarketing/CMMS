export type WorkOrder = {
  id: string;
  title: string;
  description?: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Completed" | "Cancelled";
  createdAt: Date;
  dueDate?: Date;
  completedAt?: Date | null;
  assetId: string;
  assignedToId?: string | null;
};

export const workOrders: WorkOrder[] = [
  {
    id: "wo-1",
    title: "Investigate HVAC noise",
    description: "Customer reported loud rattling noise.",
    priority: "High",
    status: "Open",
    createdAt: new Date("2025-11-20T10:00:00Z"),
    dueDate: new Date("2025-11-25T23:59:59Z"),
    completedAt: null,
    assetId: "asset-hvac-1",
    assignedToId: "tech-david",
  },
  {
    id: "wo-2",
    title: "Pump #3 slow flow",
    description: "Flow rate on Pump #3 is much lower.",
    priority: "Medium",
    status: "In Progress",
    createdAt: new Date("2025-11-22T09:30:00Z"),
    dueDate: new Date("2025-11-28T23:59:59Z"),
    completedAt: null,
    assetId: "asset-pump-3",
    assignedToId: "tech-priya",
  },
];
