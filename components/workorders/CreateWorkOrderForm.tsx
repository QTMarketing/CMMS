import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface StoreOption {
  id: string;
  name: string;
  code?: string | null;
}

interface Props {
  onSuccess: (newWorkOrder: any) => void;
  onCancel: () => void;
  isMasterAdmin: boolean;
  stores: StoreOption[];
  currentStoreId?: string | null;
}

const priorities = ["Low", "Medium", "High"];

export default function CreateWorkOrderForm({
  onSuccess,
  onCancel,
  isMasterAdmin,
  stores,
  currentStoreId,
}: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isUser = role === "USER";

  const [title, setTitle] = useState("");
  const [assetId, setAssetId] = useState("");
  const [partsRequired, setPartsRequired] = useState(false);
  const [problemDescription, setProblemDescription] = useState("");
  const [helpDescription, setHelpDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string>(currentStoreId ?? "");
  const [isPending, startTransition] = useTransition();

  // Keep local storeId in sync with the current selection passed from the page
  useEffect(() => {
    if (isMasterAdmin) {
      setStoreId(currentStoreId ?? "");
    }
  }, [isMasterAdmin, currentStoreId]);

  // Determine the effective storeId for filtering assets
  const effectiveStoreId = isMasterAdmin ? storeId : currentStoreId;

  useEffect(() => {
    // Only fetch assets if we have a storeId (for non-master admins) or if master admin has selected a store
    if (!effectiveStoreId && isMasterAdmin) {
      setAssets([]);
      return;
    }

    // Build API URL with storeId filter
    const assetsUrl = effectiveStoreId 
      ? `/api/assets?storeId=${effectiveStoreId}`
      : "/api/assets";

    fetch(assetsUrl, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to fetch assets:", res.status);
          return [];
        }
        return res.json();
      })
      .then((data) => {
        const assetsList = Array.isArray(data) ? data : data.data || [];
        // Additional client-side filter as backup
        const filtered = effectiveStoreId
          ? assetsList.filter((a: any) => a.storeId === effectiveStoreId)
          : assetsList;
        setAssets(filtered);
        // Clear selected asset if it's not in the filtered list
        if (assetId && !filtered.find((a: any) => a.id === assetId)) {
          setAssetId("");
        }
      })
      .catch((err) => {
        console.error("Error fetching assets:", err);
        setAssets([]);
      });

    // Only fetch vendors if not USER role (USER can't assign)
    if (!isUser) {
      // Also filter vendors by store
      const vendorsUrl = effectiveStoreId
        ? `/api/technicians?storeId=${effectiveStoreId}`
        : "/api/technicians";
      
      fetch(vendorsUrl, { cache: "no-store" })
        .then((res) => {
          if (!res.ok) {
            console.error("Failed to fetch vendors:", res.status);
            return [];
          }
          return res.json();
        })
        .then((data) => {
          const vendorsList = Array.isArray(data) ? data : data.data || [];
          // Additional client-side filter as backup
          const filtered = effectiveStoreId
            ? vendorsList.filter((v: any) => v.storeId === effectiveStoreId)
            : vendorsList;
          setTechnicians(filtered);
        })
        .catch((err) => {
          console.error("Error fetching vendors:", err);
          setTechnicians([]);
        });
    }
  }, [isUser, effectiveStoreId, isMasterAdmin]);

  async function handleFileUpload(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", "workorder");
    
    // Get storeId - use the selected store for master admin, or user's store
    const uploadStoreId = isMasterAdmin ? storeId : currentStoreId;
    if (uploadStoreId) {
      formData.append("storeId", uploadStoreId);
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
      // Reset input
      e.target.value = "";
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function validate() {
    if (!title.trim()) return "Title is required.";
    // Location removed - using store location instead
    // Asset is now optional - removed validation
    if (!problemDescription.trim())
      return "Where or What is the problem? is required.";
    if (!helpDescription.trim()) return "How can we help? is required.";
    if (!priority) return "Priority is required.";
    // MASTER_ADMIN must explicitly choose a store
    if (isMasterAdmin && !storeId)
      return "Store is required for work orders.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const requestBody = {
        title,
        // Location removed - store location will be used instead
        assetId: assetId || undefined, // Make assetId optional
        partsRequired,
        problemDescription,
        helpDescription,
        attachments,
        priority,
        assignedTo: isUser ? undefined : assignedTo || undefined,
        dueDate: dueDate || undefined,
        // Only MASTER_ADMIN can pick a store explicitly; STORE_ADMIN and USER are scoped
        // to their own store on the backend.
        storeId: isMasterAdmin ? storeId || null : undefined,
      };
      
      console.log("Submitting work order:", requestBody);
      
      const res = await fetch("/api/workorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMessage = data.error || `Failed to create work order (${res.status}).`;
        console.error("Work order creation error:", {
          status: res.status,
          error: data.error,
          data: data,
        });
        setError(errorMessage);
        setLoading(false);
        return;
      }
      // Let parent decide how to refresh; onSuccess is typically where router.refresh()
      // or a table reload is triggered.
      startTransition(() => {
        onSuccess(data.data);
        router.refresh();
      });
    } catch (e) {
      setError("Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="text-xl font-bold mb-1">New Work Order</div>
      {error && <div className="text-red-500 text-sm">{error}</div>}

      {/* Store selection (MASTER_ADMIN only) */}
      {isMasterAdmin && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Store <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full border rounded px-3 py-1"
            value={storeId}
            onChange={(e) => {
              setStoreId(e.target.value);
              setAssetId(""); // Clear selected asset when store changes
            }}
            required
          >
            <option value="">Select store…</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code ? `${s.name} (${s.code})` : s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          className="w-full border rounded px-3 py-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Asset
        </label>
        <select
          className="w-full border rounded px-3 py-1"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
        >
          <option value="">Select asset (optional)…</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Parts Required <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="partsRequired"
              checked={partsRequired === true}
              onChange={() => setPartsRequired(true)}
              required
            />
            <span>Yes</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="partsRequired"
              checked={partsRequired === false}
              onChange={() => setPartsRequired(false)}
              required
            />
            <span>No</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Where or What is the problem? <span className="text-red-500">*</span>
        </label>
        <textarea
          className="w-full border rounded px-3 py-1"
          rows={4}
          value={problemDescription}
          onChange={(e) => setProblemDescription(e.target.value)}
          placeholder="Describe the problem in detail"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          How can we help? <span className="text-red-500">*</span>
        </label>
        <textarea
          className="w-full border rounded px-3 py-1"
          rows={4}
          value={helpDescription}
          onChange={(e) => setHelpDescription(e.target.value)}
          placeholder="Describe how you would like us to help"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Upload Image / Video
        </label>
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileChange}
          disabled={uploadingFiles}
          className="w-full border rounded px-3 py-1"
        />
        {uploadingFiles && (
          <p className="text-sm text-gray-500 mt-1">Uploading files...</p>
        )}
        {attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {attachments.map((url, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 p-2 rounded"
              >
                <span className="text-sm text-gray-700 truncate flex-1">
                  {url.split("/").pop()}
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="text-red-500 hover:text-red-700 text-sm ml-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Priority <span className="text-red-500">*</span>
        </label>
        <select
          className="w-full border rounded px-3 py-1"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          {priorities.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Assigned To (only for admins, not USER) */}
      {!isUser && (
      <div>
        <label className="block text-sm font-medium mb-1">Assigned To</label>
        <select
          className="w-full border rounded px-3 py-1"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
        >
          <option value="">Unassigned</option>
          {technicians
            .filter((t) => t.active)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
      </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Due Date</label>
        <input
          type="date"
          className="w-full border rounded px-3 py-1"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="flex gap-3 mt-4">
        <button
          type="submit"
          className="bg-blue-600 text-white font-semibold px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
          disabled={loading || isPending || uploadingFiles}
        >
          {loading ? "Creating…" : "Create Work Order"}
        </button>
        <button
          type="button"
          className="px-5 py-2 rounded border ml-2"
          onClick={onCancel}
          disabled={loading || uploadingFiles}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
