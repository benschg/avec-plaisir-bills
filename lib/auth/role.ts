import { db } from "@/lib/db";
import { app_users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createNeonAuth } from "@neondatabase/auth/next/server";

export type Role = "admin" | "editor" | "viewer";

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  editor: 2,
  viewer: 1,
};

const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});

export async function getUserRole(email: string): Promise<Role | null> {
  const result = await db
    .select({ role: app_users.role })
    .from(app_users)
    .where(eq(app_users.email, email.toLowerCase()))
    .limit(1);

  return (result[0]?.role as Role) ?? null;
}

export async function getSessionEmail(): Promise<string | null> {
  // First try middleware-set header (most reliable)
  const hdrs = await headers();
  const headerEmail = hdrs.get("x-user-email");
  if (headerEmail) return headerEmail;

  // Fallback: use Neon Auth SDK to get session
  const { data: session } = await auth.getSession();
  return session?.user?.email?.toLowerCase() ?? null;
}

export async function getSessionRole(): Promise<Role | null> {
  // First try middleware-set header
  const hdrs = await headers();
  const headerRole = hdrs.get("x-user-role");
  if (headerRole) return headerRole as Role;

  // Fallback
  const email = await getSessionEmail();
  if (!email) return null;
  return getUserRole(email);
}

export async function requireRole(minRole: Role): Promise<NextResponse | null> {
  // Read role from middleware header (set for all matched routes)
  const hdrs = await headers();
  let role = hdrs.get("x-user-role") as Role | null;
  let email = hdrs.get("x-user-email");

  // Fallback: resolve from session if middleware headers are missing
  if (!email || !role) {
    email = await getSessionEmail();
    if (email) {
      role = await getUserRole(email);
    }
  }

  if (!email || !role) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minRole]) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  return null; // Access granted
}
