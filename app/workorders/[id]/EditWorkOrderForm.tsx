"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type WorkOrderStatus = "Open" | "In Progress" | "Completed" | "Cancelled";
type WorkOrderPriority = "Low" | "Medium" | "High";

interface Technician {
  id: string;
  name: string;
}

interface Note {
  id?: string;
  text: string;
  author?: string | null;
  timestamp?: string;
}

interface WorkOrder {
  id: string;
  title: string;
  status: "Open" | "In Progress" | "Completed" | "Cancelled";
  priority: "Low" | "Medium" | "High";
  description?: string | null;
  dueDate?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  asset?: { name: string } | null;
  assignedTo?: { id: string; name: string } | null;
  notes?: Note[];
}

interface Props {
  workOrder: WorkOrder;
}

export default function EditWorkOrderForm({ workOrder }: Props) {
  const router = useRouter();

  // ------- Local editable state -------
  const [status, setStatus] = useState<WorkOrderStatus>(workOrder.status);
  const [priority, setPriority] = useState<WorkOrderPriority>(
    workOrder.priority
  );
  const [dueDate, setDueDate] = useState<string>(
    workOrder.dueDate
      ? new Date(workOrder.dueDate).toISOString().slice(0, 10)
      : ""
  );
  const [assignedToId, setAssignedToId] = useState<string | null>(
    workOrder.assignedTo?.id ?? null
  );
  const [description, setDescription] = useState<string>(
    workOrder.description ?? ""
  );
  const [noteText, setNoteText] = useState("");

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null);

  // ------- Load technicians for dropdown -------
  useEffect(() => {
    fetch("/api/technicians")
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to fetch technicians:", res.status);
          return [];
        }
        return res.json();
      })
      .then((data: Technician[]) =>
        // Exclude inactive technicians from assignment dropdowns
        setTechnicians(
          Array.isArray(data)
            ? data.filter((t: any) => (t as any).active !== false)
            : []
        )
      )
      .catch((err) => {
        console.error("Failed to load technicians:", err);
        setTechnicians([]);
      });
  }, []);

  // ------- Update main work order (status, priority, assignedTo, description) -------
  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/workorders/${workOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority,
          assignedTo: assignedToId ?? "",
          dueDate: dueDate || null,
          description,
        }),
      });

      if (!res.ok) {
        try {
          const data = await res.json();
          console.error("Failed to update work order:", data);
        } catch {
          console.error("Failed to update work order: non-OK response");
        }
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Network error while updating work order:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // ------- Add a note (optional) -------
  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setIsAddingNote(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderId: workOrder.id,
          text: noteText.trim(),
        }),
      });

      if (!res.ok) {
        try {
          const data = await res.json();
          console.error("Failed to add note:", data);
        } catch {
          console.error("Failed to add note: non-OK response");
        }
      } else {
        setNoteText("");
        router.refresh();
      }
    } catch (err) {
      console.error("Network error while adding note:", err);
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) {
        console.error("Failed to delete note:", await res.json().catch(() => null));
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Network error while deleting note:", err);
    } finally {
      setNoteToDeleteId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{workOrder.title}</h1>
          <p className="text-sm text-gray-500">
            Work Order ID: {workOrder.id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Status
            </label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as WorkOrderStatus)}
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Priority
            </label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as WorkOrderPriority)
              }
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Due Date
            </label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2 text-sm"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Assigned To
            </label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={assignedToId ?? ""}
              onChange={(e) => setAssignedToId(e.target.value || null)}
            >
              <option value="">— Not assigned —</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Not assigned</p>
          </div>

          {/* Created / Due / Completed */}
          <div className="space-y-1 text-sm text-gray-700">
            <div>
              <span className="font-medium text-gray-600">Created:</span>{" "}
              {workOrder.createdAt ? new Date(workOrder.createdAt).toLocaleString() : "—"}
            </div>
            {workOrder.dueDate && (
              <div>
                <span className="font-medium text-gray-600">Due Date:</span>{" "}
                {new Date(workOrder.dueDate).toLocaleDateString()}
              </div>
            )}
            <div>
              <span className="font-medium text-gray-600">Completed At:</span>{" "}
              {workOrder.completedAt
                ? new Date(workOrder.completedAt).toLocaleString()
                : "—"}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Description
          </label>
          <textarea
            className="flex-1 border rounded px-3 py-2 text-sm"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleUpdate}
              disabled={isSaving}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 text-sm font-semibold disabled:opacity-60"
            >
              {isSaving ? "Updating..." : "Update"}
            </button>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Notes</h2>
        <div className="flex flex-col gap-3 mb-3">
          {workOrder.notes && workOrder.notes.length > 0 ? (
            [...workOrder.notes]
              .sort((a, b) => {
                const tsA = typeof a.timestamp === 'string' && a.timestamp ? a.timestamp : '';
                const tsB = typeof b.timestamp === 'string' && b.timestamp ? b.timestamp : '';
                return new Date(tsA).getTime() - new Date(tsB).getTime();
              })
              .map((note, idx) => {
                const ts = typeof note.timestamp === 'string' && note.timestamp ? note.timestamp : '';
                return (
                  <div
                    key={note.id ?? idx}
                    className="bg-gray-50 border rounded px-3 py-2 text-xs sm:text-sm"
                  >
                    <div className="mb-1 text-xs text-gray-400 flex justify-between items-center">
                      <span>{note.author || "System"}</span>
                      <span className="flex items-center gap-2">
                        {ts ? new Date(ts).toLocaleString() : ""}
                        {note.id && (
                          <button
                            type="button"
                            onClick={() => setNoteToDeleteId(note.id ?? null)}
                            className="text-red-500 hover:text-red-700"
                            aria-label="Delete Note"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    </div>
                    <div>{note.text}</div>
                  </div>
                );
              })
          ) : (
            <div className="text-gray-300 text-xs">No notes yet.</div>
          )}
        </div>
        <textarea
          className="w-full border rounded px-3 py-2 text-sm mb-2"
          rows={3}
          placeholder="Add a note..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        <button
          type="button"
          onClick={handleAddNote}
          disabled={isAddingNote}
          className="bg-orange-300 text-white px-4 py-2 rounded hover:bg-orange-400 text-sm font-semibold disabled:opacity-60"
        >
          {isAddingNote ? "Adding..." : "Add Note"}
        </button>
      </div>

      {/* Asset summary (optional) */}
      {workOrder.asset && (
        <div className="mt-6 text-sm text-gray-700">
          <h3 className="text-sm font-semibold text-gray-600 mb-1">ASSET</h3>
          <div>Asset Name: {workOrder.asset.name}</div>
        </div>
      )}

      {noteToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg px-6 py-4 w-full max-w-sm">
            <h3 className="text-sm font-semibold mb-2">Delete this note?</h3>
            <p className="text-xs text-gray-600 mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoteToDeleteId(null)}
                className="px-3 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteNote(noteToDeleteId!)}
                className="px-3 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
