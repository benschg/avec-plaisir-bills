import { db, additional_expenses } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/role";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const denied = await requireRole("editor");
  if (denied) return denied;

  try {
    const { expenseId } = await params;
    const body = await request.json();
    const { description, amount, amount_original, currency_original } = body;

    if (!description || amount == null) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const [data] = await db
      .update(additional_expenses)
      .set({
        description,
        amount: String(amount),
        currency: "CHF",
        amount_original: amount_original != null && currency_original ? String(amount_original) : null,
        currency_original: amount_original != null && currency_original ? currency_original : null,
      })
      .where(eq(additional_expenses.id, expenseId))
      .returning();

    if (!data) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        amount: Number(data.amount),
        amount_original: data.amount_original != null ? Number(data.amount_original) : null,
      },
    });
  } catch (error: unknown) {
    console.error("[api/expenses]", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const denied = await requireRole("editor");
  if (denied) return denied;

  try {
    const { expenseId } = await params;

    await db
      .delete(additional_expenses)
      .where(eq(additional_expenses.id, expenseId));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[api/expenses]", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
