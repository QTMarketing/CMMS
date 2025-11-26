"use client";

import { useEffect, useState } from "react";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Drawer from "../../components/ui/Drawer";
import WorkOrderDetails from "../../components/workorders/WorkOrderDetails";
import CreateWorkOrderForm from "../../components/workorders/CreateWorkOrderForm";
import { Asset } from "../../lib/data/assets";
import { WorkOrder } from "../../lib/data/workOrders";
import EditWorkOrderButton from "./EditWorkOrderButton";
import ViewWorkOrderButton from "./ViewWorkOrderButton";
import DeleteWorkOrderButton from "./DeleteWorkOrderButton";

// --- Type definitions for API objects ---
interface Technician {
  id: string;
  name: string;
  email: string;
  phone?: string;
  active: boolean;
}

const statusOptions = [
  "All",
  "Open",
  "In Progress",
  "Completed",
  "Cancelled",
] as const;
const priorityOptions = ["All", "High", "Medium", "Low"] as const;

const priorityColors: Record<string, string> = {
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-700",
};

const statusColors: Record<string, string> = {
  Open: "bg-orange-50 text-orange-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Completed: "bg-green-50 text-green-700",
  Cancelled: "bg-gray-100 text-gray-600",
};

type DateInput = string | Date | null | undefined;

function formatDate(date: DateInput) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString();
}

export default function WorkOrdersPage() {
  const [status, setStatus] =
    useState<(typeof statusOptions)[number]>("All");
  const [priority, setPriority] =
    useState<(typeof priorityOptions)[number]>("All");
  const [search, setSearch] = useState<string>("");

  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [tableOrders, setTableOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [filter, setFilter] = useState<
    "all" | "open" | "inProgress" | "completed" | "overdue"
  >("all");

  // 🔹 NEW: technician filter
  const [techFilter, setTechFilter] = useState<string>("all");

  // --------- Load data ---------
  useEffect(() => {
    fetch("/api/workorders", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setTableOrders(data.data || []));

    fetch("/api/assets", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) =>
        setAssets(Array.isArray(data) ? data : data.data || [])
      );

    fetch("/api/technicians", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) =>
        setTechnicians(Array.isArray(data) ? data : data.data || [])
      );
  }, []);

  const assetMap = Object.fromEntries(
    assets.map((a) => [a.id, a])
  ) as Record<string, Asset>;
  const techMap = Object.fromEntries(
    technicians.map((t) => [t.id, t.name])
  ) as Record<string, string>;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // --------- Filtering ---------
  const filtered = tableOrders.filter((w) => {
    let match = true;

    // Tab filter
    if (filter === "open") match = w.status === "Open";
    else if (filter === "inProgress") match = w.status === "In Progress";
    else if (filter === "completed") match = w.status === "Completed";
    else if (filter === "overdue") {
      if (!w.dueDate) return false;
      const due = new Date(w.dueDate);
      const dueDay = new Date(
        due.getFullYear(),
        due.getMonth(),
        due.getDate()
      );
      const isCompleted =
        w.status === "Completed" || w.status === "Cancelled";
      match = !isCompleted && dueDay < today;
    }

    // Status dropdown
    if (status !== "All") match = match && w.status === status;

    // Priority dropdown
    if (priority !== "All") match = match && w.priority === priority;

    // 🔹 Technician dropdown
    if (techFilter !== "all") {
      match = match && w.assignedToId === techFilter;
    }

    // Search by title or asset name
    if (search.trim().length > 0) {
      const searchLower = search.toLowerCase();
      const assetName =
        assetMap[w.assetId]?.name?.toLowerCase() || "";
      match =
        match &&
        (w.title.toLowerCase().includes(searchLower) ||
          assetName.includes(searchLower));
    }

    return match;
  });

  // Sort newest first
  filtered.sort((a, b) => {
    const ad = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const bd = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return bd.getTime() - ad.getTime();
  });

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      {/* Top Bar: Button right */}
      <div className="flex flex-row items-center mb-2">
        <div className="flex-1" />
        <button
          className="bg-blue-600 text-white font-semibold px-6 py-2 rounded hover:bg-blue-700"
          onClick={() => setShowCreate(true)}
        >
          New Work Order
        </button>
      </div>

      {/* Filters row (Status, Priority, Technician, Search) */}
      <div className="flex flex-wrap gap-4 items-center text-sm">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-600">Status:</span>
          <select
            className="border rounded px-2 py-1"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as (typeof statusOptions)[number])
            }
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-600">Priority:</span>
          <select
            className="border rounded px-2 py-1"
            value={priority}
            onChange={(e) =>
              setPriority(
                e.target.value as (typeof priorityOptions)[number]
              )
            }
          >
            {priorityOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* 🔹 Technician filter */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-600">Technician:</span>
          <select
            className="border rounded px-2 py-1"
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
          >
            <option value="all">All</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px] flex justify-end">
          <input
            type="text"
            placeholder="Search title or asset..."
            className="w-full max-w-xs border rounded px-3 py-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Table
        headers={[
          "ID",
          "Title",
          "Asset",
          "Priority",
          "Status",
          "Assigned To",
          "Due Date",
          "Actions",
        ]}
      >
        {filtered.length === 0 ? (
          <tr>
            <td
              colSpan={8}
              className="py-6 text-center text-gray-400"
            >
              No work orders found.
            </td>
          </tr>
        ) : (
          filtered.map((w) => (
            <tr
              key={w.id}
              className="hover:bg-gray-50 cursor-pointer transition"
              onClick={() => setSelected(w)}
            >
              <td className="px-4 py-2 font-mono">{w.id}</td>
              <td className="px-4 py-2 whitespace-nowrap">
                {w.title}
              </td>
              <td className="px-4 py-2">
                {assetMap[w.assetId]?.name || w.assetId}
              </td>
              <td className="px-4 py-2">
                <Badge colorClass={priorityColors[w.priority]}>
                  {w.priority}
                </Badge>
              </td>
              <td className="px-4 py-2">
                <Badge colorClass={statusColors[w.status]}>
                  {w.status}
                </Badge>
              </td>
              <td className="px-4 py-2">
                {w.assignedToId
                  ? techMap[w.assignedToId] || w.assignedToId
                  : "—"}
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                {formatDate(w.dueDate)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <ViewWorkOrderButton id={w.id} />
                  <EditWorkOrderButton id={w.id} />
                  <DeleteWorkOrderButton id={w.id} />
                </div>
              </td>
            </tr>
          ))
        )}
      </Table>

      {/* Drawer for row details */}
      <Drawer open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <WorkOrderDetails
            workOrder={selected}
            asset={assetMap[selected.assetId]}
            technicianMap={techMap}
          />
        )}
      </Drawer>

      {/* Drawer for create form */}
      <Drawer open={showCreate} onClose={() => setShowCreate(false)}>
        <CreateWorkOrderForm
          onSuccess={(newWorkOrder) => {
            // Close the drawer
            setShowCreate(false);
            // Refresh table data after successful creation
            fetch("/api/workorders", { cache: "no-store" })
              .then((res) => res.json())
              .then((data) => setTableOrders(data.data || []));
          }}
          onCancel={() => setShowCreate(false)}
        />
      </Drawer>
    </div>
  );
}
