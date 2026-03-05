import { auth, type Role } from "@/auth";
import { NextResponse } from "next/server";

export type { Role };

export const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  editor: 2,
  viewer: 1,
};

export async function getSessionEmail(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email?.toLowerCase() ?? null;
}

export async function getSessionRole(): Promise<Role | null> {
  const session = await auth();
  return session?.user?.role ?? null;
}

export async function requireRole(minRole: Role): Promise<NextResponse | null> {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const role = session.user.role;
  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minRole]) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  return null; // Access granted
}
