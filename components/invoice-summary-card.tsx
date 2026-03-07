"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InvoiceSummary } from "@/components/invoice-table";
import { calcMarginPct } from "@/lib/pricing";

function fmt(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`;
}

interface Row {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
  indent?: boolean;
  borderTop?: boolean;
}

function SummaryRow({ label, value, color, bold, indent, borderTop }: Row) {
  return (
    <div
      className={`flex justify-between items-center py-1 gap-4
        ${indent ? "pl-3" : ""}
        ${borderTop ? "border-t mt-0.5 pt-1.5" : ""}
      `}
    >
      <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular-nums whitespace-nowrap ${bold ? "font-bold" : "font-medium"} ${color ?? ""}`}>
        {value}
      </span>
    </div>
  );
}

interface Props {
  summary: InvoiceSummary | null;
}

export function InvoiceSummaryCard({ summary }: Props) {
  if (!summary) return null;

  const {
    currency, needsConversion, rate,
    purchaseSubtotal, purchaseTax, purchaseTotal,
    billExpensesTotal, addlExpCHF,
    adjustedTotalOrigCurrency,
    sellExcl, mwst, sellIncl, finalProfitCHF,
  } = summary;

  const sign = currency;
  const chf = "CHF";
  const hasExpenses = billExpensesTotal > 0 || addlExpCHF > 0;
  const marginPct = calcMarginPct(finalProfitCHF, sellIncl);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Zusammenfassung</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-sm space-y-0">

          {/* Purchase side */}
          <div className="py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Einkaufskosten
          </div>
          <SummaryRow label="Zwischensumme" value={fmt(purchaseSubtotal, sign)} />
          {billExpensesTotal > 0 && (
            <SummaryRow
              label="Kosten (Rechnung)"
              value={fmt(billExpensesTotal, sign)}
              color="text-amber-700 dark:text-amber-400"
              indent
            />
          )}
          {addlExpCHF > 0 && (
            <SummaryRow
              label="Zusatzkosten (CHF)"
              value={fmt(addlExpCHF, chf)}
              color="text-red-700 dark:text-red-400"
              indent
            />
          )}
          <SummaryRow label="Steuer" value={fmt(purchaseTax, sign)} indent />
          <SummaryRow label="Gesamt" value={fmt(purchaseTotal, sign)} bold borderTop />
          {hasExpenses && (
            <SummaryRow
              label={needsConversion ? `Ang. Gesamt (${chf})` : "Ang. Gesamt"}
              value={fmt(needsConversion ? adjustedTotalOrigCurrency * rate : adjustedTotalOrigCurrency, needsConversion ? chf : sign)}
              color="text-orange-600 dark:text-orange-400"
              bold
            />
          )}

          {/* Sell side */}
          <div className="py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 border-t pt-3">
            Verkaufspreis (CHF)
          </div>
          <SummaryRow label="Exkl. MWST" value={fmt(sellExcl, chf)} />
          <SummaryRow label="MWST" value={fmt(mwst, chf)} indent />
          <SummaryRow label="Inkl. MWST" value={fmt(sellIncl, chf)} bold borderTop />

          {/* Profit */}
          <div className="border-t mt-3 pt-2 space-y-0.5">
            <div className="flex justify-between items-center py-1 gap-4">
              <span className="font-semibold">Gewinn</span>
              <span
                className={`font-bold tabular-nums whitespace-nowrap text-lg ${
                  finalProfitCHF >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {fmt(finalProfitCHF, chf)}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5 gap-4">
              <span className="text-muted-foreground text-xs">Marge</span>
              <span
                className={`text-sm tabular-nums font-medium ${
                  marginPct >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {marginPct.toFixed(1)}%
              </span>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
