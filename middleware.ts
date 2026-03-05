import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { neon } from "@neondatabase/serverless";
import { jwtVerify } from "jose";

export const runtime = "nodejs";

const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});

const authMiddleware = auth.middleware({
  loginUrl: "/auth/sign-in",
});

const SESSION_DATA_COOKIE = "__Secure-neon-auth.local.session_data";

/**
 * Read the user email from the signed session-data cookie.
 * Returns null if the cookie is missing, expired, or invalid.
 */
async function getEmailFromRequest(request: NextRequest): Promise<string | null> {
  const cookieValue = request.cookies.get(SESSION_DATA_COOKIE)?.value;
  if (!cookieValue) return null;

  try {
    const secret = new TextEncoder().encode(process.env.NEON_AUTH_COOKIE_SECRET!);
    const { payload } = await jwtVerify(cookieValue, secret, { algorithms: ["HS256"] });

    const email =
      (payload as { user?: { email?: string } }).user?.email?.toLowerCase() ?? null;
    return email;
  } catch {
    return null;
  }
}

export default async function middleware(request: NextRequest) {
  // Run Neon Auth middleware first (checks authentication)
  const response = await authMiddleware(request);

  // If redirected to sign-in: return JSON 401 for API routes, HTML redirect otherwise
  if (response && (response.status === 302 || response.status === 307)) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }
    return response;
  }

  // Read email from the session-data cookie (already validated by authMiddleware)
  const email = await getEmailFromRequest(request);

  if (email) {
    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql`
      SELECT role FROM app_users WHERE email = ${email} LIMIT 1
    `;

    if (result.length === 0) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Benutzer nicht autorisiert" },
          { status: 403 }
        );
      }
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

  return response;
}

export const config = {
  matcher: [
    "/((?!auth|api/auth|unauthorized|_next/static|_next/image|favicon.ico|icon.png).*)",
  ],
};
