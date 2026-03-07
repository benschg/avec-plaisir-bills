"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { InvoiceDetails } from "@/components/invoice-details";
import { InvoiceTable } from "@/components/invoice-table";
import type { InvoiceSummary, CalcSettings } from "@/components/invoice-table";
import { InvoiceSummaryCard } from "@/components/invoice-summary-card";
import { AdditionalExpensesCard } from "@/components/additional-expenses-card";
import type { AdditionalExpense } from "@/components/additional-expenses-card";
import type { InvoiceData } from "@/lib/types";
import { RequireAuth } from "@/components/require-auth";
import { Trash2, Printer } from "lucide-react";
import type {
  InvoiceRow,
  LineItemRow,
  AdditionalExpenseRow,
  Vendor,
  Customer,
  PaymentInfo,
} from "@/lib/db/types";

type FullInvoice = InvoiceRow & {
  vendors: Vendor;
  customers: Customer;
  line_items: LineItemRow[];
  payment_info: PaymentInfo | null;
  additional_expenses: AdditionalExpenseRow[];
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
  return (
    <RequireAuth minRole="viewer">
      <InvoiceDetailContent />
    </RequireAuth>
  );
}

function InvoiceDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<FullInvoice | null>(null);
  const [additionalExpenses, setAdditionalExpenses] = useState<AdditionalExpense[]>([]);
  const [expenseFlags, setExpenseFlags] = useState<boolean[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          setInvoice(result.data);
          setExpenseFlags(result.data.line_items.map((li: LineItemRow) => li.is_expense ?? false));
          setAdditionalExpenses(
            (result.data.additional_expenses ?? []).map((e: AdditionalExpenseRow) => ({
              id: e.id,
              description: e.description,
              amount: e.amount,
              currency: e.currency,
              ...(e.amount_original != null && e.currency_original
                ? { amount_original: e.amount_original, currency_original: e.currency_original }
                : {}),
            }))
          );
        } else {
          setError(result.error || "Rechnung nicht gefunden");
        }
      })
      .catch(() => setError("Rechnung konnte nicht geladen werden"))
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

  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSettingsChange = useCallback(
    (settings: CalcSettings) => {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        fetch(`/api/invoices/${params.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            global_margin: settings.globalMargin,
            global_mwst: settings.globalMwst,
            exchange_rate: settings.exchangeRate,
            item_final_prices: settings.itemFinalPrices,
            item_mwst: settings.itemMwst,
          }),
        });
      }, 500);
    },
    [params.id]
  );

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${params.id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        router.push("/invoices");
      } else {
        setError(result.error || "Rechnung konnte nicht gelöscht werden");
        setDeleteOpen(false);
      }
    } catch {
      setError("Rechnung konnte nicht gelöscht werden");
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground text-center py-16">Laden...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{error || "Rechnung nicht gefunden"}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href="/invoices">Zurück zu Rechnungen</Link>
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
          {editingTitle ? (
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                const trimmed = titleDraft.trim();
                if (trimmed && trimmed !== invoice.invoice_number) {
                  fetch(`/api/invoices/${params.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ invoice_number: trimmed }),
                  }).then(() => setInvoice((prev) => prev ? { ...prev, invoice_number: trimmed } : prev));
                }
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              className="text-2xl font-bold tracking-tight h-auto py-0 px-1 -ml-1 border-none shadow-none focus-visible:ring-1"
            />
          ) : (
            <h1
              className="text-2xl font-bold tracking-tight cursor-pointer hover:text-muted-foreground transition-colors"
              onClick={() => { setTitleDraft(invoice.invoice_number); setEditingTitle(true); }}
              title="Klicken zum Bearbeiten"
            >
              Rechnung {invoice.invoice_number}
            </h1>
          )}
          <p className="text-muted-foreground text-sm mt-1">
            {invoice.file_name} &middot; Gespeichert {new Date(invoice.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Button variant="outline" size="icon" onClick={() => window.print()} title="Drucken">
            <Printer className="h-4 w-4" />
          </Button>
          {invoice.file_path && (
            <Button asChild variant="outline">
              <a href={`/api/invoices/${params.id}/pdf`} target="_blank" rel="noopener noreferrer">
                PDF ansehen
              </a>
            </Button>
          )}
          <Button variant="destructive" size="icon" onClick={() => setDeleteOpen(true)} title="Rechnung löschen">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button asChild variant="outline">
            <Link href="/invoices">Zurück zu Rechnungen</Link>
          </Button>
        </div>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Rechnung löschen</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Rechnung <span className="font-medium text-foreground">{invoice.invoice_number}</span> und alle zugehörigen Daten werden unwiderruflich gelöscht.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Wird gelöscht..." : "Endgültig löschen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      <InvoiceDetails data={data} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start print-two-col">
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
        initialSettings={{
          globalMargin: invoice.global_margin ?? 100,
          globalMwst: invoice.global_mwst ?? "8.1",
          exchangeRate: invoice.exchange_rate ?? 1,
          itemFinalPrices: (invoice.item_final_prices as Record<number, number | null>) ?? {},
          itemMwst: (invoice.item_mwst as Record<number, string | null>) ?? {},
        }}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}
