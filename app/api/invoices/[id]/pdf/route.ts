import { db, invoices } from "@/lib/db";
import { downloadFile } from "@/lib/storage";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/role";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole("viewer");
  if (denied) return denied;

  try {
    const { id } = await params;
    const download = request.nextUrl.searchParams.has("download");

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
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${invoice.file_name}"`,
      },
    });
  } catch (error: unknown) {
    console.error("[api/invoices/id/pdf]", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
