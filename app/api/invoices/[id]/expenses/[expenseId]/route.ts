import { db, additional_expenses } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { expenseId } = await params;
    const body = await request.json();
    const { description, amount, currency } = body;

    if (!description || amount == null || !currency) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const [data] = await db
      .update(additional_expenses)
      .set({ description, amount: String(amount), currency })
      .where(eq(additional_expenses.id, expenseId))
      .returning();

    if (!data) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { ...data, amount: Number(data.amount) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { expenseId } = await params;

    await db
      .delete(additional_expenses)
      .where(eq(additional_expenses.id, expenseId));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
