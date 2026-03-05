import { NextResponse } from "next/server";
import { getSessionEmail, getUserRole } from "@/lib/auth/role";

export async function GET() {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ email: null, role: null });
  }

  const role = await getUserRole(email);
  return NextResponse.json({ email, role });
}
