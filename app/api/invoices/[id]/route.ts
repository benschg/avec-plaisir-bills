import { db } from "@/lib/db";
import { invoices, line_items } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/role";

function toNumbers<T extends Record<string, unknown>>(
  obj: T,
  keys: string[]
): T {
  const result = { ...obj } as Record<string, unknown>;
  for (const key of keys) {
    if (result[key] != null) result[key] = Number(result[key]);
  }
  return result as T;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole("viewer");
  if (denied) return denied;

  try {
    const { id } = await params;

    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: {
        vendors: true,
        customers: true,
        line_items: true,
        payment_info: true,
        additional_expenses: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    // Convert numeric strings to numbers to match previous API shape
    const data = {
      ...toNumbers(invoice, ["subtotal", "tax_amount", "total", "global_margin", "exchange_rate"]),
      line_items: invoice.line_items.map((li) =>
        toNumbers(li, ["quantity", "unit_price", "tax_rate", "line_total"])
      ),
      additional_expenses: invoice.additional_expenses.map((e) =>
        toNumbers(e, ["amount", "amount_original"])
      ),
    };

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("[api/invoices/id]", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole("editor");
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json();

    const allowed = ["invoice_number", "global_margin", "global_mwst", "exchange_rate", "item_final_prices", "item_mwst"] as const;
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0 && !Array.isArray(body.expense_flags)) {
      return NextResponse.json({ success: false, error: "No valid fields to update" }, { status: 400 });
    }

    // Persist expense flags on individual line items
    if (Array.isArray(body.expense_flags)) {
      const items = await db.query.line_items.findMany({
        where: eq(line_items.invoice_id, id),
      });
      for (let i = 0; i < items.length && i < body.expense_flags.length; i++) {
        const flag = !!body.expense_flags[i];
        if (items[i].is_expense !== flag) {
          await db.update(line_items).set({ is_expense: flag }).where(eq(line_items.id, items[i].id));
        }
      }
    }

    // Convert numbers to strings for numeric columns
    if (updates.global_margin != null) updates.global_margin = String(updates.global_margin);
    if (updates.exchange_rate != null) updates.exchange_rate = String(updates.exchange_rate);

    if (Object.keys(updates).length > 0 || Array.isArray(body.expense_flags)) {
      updates.updated_at = new Date();
    }
    await db.update(invoices).set(updates).where(eq(invoices.id, id));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[api/invoices/id]", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole("editor");
  if (denied) return denied;

  try {
    const { id } = await params;

    await db.delete(invoices).where(eq(invoices.id, id));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[api/invoices/id]", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
