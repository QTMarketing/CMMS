"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import Drawer from "@/components/ui/Drawer";

export type StoreSummary = {
  id: string;
  name: string;
  code: string | null;
};

export default function AddStoreDrawer() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [timezone, setTimezone] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  function resetForm() {
    setName("");
    setCode("");
    setAddress("");
    setCity("");
    setState("");
    setTimezone("");
    setManagerEmail("");
    setManagerPassword("");
    setError(null);
  }

  function validate(): string | null {
    if (!name.trim()) return "Store name is required.";
    if (!managerEmail.trim()) return "Store manager email is required.";
    if (!managerPassword.trim()) return "Store manager password is required.";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          timezone: timezone.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        const message =
          data?.error ||
          (res.status === 403
            ? "You are not authorized to create stores."
            : "Failed to create store.");
        setError(message);
        return;
      }

      const store = data?.data;

      // After creating the store, create a STORE_ADMIN user for this store
      // so the manager can log in and create work orders/requests.
      if (store && store.id) {
        const userRes = await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `${name.trim()} Manager`,
            email: managerEmail.trim(),
            password: managerPassword,
            role: "STORE_ADMIN",
            storeId: store.id,
          }),
        });

        const userData = await userRes.json().catch(() => null);

        if (!userRes.ok || (userData && userData.success === false)) {
          const msg =
            userData?.error ||
            (userRes.status === 403
              ? "Store was created, but you are not authorized to create the store manager user."
              : "Store was created, but failed to create the store manager user.");
          setError(msg);
          // We don't return here; the store already exists. We still close the drawer below.
        }
      }

      resetForm();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError("Unexpected error while creating store.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-opacity-90"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add Store
      </button>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 max-w-md mx-auto"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Store</h2>
            <p className="mt-1 text-xs text-gray-500">
              Create a new store/location. You can later assign users and
              technicians to this store.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-0"
              placeholder="Optional short code (e.g. SF-01)"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-0"
              placeholder="Street address (optional)"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                State / Region
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-0"
              placeholder="e.g. America/Los_Angeles"
            />
          </div>

          <div className="mt-2 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Store Manager Login
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Create a login for the store manager so they can sign in and
              create work orders and maintenance requests for this location.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Manager Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="manager@store.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Manager Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={managerPassword}
                    onChange={(e) => setManagerPassword(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter a secure password"
                    required
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
              </div>
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Store"}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  );
}


