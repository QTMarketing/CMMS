import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import EditWorkOrderForm from "../EditWorkOrderForm";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdminLike } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Edit Work Order",
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Match the unions from EditWorkOrderForm
type WorkOrderStatus = "Open" | "In Progress" | "Completed" | "Cancelled";
type WorkOrderPriority = "Low" | "Medium" | "High";

export default async function EditWorkOrderPage({ params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;
  const isAdmin = isAdminLike(role);

  if (!isAdmin) {
    redirect("/workorders");
  }

  const { id } = await params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      assignedTo: true,
      asset: true,
      notes: true, // make sure notes are loaded
    },
  });

  if (!workOrder) {
    return (
      <div className="p-12 text-center text-lg text-gray-500">
        Work order not found
      </div>
    );
  }

  // Convert Prisma record -> shape required by EditWorkOrderForm
  const formWorkOrder = {
    id: workOrder.id,
    title: workOrder.title,
    status: workOrder.status as WorkOrderStatus,
    priority: workOrder.priority as WorkOrderPriority,
    description: workOrder.description ?? "",
    dueDate: workOrder.dueDate ? workOrder.dueDate.toISOString() : null,
    createdAt: workOrder.createdAt
      ? workOrder.createdAt.toISOString()
      : "",
    completedAt: workOrder.completedAt
      ? workOrder.completedAt.toISOString()
      : null,
    asset: workOrder.asset ? { name: workOrder.asset.name } : null,
    assignedTo: workOrder.assignedTo
      ? { id: workOrder.assignedTo.id, name: workOrder.assignedTo.name }
      : null,
    // Map notes to the simpler shape EditWorkOrderForm expects
    notes: (workOrder.notes ?? []).map((note) => ({
      id: String(note.id),
      text: note.text,
      author: note.author ?? null,
      timestamp: note.timestamp
        ? note.timestamp.toISOString()
        : undefined,
    })),
  };

  return (
    <div className="space-y-4 px-4 py-4 md:px-6 md:py-6">
      {/* Page-level header with back link */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/workorders/${workOrder.id}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <span className="text-sm">&#8592;</span>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Edit Work Order
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {workOrder.title} · #{workOrder.id}
            </p>
          </div>
        </div>
      </div>

      {/* Main edit form in a card to match detail layout */}
      <div className="rounded-lg bg-white p-4 shadow-sm md:p-6">
        <EditWorkOrderForm workOrder={formWorkOrder} />
      </div>
    </div>
  );
}
