import { db } from "@/lib/db";
import { app_users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export type Role = "admin" | "editor" | "viewer";

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  editor: 2,
  viewer: 1,
};

export async function getUserRole(email: string): Promise<Role | null> {
  const result = await db
    .select({ role: app_users.role })
    .from(app_users)
    .where(eq(app_users.email, email.toLowerCase()))
    .limit(1);

  return (result[0]?.role as Role) ?? null;
}

export async function getSessionEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  const res = await fetch(
    `${process.env.NEON_AUTH_BASE_URL}/api/auth/get-session`,
    {
      headers: {
        Cookie: allCookies.map((c) => `${c.name}=${c.value}`).join("; "),
      },
      cache: "no-store",
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data?.user?.email?.toLowerCase() ?? null;
}

export async function getSessionRole(): Promise<Role | null> {
  const email = await getSessionEmail();
  if (!email) return null;
  return getUserRole(email);
}

export async function requireRole(minRole: Role): Promise<NextResponse | null> {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const role = await getUserRole(email);
  if (!role) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minRole]) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  return null; // Access granted
}
