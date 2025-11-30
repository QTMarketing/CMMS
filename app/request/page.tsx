import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canSeeAllStores, getScopedStoreId } from "@/lib/storeAccess";

export const dynamic = "force-dynamic";

interface RequestPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RequestPage({ searchParams }: RequestPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role as string | undefined;
  const userStoreId = ((session.user as any)?.storeId ?? null) as
    | string
    | null;

  const assetWhere: any = {};

  if (!canSeeAllStores(role)) {
    const scopedStoreId = getScopedStoreId(role, userStoreId);
    if (scopedStoreId) {
      assetWhere.storeId = scopedStoreId;
    } else {
      assetWhere.storeId = "__never_match__";
    }
  }

  const assets = await prisma.asset.findMany({
    where: assetWhere,
    orderBy: { id: "asc" },
  });

  async function createRequest(formData: FormData) {
    "use server";

    const session = await getServerSession(authOptions);

    if (!session) {
      redirect("/login");
    }

    const title = (formData.get("title") as string | null)?.trim() ?? "";
    const description =
      (formData.get("description") as string | null)?.trim() ?? "";
    const priority =
      ((formData.get("priority") as string) || "Medium").trim() || "Medium";
    const assetIdRaw = (formData.get("assetId") as string) || "";
    const assetId = assetIdRaw === "" ? null : assetIdRaw;

    if (!title || !description) {
      // In a more advanced flow we might surface validation errors,
      // but for now just reject invalid submissions.
      redirect("/request");
    }

    const createdByEmail = session.user?.email ?? null;
    const createdBy =
      createdByEmail ||
      (session.user as { name?: string | null })?.name ||
      null;

    const userStoreId = ((session.user as any)?.storeId ?? null) as
      | string
      | null;

    let storeId: string | null = userStoreId;

    if (assetId) {
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        select: { storeId: true },
      });
      if (asset?.storeId) {
        storeId = asset.storeId;
      }
    }

    await prisma.request.create({
      data: {
        title,
        description,
        priority,
        status: "Open",
        assetId,
        createdBy,
        storeId,
      },
    });

    redirect("/request?submitted=1");
  }

  const params = await searchParams;
  const submittedParam = params?.submitted;
  const submitted =
    submittedParam === "1" ||
    (Array.isArray(submittedParam) && submittedParam.includes("1"));

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Submit Maintenance Request
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Use this form to report an issue or request maintenance. An
        administrator will review your request.
      </p>

      {submitted && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Your request has been submitted.
        </div>
      )}

      <form action={createRequest} className="space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            type="text"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="Short summary of the issue"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="Describe the problem or requested work in detail"
          />
        </div>

        <div>
          <label
            htmlFor="assetId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Asset (optional)
          </label>
          <select
            id="assetId"
            name="assetId"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            defaultValue=""
          >
            <option value="">No specific asset</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name} ({asset.id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="priority"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue="Medium"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
          >
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
}


