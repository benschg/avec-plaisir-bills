"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RequireAuth } from "@/components/require-auth";
import type { Invoice, Vendor, Customer } from "@/lib/db/types";

type InvoiceRow = Pick<
  Invoice,
  "id" | "file_name" | "invoice_number" | "invoice_date" | "currency" | "created_at"
> & {
  total: number;
  vendors: Pick<Vendor, "name">;
  customers: Pick<Customer, "name">;
};

export default function InvoicesPage() {
  return (
    <RequireAuth minRole="viewer">
      <InvoicesContent />
    </RequireAuth>
  );
}

function InvoicesContent() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((result) => {
        if (result.success) setInvoices(result.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return invoices;
    return invoices.filter(
      (inv) =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.vendors?.name?.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const totalSum = filtered.reduce((sum, inv) => sum + (inv.total ?? 0), 0);
  const currencies = [...new Set(filtered.map((inv) => inv.currency))];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rechnungen</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length}{filtered.length !== invoices.length ? ` / ${invoices.length}` : ""} Rechnung{filtered.length !== 1 && "en"}
            {filtered.length > 0 && currencies.length === 1 && (
              <> &middot; Gesamt: {totalSum.toFixed(2)} {currencies[0]}</>
            )}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Neue Extraktion</Link>
        </Button>
      </div>

      <Separator />

      {invoices.length > 0 && (
        <Input
          placeholder="Suche nach Rechnung Nr. oder Lieferant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Laden...</p>
      ) : filtered.length === 0 && !search ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted-foreground">Noch keine Rechnungen gespeichert.</p>
          <Button asChild>
            <Link href="/">Erste Rechnung extrahieren</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rechnung Nr.</TableHead>
                <TableHead>Lieferant</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Gesamt</TableHead>
                <TableHead className="text-right">Gespeichert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                >
                  <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.vendors?.name}</TableCell>
                  <TableCell>{inv.customers?.name}</TableCell>
                  <TableCell>{inv.invoice_date}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">
                      {inv.total?.toFixed(2)} {inv.currency}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {new Date(inv.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
