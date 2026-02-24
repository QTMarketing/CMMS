import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { isAdminLike, isVendor } from "@/lib/roles";
import TechnicianForm from "./components/TechnicianForm";

export const dynamic = "force-dynamic";

export default async function NewTechnicianPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role as string | undefined;

  // Only admin-like roles can access this page.
  if (!isAdminLike(role) || isVendor(role)) {
    redirect("/technicians");
  }

  return (
    <div className="min-h-screen bg-white text-black px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumbs */}
        <div className="flex flex-wrap gap-2 mb-4 text-sm">
          <a href="/technicians" className="text-gray-500 hover:text-gray-700">
            Vendors
          </a>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">Add New Vendor</span>
        </div>

        {/* Page Heading */}
        <div className="flex flex-wrap justify-between gap-3 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Add New Vendor
          </h1>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <TechnicianForm />
        </div>
      </div>
    </div>
  );
}


