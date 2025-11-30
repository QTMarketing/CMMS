"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { isAdminLike } from "@/lib/roles";

interface AdminOnlyProps {
  children: ReactNode;
}

export default function AdminOnly({ children }: AdminOnlyProps) {
  const { data: session, status } = useSession();

  // While loading the session, don't render anything to avoid flicker /
  // incorrectly hiding admin-only UI on first paint.
  if (status === "loading") {
    return null;
  }

  const role = (session?.user as any)?.role;
  const isAdmin = isAdminLike(role);

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}


