import { db, vendors, customers, invoices, line_items, payment_info } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { eq, and, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/role";

// Save an extracted invoice (normalized across tables)
export async function POST(request: NextRequest) {
  const denied = await requireRole("editor");
  if (denied) return denied;

  try {
    const { fileName, data, fileBase64 } = await request.json();

    // 1. Upsert vendor (reuse existing by name+address)
    const [existingVendor] = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(and(eq(vendors.name, data.vendor.name), eq(vendors.address, data.vendor.address)))
      .limit(1);

    let vendorId: string;
    if (existingVendor) {
      vendorId = existingVendor.id;
    } else {
      const [vendor] = await db
        .insert(vendors)
        .values({
          name: data.vendor.name,
          address: data.vendor.address,
          tax_id: data.vendor.tax_id || null,
          email: data.vendor.email || null,
          phone: data.vendor.phone || null,
        })
        .returning({ id: vendors.id });
      vendorId = vendor.id;
    }

    // 2. Upsert customer (reuse existing by name+address)
    const [existingCustomer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.name, data.customer.name), eq(customers.address, data.customer.address)))
      .limit(1);

    let customerId: string;
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const [customer] = await db
        .insert(customers)
        .values({
          name: data.customer.name,
          address: data.customer.address,
          tax_id: data.customer.tax_id || null,
        })
        .returning({ id: customers.id });
      customerId = customer.id;
    }

    // 3. Insert invoice
    const [invoice] = await db
      .insert(invoices)
      .values({
        file_name: fileName,
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date || null,
        due_date: data.due_date || null,
        currency: data.currency,
        vendor_id: vendorId,
        customer_id: customerId,
        subtotal: String(data.subtotal),
        tax_amount: String(data.tax_amount),
        total: String(data.total),
        notes: data.notes || null,
        raw_extraction: data,
      })
      .returning({ id: invoices.id });

    // 4. Upload original PDF to Vercel Blob
    if (fileBase64) {
      const filePath = `${invoice.id}/${fileName}`;
      const buffer = Buffer.from(fileBase64, "base64");

      try {
        const blobUrl = await uploadFile(filePath, buffer);
        await db
          .update(invoices)
          .set({ file_path: blobUrl })
          .where(eq(invoices.id, invoice.id));
      } catch (uploadErr) {
        console.error("[invoices] PDF upload failed:", uploadErr);
      }
    }

    // 5. Insert line items
    if (data.line_items && data.line_items.length > 0) {
      const rows = data.line_items.map(
        (
          item: {
            position?: number;
            description: string;
            quantity: number;
            unit_price: number;
            tax_rate?: number;
            line_total: number;
            image_search_query?: string;
            is_expense?: boolean;
          },
          index: number
        ) => ({
          invoice_id: invoice.id,
          position: item.position ?? index + 1,
          description: item.description,
          quantity: String(item.quantity),
          unit_price: String(item.unit_price),
          tax_rate: item.tax_rate != null ? String(item.tax_rate) : null,
          line_total: String(item.line_total),
          image_search_query: item.image_search_query ?? null,
          is_expense: item.is_expense ?? false,
        })
      );

      await db.insert(line_items).values(rows);
    }

    // 6. Insert payment info (if present)
    if (data.payment_info) {
      const pi = data.payment_info;
      if (pi.iban || pi.swift || pi.bank_name || pi.terms) {
        await db.insert(payment_info).values({
          invoice_id: invoice.id,
          iban: pi.iban || null,
          swift: pi.swift || null,
          bank_name: pi.bank_name || null,
          terms: pi.terms || null,
        });
      }
    }

    return NextResponse.json({ success: true, data: { id: invoice.id } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// List saved invoices with vendor name via join
export async function GET() {
  try {
    const data = await db.query.invoices.findMany({
      columns: {
        id: true,
        file_name: true,
        invoice_number: true,
        invoice_date: true,
        currency: true,
        total: true,
        created_at: true,
      },
      with: {
        vendors: { columns: { name: true } },
        customers: { columns: { name: true } },
      },
      orderBy: [desc(invoices.created_at)],
    });

    // Convert numeric total to number
    const serialized = data.map((row) => ({
      ...row,
      total: Number(row.total),
    }));

    return NextResponse.json({ success: true, data: serialized });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
