export { default } from "next-auth/middleware";

// Protect all routes by default, except for:
// - /login (public login page)
// - /api/auth/* (NextAuth internal)
// - /favicon.ico and Next.js static/_next assets
export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};


