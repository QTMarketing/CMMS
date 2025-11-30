import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Badge from "../../../components/ui/Badge";
import { isAdminLike } from "@/lib/roles";

function getPmStatus(nextDueDate: Date | null | undefined) {
  if (!nextDueDate) {
    return {
      label: "Unknown",
      color: "bg-gray-100 text-gray-700",
    };
  }

  const now = new Date();
  const diffMs = nextDueDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) {
    return {
      label: "Overdue",
      color: "bg-red-100 text-red-700",
    };
  }

  if (diffDays <= 7) {
    return {
      label: "Due Soon",
      color: "bg-amber-100 text-amber-700",
    };
  }

  return {
    label: "On Track",
    color: "bg-emerald-100 text-emerald-700",
  };
}

type PageProps = {
  params: { id: string };
};

export default async function PmScheduleDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;
  const technicianId = ((session.user as any)?.technicianId ?? null) as
    | string
    | null;
  const isAdmin = isAdminLike(role);

  // Technicians must not see any /pm routes.
  if (!isAdmin) {
    redirect("/workorders");
  }

  const id = params.id;

  // Use existing Prisma model: PreventiveSchedule
  const pm = await prisma.preventiveSchedule.findUnique({
    where: { id },
    include: {
      asset: true,
    },
  });

  if (!pm) {
    notFound();
  }

  const status = getPmStatus(pm.nextDueDate);

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{pm.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Preventive maintenance schedule detail (read-only).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/pm"
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; Back to all PM schedules
          </Link>
          {isAdmin && (
            <Link
              href={`/pm/${pm.id}/edit`}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Schedule details */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Schedule
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">PM ID</dt>
              <dd className="font-mono text-gray-900">{pm.id}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Title</dt>
              <dd className="text-gray-900">{pm.title}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Asset</dt>
              <dd className="text-right text-gray-900">
                <Link
                  href={`/assets/${pm.assetId}`}
                  className="text-blue-600 hover:underline"
                >
                  {(pm as any).asset?.name ?? pm.assetId}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Frequency</dt>
              <dd className="text-gray-900">
                Every {pm.frequencyDays} days
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Next Due Date</dt>
              <dd className="text-gray-900">
                {pm.nextDueDate
                  ? new Date(pm.nextDueDate).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Active</dt>
              <dd className="text-gray-900">
                {pm.active ? "Yes" : "No"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Status
          </h2>
          <div className="flex items-center gap-3">
            <Badge colorClass={status.color}>{status.label}</Badge>
            <span className="text-xs text-gray-500">
              Status is computed from next due date and is for display
              only.
            </span>
          </div>
        </div>
      </div>

      {/* Related work orders placeholder – no schema link yet */}
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">
          Related Work Orders
        </h2>
        <p className="text-sm text-gray-500">
          No direct link between work orders and PM schedules exists in
          the current schema, so related work orders cannot be shown yet.
          This section will be wired up once a <code>pmScheduleId</code>{" "}
          or similar field is added to <code>WorkOrder</code>.
        </p>
      </div>
    </div>
  );
}


