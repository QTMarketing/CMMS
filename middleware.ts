export { default } from "next-auth/middleware";

// Protect all routes by default, except for:
// - /login (public login page)
// - /workorder-form/* (public QR code work order form)
// - /api/auth/* (NextAuth internal)
// - /api/stores/qr/* (public API to fetch store by QR code)
// - /api/workorders/public (public API to create work order via QR code)
// - /favicon.ico and Next.js static/_next assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js)
     * - api/stores/qr (public QR code API)
     * - api/workorders/public (public work order creation)
     * - workorder-form (public work order form page)
     * - login (login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|api/stores/qr|api/workorders/public|workorder-form|login|_next/static|_next/image|favicon.ico).*)",
  ],
};


