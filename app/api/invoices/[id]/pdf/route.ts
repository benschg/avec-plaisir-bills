import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Look up the file_path for this invoice
    const { data: invoice, error: dbErr } = await supabase
      .from("invoices")
      .select("file_path, file_name")
      .eq("id", id)
      .single();

    if (dbErr || !invoice?.file_path) {
      return NextResponse.json(
        { success: false, error: "PDF not found" },
        { status: 404 }
      );
    }

    // Download from Supabase Storage
    const { data, error: dlErr } = await supabase.storage
      .from("invoices")
      .download(invoice.file_path);

    if (dlErr || !data) {
      return NextResponse.json(
        { success: false, error: "Failed to download PDF" },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.file_name}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
