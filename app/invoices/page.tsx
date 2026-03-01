"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Tables } from "@/lib/database.types";

type InvoiceRow = Pick<
  Tables<"invoices">,
  "id" | "file_name" | "invoice_number" | "invoice_date" | "currency" | "total" | "created_at"
> & {
  vendors: Pick<Tables<"vendors">, "name">;
  customers: Pick<Tables<"customers">, "name">;
};

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((result) => {
        if (result.success) setInvoices(result.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalSum = invoices.reduce((sum, inv) => sum + (inv.total ?? 0), 0);
  const currencies = [...new Set(invoices.map((inv) => inv.currency))];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rechnungen</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {invoices.length} gespeicherte Rechnung{invoices.length !== 1 && "en"}
            {invoices.length > 0 && currencies.length === 1 && (
              <> &middot; Gesamt: {totalSum.toFixed(2)} {currencies[0]}</>
            )}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Neue Extraktion</Link>
        </Button>
      </div>

      <Separator />

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Laden...</p>
      ) : invoices.length === 0 ? (
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
              {invoices.map((inv) => (
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
