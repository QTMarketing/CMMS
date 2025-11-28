"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import AdminOnly from "@/components/auth/AdminOnly";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
type DateInput = Date | string | null | undefined;

function getScheduleMeta(nextDueDate: DateInput) {
  if (!nextDueDate) {
    return { daysUntilDue: null as number | null, status: "Unknown" as string };
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = typeof nextDueDate === "string" ? new Date(nextDueDate) : nextDueDate;
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.ceil((dueMidnight.getTime() - today.getTime()) / MS_PER_DAY);
  let status: string;
  if (diffDays < 0) status = "Overdue";
  else if (diffDays === 0) status = "Due Today";
  else status = "Upcoming";
  return { daysUntilDue: diffDays, status };
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const { data: session, status } = useSession();
  const isSessionLoading = status === "loading";
  const rawRole = (session?.user as any)?.role;
  const role = !isSessionLoading ? rawRole : undefined;
  const technicianId = !isSessionLoading
    ? (((session?.user as any)?.technicianId ?? null) as string | null)
    : null;
  const isAdmin = role === "ADMIN";

  async function fetchSchedules() {
    setLoading(true);
    try {
      const res = await fetch("/api/schedules", { cache: "no-store" });
      const { data } = await res.json();
      setSchedules(data || []);
    } catch {
      setError("Unable to load schedules");
    }
    setLoading(false);
  }
  useEffect(() => { fetchSchedules(); }, []);

  async function handleRun() {
    setRunning(true);
    try {
      const res = await fetch("/api/pm/generate-due", { method: "POST" });
      if (res.ok) {
        alert("Generated work orders for due schedules.");
        await fetchSchedules();
      } else {
        alert("Failed to generate work orders.");
      }
    } catch (err) {
      console.error("Error calling /api/pm/generate-due:", err);
      alert("Failed to generate work orders.");
    } finally {
      setRunning(false);
    }
  }

  function renderAsset(s: any) {
    if (s.asset && s.asset.name) return s.asset.name;
    return s.assetId;
  }

  // Technicians must not be able to use the schedules/PM screen. Show a simple
  // access message instead of the full UI once the session has loaded.
  if (!isSessionLoading && !isAdmin) {
    return (
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className="max-w-xl mx-auto rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
          Access to preventive maintenance schedules is restricted to
          administrators. Please contact your maintenance manager if you
          believe this is an error.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold">Preventive Maintenance Schedules</h1>
        <AdminOnly>
          <button
            onClick={handleRun}
            disabled={running}
            className="bg-orange-600 hover:bg-orange-500 text-white rounded-md px-4 py-2 text-sm font-medium disabled:bg-orange-300"
          >
            {running ? "Generating..." : "Generate Due Work Orders"}
          </button>
        </AdminOnly>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      <Table
        headers={["ID", "Title", "Asset", "Frequency", "Next Due Date", "Status", "Days Until Due"]}
      >
        {loading ? (
          <tr><td colSpan={7} className="py-5 text-center text-gray-400">Loading...</td></tr>
        ) : schedules.length === 0 ? (
          <tr><td colSpan={7} className="py-6 text-center text-gray-300">No schedules found.</td></tr>
        ) : (
          schedules.map((s) => {
            const { status, daysUntilDue } = getScheduleMeta(s.nextDueDate);
            return (
              <tr key={s.id}>
                <td className="px-4 py-2 font-mono">{s.id}</td>
                <td className="px-4 py-2">{s.title}</td>
                <td className="px-4 py-2">{renderAsset(s)}</td>
                <td className="px-4 py-2">Every {s.frequencyDays} days</td>
                <td className="px-4 py-2">{(typeof s.nextDueDate === 'string' ? new Date(s.nextDueDate) : s.nextDueDate).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <Badge colorClass={status === "Overdue" ? "bg-red-100 text-red-700" : status === "Due Today" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}>
                    {status}
                  </Badge>
                </td>
                <td className="px-4 py-2">{daysUntilDue}</td>
              </tr>
            );
          })
        )}
      </Table>
    </div>
  );
}
