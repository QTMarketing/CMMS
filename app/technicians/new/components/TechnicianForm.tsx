"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Store = {
  id: string;
  name: string;
  code: string | null;
};

export default function TechnicianForm() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch stores on mount
  useEffect(() => {
    fetch("/api/stores", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to fetch stores:", res.status);
          return { success: false, data: [] };
        }
        return res.json();
      })
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setStores(data.data);
          // Auto-select if there's only one store (for STORE_ADMIN)
          if (data.data.length === 1) {
            setStoreId(data.data[0].id);
          }
        } else {
          setStores([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching stores:", err);
        setStores([]);
      });
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const active = formData.get("active") === "on";

    if (!name || !email) {
      setError("Name and email are required.");
      return;
    }

    if (!storeId) {
      setError("Location (store) is required.");
      return;
    }

    if (!password || password.trim().length === 0) {
      setError("Password is required.");
      return;
    }

    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/technicians", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          active,
          storeId,
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        setError(data?.error || "Failed to create technician.");
        setLoading(false);
        return;
      }

      // Success - redirect to technicians page
      router.push("/technicians");
    } catch (err) {
      setError("Unexpected error while creating technician.");
      setLoading(false);
    }
  }

  // Format store display: show code if available, otherwise show ID
  const formatStoreDisplay = (store: Store): string => {
    if (store.code) {
      return `${store.code} - ${store.name}`;
    }
    return `${store.id.substring(0, 8).toUpperCase()} - ${store.name}`;
  };

  return (
    <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
      {/* Personal Information */}
      <div className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Full Name
            <input
              name="name"
              required
              className="mt-2 h-11 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Enter full name"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Email Address
            <input
              name="email"
              type="email"
              required
              className="mt-2 h-11 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="e.g., tech@lamafix.com"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Contact Number
            <input
              name="phone"
              type="tel"
              className="mt-2 h-11 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="e.g., (123) 456-7890"
            />
          </label>
        </div>
      </div>

      {/* Professional Details */}
      <div className="p-6 border-t border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          Professional Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Primary Skill Set
            <select
              className="mt-2 h-11 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              defaultValue=""
            >
              <option value="" disabled>
                Select skill set
              </option>
              <option>Electrical</option>
              <option>Mechanical</option>
              <option>Plumbing</option>
              <option>HVAC</option>
            </select>
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Experience Level
            <select
              className="mt-2 h-11 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              defaultValue=""
            >
              <option value="" disabled>
                Select level
              </option>
              <option>Junior</option>
              <option>Mid-Level</option>
              <option>Senior</option>
            </select>
          </label>
          <div className="flex flex-col md:col-span-2 text-sm font-medium text-gray-700">
            Certifications
            <div className="mt-2 flex items-center gap-2">
              <input
                className="flex-1 h-11 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g., OSHA 10-Hour"
              />
              <button
                type="button"
                className="flex items-center justify-center size-9 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Account & Access */}
      <div className="p-6 border-t border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          Account &amp; Access
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Location
            <select
              name="storeId"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              required
              className="mt-2 h-11 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="" disabled>
                Select location
              </option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {formatStoreDisplay(store)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Status
            <select
              className="mt-2 h-11 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              defaultValue="Active"
            >
              <option>Active</option>
              <option>On Leave</option>
              <option>Inactive</option>
            </select>
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Password <span className="text-red-500">*</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 pr-10 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter a secure password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Confirm Password <span className="text-red-500">*</span>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 pr-10 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Re-enter password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
            <input
              name="active"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Active technician</span>
          </label>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-t border-gray-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end items-center gap-4 p-6">
        <a
          href="/technicians"
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60"
        >
          {loading ? "Creating..." : "Add Technician"}
        </button>
      </div>
    </form>
  );
}

