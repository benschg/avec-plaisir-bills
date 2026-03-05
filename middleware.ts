import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { neon } from "@neondatabase/serverless";

const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});

const authMiddleware = auth.middleware({
  loginUrl: "/auth/sign-in",
});

export default async function middleware(request: NextRequest) {
  // Run Neon Auth middleware first (checks authentication)
  const response = await authMiddleware(request);

  // If redirected to sign-in, return as-is
  if (response && (response.status === 302 || response.status === 307)) {
    return response;
  }

  // Get session to check user role
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionRes = await fetch(
    `${process.env.NEON_AUTH_BASE_URL}/api/auth/get-session`,
    {
      headers: { Cookie: cookieHeader },
    }
  );

  if (sessionRes.ok) {
    const data = await sessionRes.json();
    const email = data?.user?.email?.toLowerCase();

    if (email) {
      const sql = neon(process.env.DATABASE_URL!);
      const result = await sql`
        SELECT role FROM app_users WHERE email = ${email} LIMIT 1
      `;

      if (result.length === 0) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }

      // Forward role + email to downstream handlers via request headers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-role", result[0].role);
      requestHeaders.set("x-user-email", email);

      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!auth|api/auth|unauthorized|_next/static|_next/image|favicon.ico|icon.png).*)",
  ],
};
