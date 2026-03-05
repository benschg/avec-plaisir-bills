import { db, additional_expenses } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/role";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole("editor");
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json();
    const { description, amount, currency } = body;

    if (!description || amount == null || !currency) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const [data] = await db
      .insert(additional_expenses)
      .values({
        invoice_id: id,
        description,
        amount: String(amount),
        currency,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: { ...data, amount: Number(data.amount) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
