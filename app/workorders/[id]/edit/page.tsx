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
    dueDate: workOrder.dueDate
      ? workOrder.dueDate.toISOString()
      : null,
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
    <div className="max-w-2xl mx-auto bg-white shadow rounded-lg p-8 mt-8 space-y-4">
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-semibold">
          Edit: {workOrder.title}
        </h1>
        <Link
          href="/workorders"
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close"
        >
          ×
        </Link>
      </div>

      <EditWorkOrderForm workOrder={formWorkOrder} />
    </div>
  );
}
