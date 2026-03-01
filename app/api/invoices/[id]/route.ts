import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: invoice, error: invoiceErr } = await supabase
      .from("invoices")
      .select(`
        *,
        vendors (*),
        customers (*),
        line_items (*),
        payment_info (*),
        additional_expenses (*)
      `)
      .eq("id", id)
      .single();

    if (invoiceErr) {
      return NextResponse.json({ success: false, error: invoiceErr.message }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: invoice });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
