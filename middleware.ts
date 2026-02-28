import nextAuthMiddleware from "next-auth/middleware";

// Protect all routes by default, except for:
// - /login (public login page)
// - /workorder-form/* (public QR code work order form)
// - /api/auth/* (NextAuth internal)
// - /api/stores/qr/* (public API to fetch store by QR code)
// - /api/workorders/public (public API to create work order via QR code)
// - /api/upload/public (public file upload for QR work order form)
// - /api/test-email (email config test – no auth, for debugging)
// - /favicon.ico and Next.js static/_next assets
export default nextAuthMiddleware;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js)
     * - api/stores/qr (public QR code API)
     * - api/workorders/public (public work order creation)
     * - api/workorders/shared (public read-only shared work order)
     * - api/test-email (email test endpoint)
     * - workorder-form (public work order form page)
     * - share/workorder (public shared work order page)
     * - login (login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|api/stores/qr|api/workorders/public|api/upload/public|api/workorders/shared|api/test-email|workorder-form|share/workorder|login|_next/static|_next/image|favicon.ico).*)",
  ],
};


