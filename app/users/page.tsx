import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import UsersTable from "./components/UsersTable";
import AddUserDrawer from "./components/AddUserDrawer";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/workorders");
  }

  return (
    <div className="px-2 sm:px-4 md:px-6 py-4 md:py-8 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            Users Management
          </h1>
          <p className="text-sm text-gray-600">
            View and manage application users, including admin and technician
            accounts.
          </p>
        </div>
        <AddUserDrawer />
      </div>

      <UsersTable />
    </div>
  );
}


