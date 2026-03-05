import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
  const hdrs = await headers();
  const email = hdrs.get("x-user-email");
  const role = hdrs.get("x-user-role");

  return NextResponse.json({ email, role });
}
