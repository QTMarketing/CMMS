import { useState, useEffect } from "react";

interface Props {
  onSuccess: (newWorkOrder: any) => void;
  onCancel: () => void;
}

const priorities = ["Low", "Medium", "High"];

export default function CreateWorkOrderForm({ onSuccess, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [assetId, setAssetId] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/assets", { cache: "no-store" })
      .then(res => res.json())
      .then(data => setAssets(Array.isArray(data) ? data : data.data || []));
    fetch("/api/technicians", { cache: "no-store" })
      .then(res => res.json())
      .then(data => setTechnicians(Array.isArray(data) ? data : data.data || []));
  }, []);

  function validate() {
    if (!title.trim()) return "Title is required.";
    if (!assetId) return "Asset is required.";
    if (!priority) return "Priority is required.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          assetId,
          priority,
          assignedTo: assignedTo || undefined,
          dueDate: dueDate || undefined,
          description: description || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to create work order.");
        setLoading(false);
        return;
      }
      onSuccess(data.data);
    } catch (e) {
      setError("Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="text-xl font-bold mb-1">New Work Order</div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div>
        <label className="block text-sm font-medium mb-1">Title <span className="text-red-500">*</span></label>
        <input className="w-full border rounded px-3 py-1" value={title} onChange={e => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Asset <span className="text-red-500">*</span></label>
        <select className="w-full border rounded px-3 py-1" value={assetId} onChange={e => setAssetId(e.target.value)} required>
          <option value="">Select asset…</option>
          {assets.map(a => (<option key={a.id} value={a.id}>{a.name}</option>))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Priority <span className="text-red-500">*</span></label>
        <select className="w-full border rounded px-3 py-1" value={priority} onChange={e => setPriority(e.target.value)}>
          {priorities.map(p => (<option key={p}>{p}</option>))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Assigned To</label>
        <select className="w-full border rounded px-3 py-1" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
          <option value="">Unassigned</option>
          {technicians.filter(t => t.active).map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Due Date</label>
        <input type="date" className="w-full border rounded px-3 py-1" value={dueDate} onChange={e => setDueDate(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea className="w-full border rounded px-3 py-1" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="flex gap-3 mt-4">
        <button type="submit" className="bg-blue-600 text-white font-semibold px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-60" disabled={loading}>
          {loading ? "Creating…" : "Create Work Order"}
        </button>
        <button type="button" className="px-5 py-2 rounded border ml-2" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
      </div>
    </form>
  );
}
