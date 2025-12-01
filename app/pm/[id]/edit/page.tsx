import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAdminLike } from "@/lib/roles";

async function updatePmSchedule(id: string, formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const isAdmin = isAdminLike(role);

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
    redirect(`/pm/${id}`);
  }

  await prisma.preventiveSchedule.update({
    where: { id },
    data: {
      title,
      assetId,
      frequencyDays,
      nextDueDate: new Date(nextDueDateRaw),
      active: activeRaw === "on" || activeRaw === "true",
    },
  });

  redirect(`/pm/${id}`);
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPmSchedulePage({ params }: PageProps) {
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

  const pm = await prisma.preventiveSchedule.findUnique({
    where: { id },
  });

  if (!pm) {
    notFound();
  }

  const assets = await prisma.asset.findMany({
    orderBy: { name: "asc" },
  });

  const nextDueDateValue = pm.nextDueDate
    ? new Date(pm.nextDueDate).toISOString().slice(0, 10)
    : "";

  const updateAction = updatePmSchedule.bind(null, pm.id);

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Edit PM Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            Update this preventive maintenance schedule. Changes here do
            not directly generate or close work orders.
          </p>
        </div>
        <Link
          href={`/pm/${pm.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to PM details
        </Link>
      </div>

      <form action={updateAction} className="space-y-6 max-w-xl">
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
            defaultValue={pm.title}
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
            defaultValue={pm.assetId}
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
              required
              defaultValue={pm.frequencyDays}
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
              required
              defaultValue={nextDueDateValue}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="active"
            name="active"
            type="checkbox"
            defaultChecked={pm.active}
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
            Save Changes
          </button>
          <Link
            href={`/pm/${pm.id}`}
            className="text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}


