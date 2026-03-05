import { NextResponse } from "next/server";
import { getSessionEmail, getSessionRole } from "@/lib/auth/role";

export async function GET() {
  const email = await getSessionEmail();
  const role = await getSessionRole();

  return NextResponse.json({ email, role });
}
