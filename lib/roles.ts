export type AppRole = "MASTER_ADMIN" | "STORE_ADMIN" | "ADMIN" | "VENDOR" | "USER";

export function isMasterAdmin(role?: string | null): boolean {
  if (!role) return false;
  return role.toUpperCase() === "MASTER_ADMIN";
}

export function isStoreAdmin(role?: string | null): boolean {
  if (!role) return false;
  return role.toUpperCase() === "STORE_ADMIN";
}

// For now, treat MASTER_ADMIN, STORE_ADMIN, and legacy ADMIN as "admin-like".
// In future Phase 6 steps, STORE_ADMIN will be restricted to a single store,
// but behavior remains global here.
export function isAdminLike(role?: string | null): boolean {
  if (!role) return false;
  const normalizedRole = role.toUpperCase();
  return (
    normalizedRole === "MASTER_ADMIN" ||
    normalizedRole === "STORE_ADMIN" ||
    normalizedRole === "ADMIN"
  );
}

export function isVendor(role?: string | null): boolean {
  return role === "VENDOR";
}

export function isUser(role?: string | null): boolean {
  return role === "USER";
}

// Check if role can create work orders and requests
export function canCreateWorkOrders(role?: string | null): boolean {
  return isAdminLike(role) || isUser(role);
}

export function canCreateRequests(role?: string | null): boolean {
  return isAdminLike(role) || isUser(role) || isVendor(role);
}



