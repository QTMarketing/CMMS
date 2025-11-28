import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AddTechnicianDrawer from "./components/AddTechnicianDrawer";
import CreateTechnicianUserDrawer from "./components/CreateTechnicianUserDrawer";

export const dynamic = "force-dynamic";

type TechnicianWithWorkOrders = Awaited<
  ReturnType<typeof prisma.technician.findMany>
>[number];

export default async function TechniciansPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/workorders");
  }

  const technicians = await prisma.technician.findMany({
    orderBy: { name: "asc" },
    include: {
      workOrders: true,
      users: true,
    },
  });

  return (
    <div className="px-2 sm:px-4 md:px-6 py-4 md:py-8 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            Technicians
          </h1>
          <p className="text-sm text-gray-600">
            View all technicians and their workload.
          </p>
        </div>
        <AddTechnicianDrawer />
      </div>

      {technicians.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 bg-white">
          No technicians found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Open WOs</th>
                <th className="px-4 py-3">Total WOs</th>
                <th className="px-4 py-3">Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {technicians.map((tech: TechnicianWithWorkOrders) => {
                const openCount = tech.workOrders.filter(
                  (wo) => wo.status !== "Completed" && wo.status !== "Cancelled"
                ).length;

                return (
                  <tr
                    key={tech.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {tech.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{tech.email}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {tech.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          tech.active
                            ? "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                            : "inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                        }
                      >
                        {tech.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{openCount}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {tech.workOrders.length}
                    </td>
                    <td className="px-4 py-3">
                      <CreateTechnicianUserDrawer
                        technicianId={tech.id}
                        technicianName={tech.name}
                        technicianEmail={tech.email}
                        hasLogin={Array.isArray((tech as any).users) && (tech as any).users.length > 0}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


