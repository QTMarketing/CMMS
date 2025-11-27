import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;
  const isAdmin = role === "ADMIN";

  if (!isAdmin) {
    redirect("/workorders");
  }

  const { id } = await params;

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      asset: true,
    },
  });

  if (!request) {
    notFound();
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
              {request.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Request ID: {request.id}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-slate-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-100">
            {request.status}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-500">Asset</div>
            <div className="text-sm text-gray-900 dark:text-gray-50">
              {request.asset
                ? request.asset.name ?? request.asset.id
                : "No specific asset"}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-500">Priority</div>
            <div className="text-sm text-gray-900 dark:text-gray-50">
              {request.priority}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-500">Created By</div>
            <div className="text-sm text-gray-900 dark:text-gray-50">
              {request.createdBy ?? "Unknown"}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-500">Created At</div>
            <div className="text-sm text-gray-900 dark:text-gray-50">
              {request.createdAt.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-500">Description</div>
          <p className="rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-3 text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
            {request.description}
          </p>
        </div>
      </div>
    </div>
  );
}


