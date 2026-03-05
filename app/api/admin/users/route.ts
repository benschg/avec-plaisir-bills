import { db } from "@/lib/db";
import { app_users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/role";

export async function GET() {
  const denied = await requireRole("admin");
  if (denied) return denied;

  const users = await db
    .select()
    .from(app_users)
    .orderBy(app_users.created_at);

  return NextResponse.json({ success: true, data: users });
}

export async function POST(request: NextRequest) {
  const denied = await requireRole("admin");
  if (denied) return denied;

  const { email, role } = await request.json();

  if (!email || !role || !["admin", "editor", "viewer"].includes(role)) {
    return NextResponse.json(
      { success: false, error: "Ungültige E-Mail oder Rolle" },
      { status: 400 }
    );
  }

  const [user] = await db
    .insert(app_users)
    .values({ email: email.toLowerCase(), role })
    .onConflictDoUpdate({
      target: app_users.email,
      set: { role },
    })
    .returning();

  return NextResponse.json({ success: true, data: user });
}

export async function DELETE(request: NextRequest) {
  const denied = await requireRole("admin");
  if (denied) return denied;

  const { email } = await request.json();

  if (!email) {
    return NextResponse.json(
      { success: false, error: "E-Mail erforderlich" },
      { status: 400 }
    );
  }

  await db.delete(app_users).where(eq(app_users.email, email.toLowerCase()));

  return NextResponse.json({ success: true });
}
