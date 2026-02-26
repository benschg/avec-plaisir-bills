"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { InvoiceDetails } from "@/components/invoice-details";
import { InvoiceTable } from "@/components/invoice-table";
import type { InvoiceData } from "@/lib/types";
import type { Tables } from "@/lib/database.types";

type FullInvoice = Tables<"invoices"> & {
  vendors: Tables<"vendors">;
  customers: Tables<"customers">;
  line_items: Tables<"line_items">[];
  payment_info: Tables<"payment_info"> | null;
};

function toInvoiceData(inv: FullInvoice): InvoiceData {
  return {
    vendor: {
      name: inv.vendors.name,
      address: inv.vendors.address,
      tax_id: inv.vendors.tax_id ?? undefined,
      email: inv.vendors.email ?? undefined,
      phone: inv.vendors.phone ?? undefined,
    },
    customer: {
      name: inv.customers.name,
      address: inv.customers.address,
      tax_id: inv.customers.tax_id ?? undefined,
    },
    invoice_number: inv.invoice_number,
    invoice_date: inv.invoice_date ?? "",
    due_date: inv.due_date ?? undefined,
    currency: inv.currency,
    line_items: inv.line_items.map((li) => ({
      position: li.position ?? undefined,
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
      tax_rate: li.tax_rate ?? undefined,
      line_total: li.line_total,
      image_search_query: li.image_search_query ?? undefined,
    })),
    subtotal: inv.subtotal,
    tax_amount: inv.tax_amount,
    total: inv.total,
    payment_info: inv.payment_info
      ? {
          iban: inv.payment_info.iban ?? undefined,
          swift: inv.payment_info.swift ?? undefined,
          bank_name: inv.payment_info.bank_name ?? undefined,
          terms: inv.payment_info.terms ?? undefined,
        }
      : undefined,
    notes: inv.notes ?? undefined,
  };
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<FullInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          setInvoice(result.data);
        } else {
          setError(result.error || "Invoice not found");
        }
      })
      .catch(() => setError("Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground text-center py-16">Loading...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{error || "Invoice not found"}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href="/invoices">Back to Invoices</Link>
        </Button>
      </div>
    );
  }

  const data = toInvoiceData(invoice);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Invoice {invoice.invoice_number}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {invoice.file_name} &middot; Saved {new Date(invoice.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {invoice.file_path && (
            <Button asChild variant="outline">
              <a href={`/api/invoices/${params.id}/pdf`} target="_blank" rel="noopener noreferrer">
                View PDF
              </a>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/invoices">Back to Invoices</Link>
          </Button>
        </div>
      </div>

      <Separator />

      <InvoiceDetails data={data} />
      <InvoiceTable data={data} />
    </div>
  );
}
