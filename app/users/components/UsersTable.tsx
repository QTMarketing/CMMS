import { prisma } from "@/lib/prisma";
import UsersTableClient from "./UsersTableClient";

export const dynamic = "force-dynamic";

export default async function UsersTable() {
  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
    include: {
      vendor: true,
    },
  });

  const serializableUsers = users.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    vendor: u.vendor
      ? {
          id: u.vendor.id,
          name: u.vendor.name,
        }
      : null,
  }));

  return <UsersTableClient initialUsers={serializableUsers} />;
}


