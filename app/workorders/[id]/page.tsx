import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Work Order Details",
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export default async function WorkOrderViewPage({ params }: RouteContext) {
  const { id } = await params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      asset: true,
      assignedTo: true,
    },
  });

  if (!workOrder) {
    return (
      <div className="p-12 text-center text-lg text-gray-500">
        Work order not found
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white shadow rounded-lg p-8 mt-8 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold mb-2">
            {workOrder.title}
          </h1>
          <p className="text-sm text-gray-500">
            Work Order ID: {workOrder.id}
          </p>
        </div>
        <Link
          href="/workorders"
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close"
        >
          ×
        </Link>
      </div>

      <div className="space-y-2">
        <div>
          <span className="font-medium text-gray-600">Status:</span>{" "}
          <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-orange-50 text-orange-700">
            {workOrder.status}
          </span>
        </div>

        <div>
          <span className="font-medium text-gray-600">Priority:</span>{" "}
          <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-yellow-50 text-yellow-700">
            {workOrder.priority}
          </span>
        </div>

        {workOrder.asset && (
          <div>
            <span className="font-medium text-gray-600">Asset:</span>{" "}
            {workOrder.asset.name}
          </div>
        )}

        <div>
          <span className="font-medium text-gray-600">Assigned To:</span>{" "}
          {workOrder.assignedTo?.name ?? "—"}
        </div>

        {workOrder.dueDate && (
          <div>
            <span className="font-medium text-gray-600">Due Date:</span>{" "}
            {new Date(workOrder.dueDate).toLocaleDateString()}
          </div>
        )}

        <div>
          <span className="font-medium text-gray-600">Created At:</span>{" "}
          {new Date(workOrder.createdAt).toLocaleDateString()}
        </div>

        <div>
          <span className="font-medium text-gray-600">Completed At:</span>{" "}
          {workOrder.completedAt
            ? new Date(workOrder.completedAt).toLocaleDateString()
            : "—"}
        </div>

        {workOrder.description && (
          <div>
            <span className="font-medium text-gray-600">Description:</span>{" "}
            <span className="text-gray-800">{workOrder.description}</span>
          </div>
        )}
      </div>
    </div>
  );
}

