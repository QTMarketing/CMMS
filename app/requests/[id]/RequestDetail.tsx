"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type RequestWithAsset = {
  id: string;
  requestNumber?: number | null;
  title: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  createdBy?: string | null;
  assetId?: string | null;
  asset?: {
    id: string;
    name: string | null;
  } | null;
  storeId?: string | null;
  attachments?: string[];
};

type AssetOption = {
  id: string;
  name: string;
  storeId?: string | null;
};

export default function RequestDetail({ id }: { id: string }) {
  const router = useRouter();
  const [request, setRequest] = useState<RequestWithAsset | null>(null);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [assetId, setAssetId] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const [reqRes, assetsRes] = await Promise.all([
          fetch(`/api/requests/${id}`, { cache: "no-store" }),
          fetch("/api/assets", { cache: "no-store" }),
        ]);

        if (!reqRes.ok) {
          throw new Error("Failed to load request");
        }

        const reqData = await reqRes.json();
        const req: RequestWithAsset = reqData.data || reqData;

        let assetsData: any = [];
        if (assetsRes.ok) {
          const aData = await assetsRes.json().catch(() => null);
          assetsData = Array.isArray(aData) ? aData : aData?.data || [];
        }

        if (!cancelled) {
          setRequest(req);
          setTitle(req.title);
          setDescription(req.description);
          setPriority(req.priority || "Medium");
          setAssetId(req.assetId || "");
          setAttachments(Array.isArray(req.attachments) ? req.attachments : []);

          const filteredAssets =
            req.storeId && Array.isArray(assetsData)
              ? assetsData.filter((a: any) => a.storeId === req.storeId)
              : assetsData;
          setAssets(filteredAssets);
        }
      } catch (e) {
        if (!cancelled) {
          setError("Failed to load request details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleFileUpload(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", "request");
    
    if (request?.storeId) {
      formData.append("storeId", request.storeId);
    }

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to upload file");
    }

    return data.data.url;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    setError(null);

    try {
      const uploadPromises = Array.from(files).map((file) =>
        handleFileUpload(file)
      );
      const urls = await Promise.all(uploadPromises);
      setAttachments((prev) => [...prev, ...urls]);
    } catch (err: any) {
      setError(err.message || "Failed to upload files");
    } finally {
      setUploadingFiles(false);
      e.target.value = "";
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !assetId.trim()) {
      setError("Title, description, and asset are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          assetId,
          attachments: attachments.length > 0 ? attachments : [],
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        setError(data?.error || "Failed to update request.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unexpected error while updating request.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !request) {
    return (
      <div className="px-4 py-4 md:px-6 md:py-6">
        <div className="max-w-3xl mx-auto rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          Loading request…
        </div>
      </div>
    );
  }

  const displayId = request.requestNumber
    ? String(request.requestNumber).padStart(4, "0")
    : request.id;

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
              {request.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Request ID: <span className="font-mono">{displayId}</span>
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-slate-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-100">
            {request.status}
          </span>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Asset <span className="text-red-500">*</span>
              </label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select an asset</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Images / Videos
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              disabled={uploadingFiles}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {uploadingFiles && (
              <p className="text-xs text-gray-500 mt-1">Uploading files...</p>
            )}
            {attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {attachments.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-2 rounded"
                  >
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline truncate flex-1"
                    >
                      {url.split("/").pop()}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-500 hover:text-red-700 text-xs ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500">Created By</div>
              <div className="text-sm text-gray-900 dark:text-gray-50">
                {request.createdBy ?? "Unknown"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500">Created At</div>
              <div className="text-sm text-gray-900 dark:text-gray-50">
                {new Date(request.createdAt).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

