import type { NextAuthOptions } from "next-auth";

// Minimal options used only for getServerSession in App Router.
// The full Credentials + Prisma adapter config lives in
// `app/api/auth/[...nextauth]/route.ts`. We keep this in sync by
// ensuring the same session strategy (JWT) so credentials sign-in
// works without CALLBACK_CREDENTIALS_JWT_ERROR.
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
};

