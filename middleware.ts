import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /auth/* (sign-in/sign-up pages)
     * - /api/auth/* (auth API endpoints)
     * - /_next/* (Next.js internals)
     * - static files
     */
    "/((?!auth|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
