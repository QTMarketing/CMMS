import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import WorkOrderDetails from "@/components/workorders/WorkOrderDetails";
import WorkOrderPageActions from "./WorkOrderPageActions";

type PageParams = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function WorkOrderDetailPage({ params }: PageParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role as string | undefined;
  const isTechnician = role === "TECHNICIAN";
  const technicianId = ((session.user as any)?.technicianId ?? null) as
    | string
    | null;

  const { id } = await params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      asset: true,
      assignedTo: true,
      notes: true,
    },
  });

  if (!workOrder) {
    notFound();
  }

  // Technicians can only view work orders assigned to them
  if (isTechnician) {
    if (!technicianId || workOrder.assignedToId !== technicianId) {
      redirect("/");
    }
  }

  // Build technician map so the detail component can resolve names
  const technicians = await prisma.vendor.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const technicianMap = Object.fromEntries(
    technicians.map((t) => [t.id, t.name])
  ) as Record<string, string>;

  return (
    <div className="space-y-4 px-4 py-4 md:px-6 md:py-6">
      {/* Page-level header with back link */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/workorders"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <span className="text-sm">&#8592;</span>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {workOrder.title}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {(() => {
                const num = (workOrder as any).workOrderNumber as
                  | number
                  | null
                  | undefined;
                const display =
                  typeof num === "number" && Number.isFinite(num) && num > 0
                    ? String(num).padStart(4, "0")
                    : String(workOrder.id);
                return `Work Order #${display}`;
              })()}
            </p>
          </div>
        </div>
        {role !== "USER" && role !== "TECHNICIAN" && (
        <WorkOrderPageActions workOrderId={workOrder.id} />
        )}
      </div>

      {/* Main content uses the redesigned details component */}
      <WorkOrderDetails
        workOrder={workOrder}
        asset={workOrder.asset}
        technicianMap={technicianMap}
      />
    </div>
  );
}

