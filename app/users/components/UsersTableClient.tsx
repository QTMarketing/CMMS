"use client";

import { useState } from "react";

import Table from "@/components/ui/Table";

type UserRow = {
  id: string;
  email: string;
  role: string;
  technician?: {
    id: string;
    name: string;
  } | null;
};

type Props = {
  initialUsers: UserRow[];
};

const roleOptions = ["ADMIN", "TECHNICIAN"] as const;

export default function UsersTableClient({ initialUsers }: Props) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(userId: string, nextRole: string) {
    const current = users.find((u) => u.id === userId);
    if (!current || current.role === nextRole) return;

    if (!roleOptions.includes(nextRole as (typeof roleOptions)[number])) {
      setError("Invalid role selected.");
      return;
    }

    setUpdatingId(userId);
    setError(null);
    const previousRole = current.role;

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u))
    );

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, role: previousRole } : u
          )
        );
        setError(
          data?.error ||
            "Failed to update role. Please try again or refresh the page."
        );
        return;
      }
    } catch {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: previousRole } : u))
      );
      setError("Unexpected error while updating role.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleResetPasswordClick(user: UserRow) {
    const newPassword = window.prompt(
      `Enter a new password for ${user.email} (min 6 characters):`
    );

    if (newPassword == null) return; // user cancelled

    if (newPassword.length < 6) {
      window.alert("Password must be at least 6 characters.");
      return;
    }

    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(user.id)}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(
          `Failed to reset password: ${data.error ?? "Unknown error"}`
        );
        return;
      }

      window.alert(`Password for ${user.email} has been reset successfully.`);
    } catch (err) {
      console.error("Error resetting password", err);
      window.alert("Unexpected error while resetting password.");
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <Table
        headers={["Name", "Email", "Role", "Linked Technician", "Actions"]}
      >
        {users.length === 0 ? (
          <tr>
            <td
              colSpan={5}
              className="px-4 py-4 text-center text-xs text-gray-500"
            >
              No users found.
            </td>
          </tr>
        ) : (
          users.map((user) => {
            const displayName =
              user.technician?.name ?? user.email ?? "Unknown user";
            const linkedTechLabel = user.technician
              ? `${user.technician.name}`
              : "—";

            return (
              <tr key={user.id} className="border-t border-gray-100">
                <td className="px-4 py-3 text-sm text-gray-900">
                  {displayName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {user.email}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <select
                    className="border rounded px-2 py-1 text-xs sm:text-sm"
                    value={user.role}
                    onChange={(e) =>
                      handleRoleChange(user.id, e.target.value)
                    }
                    disabled={updatingId === user.id}
                  >
                    {roleOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {linkedTechLabel}
                </td>
                <td className="px-4 py-3 text-sm">
                  <button
                    type="button"
                    onClick={() => handleResetPasswordClick(user)}
                    className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Reset Password
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </Table>
    </div>
  );
}


