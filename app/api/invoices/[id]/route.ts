import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
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
      ...toNumbers(invoice, ["subtotal", "tax_amount", "total"]),
      line_items: invoice.line_items.map((li) =>
        toNumbers(li, ["quantity", "unit_price", "tax_rate", "line_total"])
      ),
      additional_expenses: invoice.additional_expenses.map((e) =>
        toNumbers(e, ["amount", "amount_original"])
      ),
    };

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
