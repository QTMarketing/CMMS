"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import Drawer from "@/components/ui/Drawer";

type Props = {
  technicianId: string;
  technicianName: string;
  technicianEmail?: string | null;
  hasLogin: boolean;
};

export default function CreateTechnicianUserDrawer({
  technicianId,
  technicianName,
  technicianEmail,
  hasLogin,
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(technicianEmail ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  if (hasLogin) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        Login created
      </span>
    );
  }

  function validate(): string | null {
    if (!email.trim()) return "Email is required.";
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) return "Please enter a valid email.";
    if (!password.trim()) return "Initial password is required.";
    if (password.trim().length < 6)
      return "Password must be at least 6 characters.";
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
      const res = await fetch(
        `/api/technicians/${encodeURIComponent(technicianId)}/create-user`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            initialPassword: password.trim(),
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        const message =
          data?.error ||
          (res.status === 403
            ? "You are not authorized to create logins."
            : "Failed to create login.");
        setError(message);
        return;
      }

      setOpen(false);
      setPassword("");
      router.refresh();
    } catch (err) {
      setError("Unexpected error while creating login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md border border-blue-600 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
      >
        Create Login
      </button>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 max-w-md mx-auto"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Create Login
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Create a technician user account that can sign in with this email
              and an initial password. You can share the password with the
              technician manually.
            </p>
          </div>

          <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-700 space-y-1">
            <div className="font-medium">Technician</div>
            <div>{technicianName}</div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

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
              Initial Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Minimum 6 characters. The technician should change it later when
              a password reset feature is available.
            </p>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
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
              {loading ? "Creating..." : "Create Login"}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  );
}


