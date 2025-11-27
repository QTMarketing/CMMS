import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

async function createPmSchedule(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";

  if (!isAdmin) {
    redirect("/workorders");
  }

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const assetId = (formData.get("assetId") as string | null)?.trim() ?? "";
  const frequencyDaysRaw =
    (formData.get("frequencyDays") as string | null) ?? "";
  const nextDueDateRaw =
    (formData.get("nextDueDate") as string | null) ?? "";
  const activeRaw = formData.get("active") as string | null;

  const frequencyDays = Number.parseInt(frequencyDaysRaw, 10) || 0;

  if (!title || !assetId || !nextDueDateRaw || frequencyDays <= 0) {
    // Very minimal validation — in a real app you might return a form error.
    redirect("/pm");
  }

  await prisma.preventiveSchedule.create({
    data: {
      title,
      assetId,
      frequencyDays,
      nextDueDate: new Date(nextDueDateRaw),
      active: activeRaw === "on" || activeRaw === "true",
    },
  });

  redirect("/pm");
}

export default async function NewPmSchedulePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;
  const isAdmin = role === "ADMIN";

  if (!isAdmin) {
    redirect("/workorders");
  }

  const assets = await prisma.asset.findMany({
    orderBy: { name: "asc" },
  });

  const today = new Date();
  const defaultDate = today.toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">New PM Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a new preventive maintenance schedule. This does not
            generate work orders directly.
          </p>
        </div>
        <Link
          href="/pm"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to all PM schedules
        </Link>
      </div>

      <form action={createPmSchedule} className="space-y-6 max-w-xl">
        <div className="space-y-1">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            PM Name / Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="assetId"
            className="block text-sm font-medium text-gray-700"
          >
            Asset
          </label>
          <select
            id="assetId"
            name="assetId"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select an asset…</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name} ({asset.id})
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="frequencyDays"
              className="block text-sm font-medium text-gray-700"
            >
              Frequency (days)
            </label>
            <input
              id="frequencyDays"
              name="frequencyDays"
              type="number"
              min={1}
              defaultValue={30}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="nextDueDate"
              className="block text-sm font-medium text-gray-700"
            >
              Next Due Date
            </label>
            <input
              id="nextDueDate"
              name="nextDueDate"
              type="date"
              defaultValue={defaultDate}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="active"
            name="active"
            type="checkbox"
            defaultChecked
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor="active"
            className="text-sm font-medium text-gray-700"
          >
            Active schedule
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save PM Schedule
          </button>
          <Link
            href="/pm"
            className="text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}


