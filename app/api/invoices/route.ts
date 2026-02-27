import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import type { TablesInsert } from "@/lib/database.types";

// Save an extracted invoice (normalized across tables)
export async function POST(request: NextRequest) {
  try {
    const { fileName, data, fileBase64 } = await request.json();

    // 1. Upsert vendor (reuse existing by name+address)
    const { data: existingVendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("name", data.vendor.name)
      .eq("address", data.vendor.address)
      .maybeSingle();

    let vendorId: string;
    if (existingVendor) {
      vendorId = existingVendor.id;
    } else {
      const vendorRow: TablesInsert<"vendors"> = {
        name: data.vendor.name,
        address: data.vendor.address,
        tax_id: data.vendor.tax_id || null,
        email: data.vendor.email || null,
        phone: data.vendor.phone || null,
      };
      const { data: vendor, error: vendorErr } = await supabase
        .from("vendors")
        .insert(vendorRow)
        .select("id")
        .single();
      if (vendorErr) {
        return NextResponse.json({ success: false, error: `Vendor: ${vendorErr.message}` }, { status: 500 });
      }
      vendorId = vendor.id;
    }

    // 2. Upsert customer (reuse existing by name+address)
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("name", data.customer.name)
      .eq("address", data.customer.address)
      .maybeSingle();

    let customerId: string;
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const customerRow: TablesInsert<"customers"> = {
        name: data.customer.name,
        address: data.customer.address,
        tax_id: data.customer.tax_id || null,
      };
      const { data: customer, error: customerErr } = await supabase
        .from("customers")
        .insert(customerRow)
        .select("id")
        .single();
      if (customerErr) {
        return NextResponse.json({ success: false, error: `Customer: ${customerErr.message}` }, { status: 500 });
      }
      customerId = customer.id;
    }

    // 3. Insert invoice
    const invoiceRow: TablesInsert<"invoices"> = {
      file_name: fileName,
      invoice_number: data.invoice_number,
      invoice_date: data.invoice_date || null,
      due_date: data.due_date || null,
      currency: data.currency,
      vendor_id: vendorId,
      customer_id: customerId,
      subtotal: data.subtotal,
      tax_amount: data.tax_amount,
      total: data.total,
      notes: data.notes || null,
      raw_extraction: data,
    };

    const { data: invoice, error: invoiceErr } = await supabase
      .from("invoices")
      .insert(invoiceRow)
      .select("id")
      .single();

    if (invoiceErr) {
      return NextResponse.json({ success: false, error: `Invoice: ${invoiceErr.message}` }, { status: 500 });
    }

    // 4. Upload original PDF to Supabase Storage
    if (fileBase64) {
      const filePath = `${invoice.id}/${fileName}`;
      const buffer = Buffer.from(fileBase64, "base64");

      const { error: uploadErr } = await supabase.storage
        .from("invoices")
        .upload(filePath, buffer, { contentType: "application/pdf", upsert: false });

      if (!uploadErr) {
        await supabase
          .from("invoices")
          .update({ file_path: filePath })
          .eq("id", invoice.id);
      }
    }

    // 5. Insert line items
    if (data.line_items && data.line_items.length > 0) {
      const lineItems: TablesInsert<"line_items">[] = data.line_items.map(
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
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate ?? null,
          line_total: item.line_total,
          image_search_query: item.image_search_query ?? null,
          is_expense: item.is_expense ?? false,
        })
      );

      const { error: lineErr } = await supabase.from("line_items").insert(lineItems);

      if (lineErr) {
        return NextResponse.json({ success: false, error: `Line items: ${lineErr.message}` }, { status: 500 });
      }
    }

    // 6. Insert payment info (if present)
    if (data.payment_info) {
      const pi = data.payment_info;
      if (pi.iban || pi.swift || pi.bank_name || pi.terms) {
        const paymentRow: TablesInsert<"payment_info"> = {
          invoice_id: invoice.id,
          iban: pi.iban || null,
          swift: pi.swift || null,
          bank_name: pi.bank_name || null,
          terms: pi.terms || null,
        };

        const { error: payErr } = await supabase.from("payment_info").insert(paymentRow);

        if (payErr) {
          return NextResponse.json({ success: false, error: `Payment info: ${payErr.message}` }, { status: 500 });
        }
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
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        id,
        file_name,
        invoice_number,
        invoice_date,
        currency,
        total,
        created_at,
        vendors ( name ),
        customers ( name )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
