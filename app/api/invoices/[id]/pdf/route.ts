import { db, invoices } from "@/lib/db";
import { downloadFile } from "@/lib/storage";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [invoice] = await db
      .select({ file_path: invoices.file_path, file_name: invoices.file_name })
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    if (!invoice?.file_path) {
      return NextResponse.json(
        { success: false, error: "PDF not found" },
        { status: 404 }
      );
    }

    const buffer = await downloadFile(invoice.file_path);

    return new NextResponse(new Uint8Array(buffer), {
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
