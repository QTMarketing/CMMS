"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function CompletedWorkOrdersPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  useEffect(() => {
    // Redirect to main work orders page with filter
    if (sessionStatus !== "loading") {
      router.replace("/workorders?filter=completed");
    }
  }, [router, sessionStatus]);

  return null;
}

