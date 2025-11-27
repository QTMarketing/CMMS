import "../styles/globals.css";
import React from "react";
import { AppShell } from "../components/layout/AppShell";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppSessionProvider from "@/components/SessionProvider";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { email?: string | null; role?: string; technicianId?: string | null }
    | undefined;

  return (
    <html lang="en">
      <body className="bg-gray-100">
        <AppSessionProvider session={session}>
          {/* Pass minimal user info into the shell so it can show role/email and logout */}
          <AppShell user={user}>{children}</AppShell>
        </AppSessionProvider>
      </body>
    </html>
  );
}

