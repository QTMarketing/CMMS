import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Single source of truth for NextAuth configuration.
// Used both by the auth route handler and by getServerSession.
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },

  adapter: PrismaAdapter(prisma),

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Look up user in Prisma
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) return null;

        // Only allow known, supported roles to sign in.
        const allowedRoles = ["MASTER_ADMIN", "STORE_ADMIN", "TECHNICIAN", "ADMIN"];
        if (!allowedRoles.includes(user.role)) {
          return null;
        }

        // This object is what becomes `user` in jwt() callback
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          technicianId: user.technicianId,
          storeId: user.storeId,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // When user logs in, copy extra fields from `user` into `token`
      if (user) {
        token.role = (user as any).role;
        token.technicianId = (user as any).technicianId;
        (token as any).storeId = (user as any).storeId ?? null;
        token.sub = (user as any).id ?? token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose extra fields on session.user
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).technicianId = token.technicianId;
        (session.user as any).storeId = (token as any).storeId ?? null;
      }
      return session;
    },
  },
};
