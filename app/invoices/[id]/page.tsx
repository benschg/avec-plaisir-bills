"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { InvoiceDetails } from "@/components/invoice-details";
import { InvoiceTable } from "@/components/invoice-table";
import type { InvoiceSummary } from "@/components/invoice-table";
import { InvoiceSummaryCard } from "@/components/invoice-summary-card";
import { AdditionalExpensesCard } from "@/components/additional-expenses-card";
import type { AdditionalExpense } from "@/components/additional-expenses-card";
import type { InvoiceData } from "@/lib/types";
import type { Tables } from "@/lib/database.types";

type FullInvoice = Tables<"invoices"> & {
  vendors: Tables<"vendors">;
  customers: Tables<"customers">;
  line_items: Tables<"line_items">[];
  payment_info: Tables<"payment_info"> | null;
  additional_expenses: Tables<"additional_expenses">[];
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
      is_expense: li.is_expense ?? false,
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
  const [additionalExpenses, setAdditionalExpenses] = useState<AdditionalExpense[]>([]);
  const [expenseFlags, setExpenseFlags] = useState<boolean[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          setInvoice(result.data);
          setExpenseFlags(result.data.line_items.map((li: Tables<"line_items">) => li.is_expense ?? false));
          setAdditionalExpenses(
            (result.data.additional_expenses ?? []).map((e: Tables<"additional_expenses">) => ({
              id: e.id,
              description: e.description,
              amount: e.amount,
              currency: e.currency,
            }))
          );
        } else {
          setError(result.error || "Invoice not found");
        }
      })
      .catch(() => setError("Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleAddExpense = useCallback(
    async (expense: AdditionalExpense) => {
      const res = await fetch(`/api/invoices/${params.id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense),
      });
      const result = await res.json();
      if (result.success) {
        setAdditionalExpenses((prev) => [...prev, { ...expense, id: result.data.id }]);
      }
    },
    [params.id]
  );

  const handleUpdateExpense = useCallback(
    async (index: number, expense: AdditionalExpense) => {
      const existing = additionalExpenses[index];
      if (!existing?.id) return;
      const res = await fetch(`/api/invoices/${params.id}/expenses/${existing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense),
      });
      const result = await res.json();
      if (result.success) {
        setAdditionalExpenses((prev) =>
          prev.map((e, i) => (i === index ? { ...expense, id: existing.id } : e))
        );
      }
    },
    [params.id, additionalExpenses]
  );

  const handleRemoveExpense = useCallback(
    async (index: number) => {
      const existing = additionalExpenses[index];
      if (!existing?.id) return;
      const res = await fetch(`/api/invoices/${params.id}/expenses/${existing.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (result.success) {
        setAdditionalExpenses((prev) => prev.filter((_, i) => i !== index));
      }
    },
    [params.id, additionalExpenses]
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground text-center py-16">Loading...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
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
  const lineExpenses = data.line_items
    .filter((_, i) => expenseFlags[i])
    .map((li) => ({ description: li.description, amount: li.line_total, currency: data.currency }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <AdditionalExpensesCard
          lineExpenses={lineExpenses}
          expenses={additionalExpenses}
          onAddExpense={handleAddExpense}
          onUpdateExpense={handleUpdateExpense}
          onRemoveExpense={handleRemoveExpense}
          invoiceCurrency={data.currency}
        />
        <InvoiceSummaryCard summary={summary} />
      </div>

      <InvoiceTable
        data={data}
        additionalExpenses={additionalExpenses}
        expenseFlags={expenseFlags}
        onExpenseToggle={(i) => setExpenseFlags((prev) => { const next = [...prev]; next[i] = !next[i]; return next; })}
        onSummaryChange={setSummary}
      />
    </div>
  );
}
