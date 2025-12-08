export type AppRole = "MASTER_ADMIN" | "STORE_ADMIN" | "ADMIN" | "TECHNICIAN" | "USER";

export function isMasterAdmin(role?: string | null): boolean {
  return role === "MASTER_ADMIN";
}

export function isStoreAdmin(role?: string | null): boolean {
  return role === "STORE_ADMIN";
}

// For now, treat MASTER_ADMIN, STORE_ADMIN, and legacy ADMIN as "admin-like".
// In future Phase 6 steps, STORE_ADMIN will be restricted to a single store,
// but behavior remains global here.
export function isAdminLike(role?: string | null): boolean {
  return (
    role === "MASTER_ADMIN" ||
    role === "STORE_ADMIN" ||
    role === "ADMIN"
  );
}

export function isTechnician(role?: string | null): boolean {
  return role === "TECHNICIAN";
}

export function isUser(role?: string | null): boolean {
  return role === "USER";
}

// Check if role can create work orders and requests
export function canCreateWorkOrders(role?: string | null): boolean {
  return isAdminLike(role) || isUser(role);
}

export function canCreateRequests(role?: string | null): boolean {
  return isAdminLike(role) || isUser(role) || isTechnician(role);
}



