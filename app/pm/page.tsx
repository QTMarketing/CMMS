import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";

export const dynamic = "force-dynamic";

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

export default async function PmSchedulesPage() {
  const session = await getServerSession(authOptions);

  // If there is no session at all, send the user to login instead of
  // treating them as a non-admin.
  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;
  const technicianId = ((session.user as any)?.technicianId ?? null) as
    | string
    | null;
  const isAdmin = role === "ADMIN";

  // Technicians must not see this page.
  if (!isAdmin) {
    redirect("/workorders");
  }

  // Use existing Prisma model: PreventiveSchedule
  const pmSchedules = await prisma.preventiveSchedule.findMany({
    include: {
      asset: true,
    },
    orderBy: {
      nextDueDate: "asc",
    },
  });

  const today = new Date();

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Preventive Maintenance Schedules
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Read-only view of all PM schedules. Only administrators can
            access this page.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/pm/new"
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New PM Schedule
          </Link>
        )}
      </div>

      {pmSchedules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 bg-white">
          No preventive maintenance schedules found.
        </div>
      ) : (
        <Table
          headers={[
            "PM Name",
            "Asset",
            "Frequency",
            "Next Due",
            // "Last Completed", // Not available in current schema; omit for now.
            "Status",
          ]}
        >
          {pmSchedules.map((pm) => {
            const status = getPmStatus(pm.nextDueDate);
            return (
              <tr key={pm.id}>
                <td className="px-4 py-2 text-xs sm:text-sm">
                  <Link
                    href={`/pm/${pm.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {pm.title}
                  </Link>
                </td>
                <td className="px-4 py-2 text-xs sm:text-sm">
                  {(pm as any).asset?.name ?? pm.assetId}
                </td>
                <td className="px-4 py-2 text-xs sm:text-sm">
                  Every {pm.frequencyDays} days
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-xs sm:text-sm">
                  {pm.nextDueDate
                    ? new Date(pm.nextDueDate).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  <Badge colorClass={status.color}>{status.label}</Badge>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      <p className="text-xs text-gray-400">
        Status is calculated relative to today ({today.toLocaleDateString()})
        and is for display only.
      </p>
    </div>
  );
}


