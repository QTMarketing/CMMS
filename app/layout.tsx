import "../styles/globals.css";
import React from "react";
import { AppShell } from "../components/layout/AppShell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}


