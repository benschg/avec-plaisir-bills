"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InvoiceData } from "@/lib/types";

interface InvoiceDetailsProps {
  data: InvoiceData;
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export function InvoiceDetails({ data }: InvoiceDetailsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print-break-avoid">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rechnungsinfo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <InfoRow label="Rechnung Nr." value={data.invoice_number} />
          <InfoRow label="Datum" value={data.invoice_date} />
          <InfoRow label="Fälligkeitsdatum" value={data.due_date} />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Währung</span>
            <Badge variant="secondary">{data.currency}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lieferant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <InfoRow label="Name" value={data.vendor.name} />
          <InfoRow label="Adresse" value={data.vendor.address} />
          <InfoRow label="Steuernummer" value={data.vendor.tax_id} />
          <InfoRow label="E-Mail" value={data.vendor.email} />
          <InfoRow label="Telefon" value={data.vendor.phone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kunde</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <InfoRow label="Name" value={data.customer.name} />
          <InfoRow label="Adresse" value={data.customer.address} />
          <InfoRow label="Steuernummer" value={data.customer.tax_id} />
        </CardContent>
      </Card>

      {data.payment_info && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Zahlungsinformationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow label="IBAN" value={data.payment_info.iban} />
            <InfoRow label="SWIFT/BIC" value={data.payment_info.swift} />
            <InfoRow label="Bank" value={data.payment_info.bank_name} />
            <InfoRow label="Zahlungsbedingungen" value={data.payment_info.terms} />
          </CardContent>
        </Card>
      )}

      {data.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notizen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{data.notes}</p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
