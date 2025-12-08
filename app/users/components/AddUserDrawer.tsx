"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Drawer from "@/components/ui/Drawer";

type StoreOption = {
  id: string;
  name: string;
  code?: string | null;
};

const roleOptions = ["MASTER_ADMIN", "STORE_ADMIN", "ADMIN", "TECHNICIAN", "USER"] as const;

type Props = {
  stores: StoreOption[];
};

export default function AddUserDrawer({ stores }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] =
    useState<(typeof roleOptions)[number]>("MASTER_ADMIN");
  const [storeId, setStoreId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setRole("MASTER_ADMIN");
    setStoreId("");
    setError(null);
  }

  function validate(): string | null {
    if (!name.trim()) return "Name is required.";
    if (!email.trim()) return "Email is required.";
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) return "Please enter a valid email.";
    if (!password.trim()) return "Password is required.";
    if (password.trim().length < 6)
      return "Password must be at least 6 characters.";

    const needsStore =
      role === "STORE_ADMIN" || role === "TECHNICIAN" || role === "USER";
    if (needsStore && !storeId) {
      return "Store is required for store admins, technicians, and users.";
    }
    return null;
  }

  const storeOptions = useMemo(
    () =>
      stores.map((s) => ({
        id: s.id,
        label: s.code ? `${s.name} (${s.code})` : s.name,
      })),
    [stores]
  );

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
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
          storeId: storeId || null,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        const message =
          data?.error ||
          (res.status === 403
            ? "You are not authorized to create users."
            : "Failed to create user.");
        setError(message);
        return;
      }

      resetForm();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Unexpected error while creating user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
      >
        Add User
      </button>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 max-w-md mx-auto"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add User</h2>
            <p className="mt-1 text-xs text-gray-500">
              Create a new application user. Use MASTER_ADMIN for global
              management, STORE_ADMIN for a single store, TECHNICIAN for field users,
              and USER for store-level users who can create work orders and requests.
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
            <p className="mt-1 text-[11px] text-gray-500">
              Used only for display; the email is the primary login identifier.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as (typeof roleOptions)[number])
              }
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {(role === "STORE_ADMIN" || role === "TECHNICIAN" || role === "USER") && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Store <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                required
              >
                <option value="">Select a store…</option>
                {storeOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-500">
                Store admins, technicians, and users must belong to a specific store.
              </p>
            </div>
          )}

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
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  );
}


