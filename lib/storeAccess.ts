import type { AppRole } from "./roles";

export function canSeeAllStores(role?: string | null): boolean {
  // For now, only MASTER_ADMIN is truly global.
  return role === "MASTER_ADMIN";
}

export function getScopedStoreId(
  role?: string | null,
  userStoreId?: string | null
): string | null {
  // MASTER_ADMIN: no store restriction
  if (role === "MASTER_ADMIN") return null;

  // STORE_ADMIN / TECHNICIAN (and any future store-scoped roles)
  return userStoreId ?? null;
}


