"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

interface Store {
  id: string;
  name: string;
}

interface Asset {
  id: string;
  name: string;
  location: string;
}

export default function PublicWorkOrderForm() {
  const params = useParams();
  const router = useRouter();
  const qrCode = params?.qrCode as string;

  const [store, setStore] = useState<Store | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [assetId, setAssetId] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [helpDescription, setHelpDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [partsRequired, setPartsRequired] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  useEffect(() => {
    if (!qrCode) {
      setError("Invalid QR code.");
      setLoading(false);
      return;
    }

    // Fetch store and assets
    fetch(`/api/stores/qr/${qrCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setStore(data.data.store);
          setAssets(data.data.assets || []);
        } else {
          setError(data.error || "Store not found.");
        }
      })
      .catch((err) => {
        console.error("Error fetching store:", err);
        setError("Failed to load store information.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [qrCode]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !qrCode) return;
    setUploadingFiles(true);
    setError(null);
    try {
      const uploads = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("qrCode", qrCode);
        formData.append("fileType", "workorder");
        const res = await fetch("/api/upload/public", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Upload failed");
        return data.data.url as string;
      });
      const urls = await Promise.all(uploads);
      setAttachments((prev) => [...prev, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file(s).");
    } finally {
      setUploadingFiles(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!title.trim() || !location.trim() || !assetId || !problemDescription.trim() || !helpDescription.trim()) {
      setError("Please fill in all required fields.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/workorders/public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          qrCode: qrCode,
          title: title.trim(),
          location: location.trim(),
          assetId: assetId,
          problemDescription: problemDescription.trim(),
          helpDescription: helpDescription.trim(),
          priority: priority,
          partsRequired: partsRequired,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to create work order.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      // Reset form
      setTitle("");
      setLocation("");
      setAssetId("");
      setProblemDescription("");
      setHelpDescription("");
      setPriority("Medium");
      setPartsRequired(false);
      setAttachments([]);

      // Hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      console.error("Error submitting work order:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Create Work Order
            </h1>
            {store && (
              <p className="text-sm text-gray-600">
                Store: <span className="font-medium">{store.name}</span>
              </p>
            )}
          </div>

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm font-medium">
                ✓ Work order created successfully!
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Brief description of the issue"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Where is the issue located?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asset <span className="text-red-500">*</span>
              </label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Select an asset</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} - {asset.location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Where or What is the problem? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Describe the problem..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How can we help? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={helpDescription}
                onChange={(e) => setHelpDescription(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Describe what help is needed..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="partsRequired"
                checked={partsRequired}
                onChange={(e) => setPartsRequired(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="partsRequired" className="ml-2 block text-sm text-gray-700">
                Parts are required
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Images / Videos (optional)
              </label>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
                disabled={uploadingFiles}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploadingFiles && (
                <p className="mt-1 text-xs text-gray-500">Uploading...</p>
              )}
              {attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {attachments.map((url, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2 text-sm"
                    >
                      <span className="text-gray-700 truncate flex-1 min-w-0">
                        {url.split("/").pop() || `Attachment ${index + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="ml-2 text-red-600 hover:text-red-800 font-medium shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Add photos or short videos to help describe the issue. Max 10MB per file.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white text-sm font-semibold rounded-md py-2 px-4 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Work Order"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

