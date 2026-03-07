"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvoiceData } from "@/lib/types";
import {
  MWST_RATES,
  DEFAULT_MWST,
  calcLineItem,
  calcInvoiceTotals,
  calcExpenseDistribution,
  calcMarginFromFinalPrice,
  calcColumnValues,
  calcTotalsConverted,
  resolveMwst,
} from "@/lib/pricing";

export interface InvoiceSummary {
  currency: string;
  needsConversion: boolean;
  rate: number;
  purchaseSubtotal: number;
  purchaseTax: number;
  purchaseTotal: number;
  billExpensesTotal: number;
  addlExpCHF: number;
  adjustedTotalOrigCurrency: number;
  sellExcl: number;
  mwst: number;
  sellIncl: number;
  profit: number;
  finalProfitCHF: number;
}

export interface CalcSettings {
  globalMargin: number;
  globalMwst: string;
  exchangeRate: number;
  itemFinalPrices: Record<number, number | null>;
  itemMwst: Record<number, string | null>;
}

interface InvoiceTableProps {
  data: InvoiceData;
  additionalExpenses?: { description: string; amount: number; currency: string }[];
  expenseFlags: boolean[];
  onExpenseToggle: (index: number) => void;
  onSummaryChange?: (summary: InvoiceSummary) => void;
  initialSettings?: Partial<CalcSettings>;
  onSettingsChange?: (settings: CalcSettings) => void;
}

function SearchImageButton({ query, fallback }: { query?: string; fallback: string }) {
  const handleSearch = () => {
    window.open(
      `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query || fallback)}`,
      "_blank"
    );
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0"
      onClick={handleSearch}
      title={query ? `Suche: ${query}` : "Produktbild suchen"}
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
      </svg>
    </Button>
  );
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£", CHF: "CHF", JPY: "¥", CNY: "¥",
  KRW: "₩", INR: "₹", RUB: "₽", TRY: "₺", PLN: "zł", SEK: "kr",
  NOK: "kr", DKK: "kr", CZK: "Kč", HUF: "Ft", BRL: "R$", CAD: "C$",
  AUD: "A$", NZD: "NZ$", MXN: "MX$", ZAR: "R", THB: "฿",
};

function currencySign(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}

function fmt(value: number, sign: string): string {
  return `${sign} ${value.toFixed(2)}`;
}

export function InvoiceTable({ data, additionalExpenses = [], expenseFlags, onExpenseToggle, onSummaryChange, initialSettings, onSettingsChange }: InvoiceTableProps) {
  const sign = currencySign(data.currency);
  const sellSign = currencySign("CHF");
  const needsConversion = data.currency !== "CHF";
  const [exchangeRate, setExchangeRate] = useState(initialSettings?.exchangeRate ?? 1.0);
  const rate = needsConversion ? exchangeRate : 1;
  const [globalMargin, setGlobalMargin] = useState(initialSettings?.globalMargin ?? 100);
  const [globalMwst, setGlobalMwst] = useState(initialSettings?.globalMwst ?? DEFAULT_MWST);
  const [itemFinalPrices, setItemFinalPrices] = useState<Record<number, number | null>>(initialSettings?.itemFinalPrices ?? {});
  const [itemMwst, setItemMwst] = useState<Record<number, string | null>>(initialSettings?.itemMwst ?? {});
  const [descWidth, setDescWidth] = useState(288); // w-72 = 18rem = 288px
  const [searchFilter, setSearchFilter] = useState("");

  const settingsCallbackRef = useRef(onSettingsChange);
  useEffect(() => { settingsCallbackRef.current = onSettingsChange; });

  const prevSettingsRef = useRef(JSON.stringify({ globalMargin, globalMwst, exchangeRate, itemFinalPrices, itemMwst }));
  useEffect(() => {
    const current = JSON.stringify({ globalMargin, globalMwst, exchangeRate, itemFinalPrices, itemMwst });
    if (current === prevSettingsRef.current) return;
    prevSettingsRef.current = current;
    settingsCallbackRef.current?.({ globalMargin, globalMwst, exchangeRate, itemFinalPrices, itemMwst });
  }, [globalMargin, globalMwst, exchangeRate, itemFinalPrices, itemMwst]);

  const resizing = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    startX.current = e.clientX;
    startW.current = descWidth;

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const delta = ev.clientX - startX.current;
      setDescWidth(Math.max(120, startW.current + delta));
    };
    const onUp = () => {
      resizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [descWidth]);

  const hasTaxRate = data.line_items.some((item) => item.tax_rate != null);
  const hasPosition = data.line_items.some((item) => item.position != null);

  // Sticky column left offsets (rem): #(w-12=3rem), Exp(w-10=2.5rem)
  const posLeft = "0rem";
  const expLeft = hasPosition ? "3rem" : "0rem";
  const descLeft = hasPosition ? "5.5rem" : "2.5rem";

  // Footer colspan helpers
  const stickyColSpan = (hasPosition ? 1 : 0) + 2; // # + Kost. + Beschreibung
  const gapAfterDesc = 1 + 1 + (hasTaxRate ? 1 : 0); // Menge + Einzelpreis + Steuer%

  // All additional expenses are in CHF — convert to invoice currency for distribution
  const addlExpCHF = additionalExpenses.reduce((sum, e) => sum + e.amount, 0);
  const addlExpInOrigCurrency = needsConversion && rate > 0 ? addlExpCHF / rate : addlExpCHF;

  const expenseDist = calcExpenseDistribution(data.line_items, expenseFlags, addlExpInOrigCurrency);
  // Bill-only expenses for separate footer display
  const billExpensesTotal = expenseDist.totalExpenses - addlExpInOrigCurrency;

  const lineCalcs = data.line_items.map((item, i) => {
    if (expenseFlags[i]) {
      return calcLineItem(item, 0, 0);
    }
    const mwstRate = resolveMwst(i, itemMwst, globalMwst);
    const adjustedUnitPrice = expenseDist.adjustedUnitPriceByIndex[i];
    const margin = itemFinalPrices[i] != null
      ? calcMarginFromFinalPrice(itemFinalPrices[i]! / rate, adjustedUnitPrice, mwstRate)
      : globalMargin;
    return calcLineItem(item, margin, mwstRate, adjustedUnitPrice);
  });

  const colValues = data.line_items.map((item, i) => {
    const mwstRate = resolveMwst(i, itemMwst, globalMwst);
    const adjustedUnitPrice = expenseDist.adjustedUnitPriceByIndex[i];
    return calcColumnValues(lineCalcs[i], adjustedUnitPrice, item.quantity, globalMargin, mwstRate, rate, itemFinalPrices[i]);
  });

  const totals = calcInvoiceTotals(lineCalcs, expenseFlags);
  const totalsC = calcTotalsConverted(totals, rate);
  // Final profit in CHF: additional expenses are distributed into sell prices but represent a real
  // external cost, so they must also be deducted from profit to get the true economic margin.
  const finalProfitCHF = totalsC.profit - addlExpCHF;

  const adjustedTotalSum = data.line_items.reduce((sum, item, i) => {
    if (expenseFlags[i]) return sum;
    return sum + expenseDist.adjustedUnitPriceByIndex[i] * item.quantity;
  }, 0);

  const summaryCallbackRef = useRef(onSummaryChange);
  useEffect(() => { summaryCallbackRef.current = onSummaryChange; });

  const summary = useMemo<InvoiceSummary>(() => ({
    currency: data.currency,
    needsConversion,
    rate,
    purchaseSubtotal: data.subtotal,
    purchaseTax: data.tax_amount,
    purchaseTotal: data.total,
    billExpensesTotal,
    addlExpCHF,
    adjustedTotalOrigCurrency: adjustedTotalSum,
    sellExcl: totalsC.sellExcl,
    mwst: totalsC.mwst,
    sellIncl: totalsC.sellIncl,
    profit: totalsC.profit,
    finalProfitCHF,
  }), [data.currency, data.subtotal, data.tax_amount, data.total, needsConversion, rate,
      billExpensesTotal, addlExpCHF, adjustedTotalSum,
      totalsC.sellExcl, totalsC.mwst, totalsC.sellIncl, totalsC.profit, finalProfitCHF]);

  useEffect(() => { summaryCallbackRef.current?.(summary); }, [summary]);

  const handleItemFinalPriceChange = (index: number, value: string) => {
    if (value === "") {
      setItemFinalPrices((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    } else {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        setItemFinalPrices((prev) => ({ ...prev, [index]: num }));
      }
    }
  };

  const handleItemMwstChange = (index: number, value: string) => {
    if (value === "_global") {
      setItemMwst((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    } else {
      setItemMwst((prev) => ({ ...prev, [index]: value }));
    }
  };

  return (
    <Card className="flex flex-col h-screen print-auto">
      <CardHeader className="shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Positionen</CardTitle>
            <Input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Suche..."
              className="w-48 h-7 text-sm no-print"
            />
          </div>
          <div className="flex items-center gap-4 no-print">
            {billExpensesTotal > 0 && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Spesen: <span className="font-medium text-amber-600 dark:text-amber-400">{fmt(billExpensesTotal, sign)}</span>
              </span>
            )}
            {needsConversion && (
              <div className="grid grid-cols-[auto_6rem] items-center gap-x-2 gap-y-1">
                <span className="text-sm text-muted-foreground whitespace-nowrap text-right">Invoice Price CHF</span>
                <Input
                  type="number"
                  value={parseFloat((data.total * exchangeRate).toFixed(2))}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v > 0 && data.total > 0) {
                      setExchangeRate(v / data.total);
                    }
                  }}
                  className="h-7 text-right text-sm"
                  step={0.01}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap text-right">{data.currency}→CHF</span>
                <Input
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v > 0) setExchangeRate(v);
                  }}
                  className="h-7 text-right text-sm"
                  min={0.0001}
                  step={0.0001}
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Marge</span>
              <Slider
                value={[globalMargin]}
                onValueChange={([v]) => setGlobalMargin(v)}
                min={100}
                max={400}
                step={1}
                className="w-32"
              />
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={globalMargin}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v >= 0) setGlobalMargin(v);
                  }}
                  className="w-16 h-7 text-right text-sm"
                  min={0}
                  max={999}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">MWST</span>
              <Select value={globalMwst} onValueChange={setGlobalMwst}>
                <SelectTrigger className="w-20 h-7 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MWST_RATES.map((rate) => (
                    <SelectItem key={rate.value} value={rate.value}>
                      {rate.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col">
        <div className="rounded-md border overflow-hidden relative flex-1 min-h-0 flex flex-col">
          <Table
            className="table-fixed"
            containerClassName="frozen-scroll overflow-y-auto flex-1 min-h-0"
            containerStyle={{ '--frozen-w': `calc(${descLeft} + ${descWidth}px)` } as React.CSSProperties}
          >
            <TableHeader className="sticky top-0 z-30 bg-muted">
              <TableRow>
                {hasPosition && (
                  <TableHead className="w-12 sticky z-20 bg-muted no-print" style={{ left: posLeft }}>#</TableHead>
                )}
                <TableHead className="w-10 text-center sticky z-20 bg-muted no-print" style={{ left: expLeft }}>
                  <div>Kost.</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">Spesen</div>
                </TableHead>
                <TableHead className="sticky z-20 bg-muted shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ left: descLeft, width: descWidth }}>
                  Beschreibung
                  <div
                    onMouseDown={onResizeStart}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50"
                  />
                </TableHead>
                <TableHead className="text-right w-20">
                  <div>Menge</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">Anzahl</div>
                </TableHead>
                <TableHead className="text-right w-28 no-print">
                  <div>Einzelpreis</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">Einkauf/Stk.</div>
                </TableHead>
                {hasTaxRate && <TableHead className="text-right w-20 no-print">
                  <div>Steuer %</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">Einkauf</div>
                </TableHead>}
                <TableHead className="text-right w-28 no-print">
                  <div>Gesamt</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">Einkauf total</div>
                </TableHead>
                <TableHead className="text-right w-28 no-print">
                  <div>Angepasst</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">+ Spesen/Stk.</div>
                </TableHead>
                <TableHead className="text-right w-28 no-print">
                  <div>Ang. Gesamt</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">+ Spesen total</div>
                </TableHead>
                {needsConversion && <TableHead className="text-right w-28 no-print">
                  <div>Gesamt CHF</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">umgerechnet</div>
                </TableHead>}
                <TableHead className="text-right w-20 no-print">
                  <div>Marge %</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">Aufschlag</div>
                </TableHead>
                <TableHead className="text-right w-28 no-print">
                  <div>Richtpreis</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">bei Marge inkl.</div>
                </TableHead>
                <TableHead className="text-right w-28">
                  <div>Endpreis</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">Verkauf inkl.</div>
                </TableHead>
                <TableHead className="text-right w-20">
                  <div>MWST</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">Steuersatz</div>
                </TableHead>
                <TableHead className="text-right w-28 no-print">
                  <div>Verkauf</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">exkl. MwSt/Stk.</div>
                </TableHead>
                <TableHead className="text-right w-28 no-print">
                  <div>Verk. Gesamt</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">exkl. MwSt</div>
                </TableHead>
                <TableHead className="text-right w-28">
                  <div>Ges. inkl.</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">Verkauf + MwSt</div>
                </TableHead>
                <TableHead className="text-right w-28 no-print">
                  <div>Gewinn</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">pro Stk.</div>
                </TableHead>
                <TableHead className="text-right w-28 no-print">
                  <div>Gew. Gesamt</div>
                  <div className="text-[10px] font-normal text-muted-foreground leading-tight">total</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.line_items.map((item, index) => {
                const filterLower = searchFilter.toLowerCase();
                if (filterLower && !item.description.toLowerCase().includes(filterLower)
                  && !(item.position != null && String(item.position).includes(filterLower))) {
                  return null;
                }
                const calc = lineCalcs[index];
                const cv = colValues[index];
                const isExpense = expenseFlags[index];
                const hasFinalPriceOverride = itemFinalPrices[index] != null;
                const hasMwstOverride = itemMwst[index] != null;
                const stickyBg = isExpense
                  ? "bg-amber-50 dark:bg-amber-950"
                  : "bg-background";

                return (
                  <TableRow
                    key={index}
                    className={isExpense ? "bg-amber-50 dark:bg-amber-950/30 no-print" : ""}
                  >
                    {hasPosition && (
                      <TableCell className={`text-muted-foreground sticky z-10 no-print ${stickyBg}`} style={{ left: posLeft }}>{item.position}</TableCell>
                    )}
                    <TableCell className={`text-center sticky z-10 no-print ${stickyBg}`} style={{ left: expLeft }}>
                      <Checkbox
                        checked={isExpense}
                        onCheckedChange={() => onExpenseToggle(index)}
                      />
                    </TableCell>
                    <TableCell className={`font-medium sticky z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] ${stickyBg}`} style={{ left: descLeft }}>
                      <div className="flex items-center gap-1 overflow-hidden">
                        <SearchImageButton query={item.image_search_query} fallback={item.description} />
                        <span className="truncate" title={item.description}>{item.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right no-print">{fmt(item.unit_price, sign)}</TableCell>
                    {hasTaxRate && (
                      <TableCell className="text-right no-print">
                        {item.tax_rate != null ? `${item.tax_rate}%` : "-"}
                      </TableCell>
                    )}
                    <TableCell className="text-right font-medium no-print">
                      {fmt(item.line_total, sign)}
                    </TableCell>
                    <TableCell className="text-right no-print">
                      {isExpense ? (
                        <span className="text-muted-foreground">--</span>
                      ) : (
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                          {fmt(expenseDist.adjustedUnitPriceByIndex[index], sign)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right no-print">
                      {isExpense ? (
                        <span className="text-muted-foreground">--</span>
                      ) : (
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                          {fmt(cv.adjustedTotal, sign)}
                        </span>
                      )}
                    </TableCell>
                    {needsConversion && (
                      <TableCell className="text-right no-print">
                        {isExpense ? (
                          <span className="text-muted-foreground">--</span>
                        ) : (
                          <span className="font-medium text-orange-600 dark:text-orange-400">
                            {fmt(cv.adjustedTotalConverted, sellSign)}
                          </span>
                        )}
                      </TableCell>
                    )}
                    {/* Marge % — read-only, effective margin */}
                    <TableCell className="text-right text-muted-foreground no-print">
                      {isExpense ? "--" : `${calc.margin.toFixed(1)}%`}
                    </TableCell>
                    {/* Richtpreis — calculated price at global margin incl MwSt (reference) */}
                    <TableCell className="text-right font-medium text-muted-foreground no-print">
                      {isExpense ? "--" : fmt(cv.richtpreis, sellSign)}
                    </TableCell>
                    {/* Endpreis — editable final unit price incl MwSt */}
                    <TableCell className="text-right">
                      {isExpense ? (
                        <span className="text-muted-foreground">--</span>
                      ) : (
                        <>
                          <span className="hidden print-only">
                            {fmt(cv.endpreis, sellSign)}
                          </span>
                          <Input
                            type="number"
                            value={hasFinalPriceOverride ? itemFinalPrices[index]! : ""}
                            placeholder={fmt(cv.richtpreis, "")}
                            onChange={(e) => handleItemFinalPriceChange(index, e.target.value)}
                            className="w-24 h-7 text-right text-sm ml-auto no-print"
                            min={0}
                            step={0.05}
                          />
                        </>
                      )}
                    </TableCell>
                    {/* MWST dropdown */}
                    <TableCell className="text-right">
                      {isExpense ? (
                        <span className="text-muted-foreground">--</span>
                      ) : (
                        <>
                          <span className="hidden print-only">{calc.mwstRate}%</span>
                          <Select
                            value={hasMwstOverride ? itemMwst[index]! : "_global"}
                            onValueChange={(v) => handleItemMwstChange(index, v)}
                          >
                            <SelectTrigger className="w-20 h-7 text-sm ml-auto no-print">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_global">{globalMwst}%</SelectItem>
                              {MWST_RATES.map((rate) => (
                                <SelectItem key={rate.value} value={rate.value}>
                                  {rate.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </TableCell>
                    {/* Verkauf — sell price excl MwSt */}
                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400 no-print">
                      {isExpense ? "--" : fmt(cv.sellPriceConverted, sellSign)}
                    </TableCell>
                    {/* Verk. Gesamt — sell total excl MwSt */}
                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400 no-print">
                      {isExpense ? "--" : fmt(cv.sellTotalConverted, sellSign)}
                    </TableCell>
                    {/* Ges. inkl. — total incl MwSt */}
                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                      {isExpense ? "--" : fmt(cv.sellTotalInclConverted, sellSign)}
                    </TableCell>
                    {/* Gewinn per unit */}
                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400 no-print">
                      {isExpense ? "--" : fmt(cv.profitPerUnit, sellSign)}
                    </TableCell>
                    {/* Gew. Gesamt */}
                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400 no-print">
                      {isExpense ? "--" : fmt(cv.profitTotal, sellSign)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter className="sticky bottom-0 z-30 bg-muted">
              {/* Screen footer rows */}
              <TableRow className="no-print">
                <TableCell colSpan={stickyColSpan} className="sticky left-0 z-20 bg-muted overflow-hidden truncate">Zwischensumme</TableCell>
                <TableCell colSpan={gapAfterDesc} />
                <TableCell className="text-right">{fmt(data.subtotal, sign)}</TableCell>
                <TableCell />
                <TableCell className="text-right text-orange-600 dark:text-orange-400">{fmt(adjustedTotalSum, sign)}</TableCell>
                {needsConversion && <TableCell className="text-right text-orange-600 dark:text-orange-400">{fmt(adjustedTotalSum * rate, sellSign)}</TableCell>}
                <TableCell colSpan={4} />
                <TableCell />
                <TableCell className="text-right text-blue-600 dark:text-blue-400">{fmt(totalsC.sellExcl, sellSign)}</TableCell>
                <TableCell className="text-right text-blue-600 dark:text-blue-400">{fmt(totalsC.sellIncl, sellSign)}</TableCell>
                <TableCell />
                <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{fmt(totalsC.profit, sellSign)}</TableCell>
              </TableRow>
              <TableRow className="no-print">
                <TableCell colSpan={stickyColSpan} className="sticky left-0 z-20 bg-muted overflow-hidden truncate">MWST</TableCell>
                <TableCell colSpan={gapAfterDesc} />
                <TableCell className="text-right">{fmt(data.tax_amount, sign)}</TableCell>
                <TableCell />
                <TableCell />
                {needsConversion && <TableCell />}
                <TableCell colSpan={6} />
                <TableCell className="text-right text-blue-600 dark:text-blue-400">{fmt(totalsC.mwst, sellSign)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
              <TableRow className="font-bold no-print">
                <TableCell colSpan={stickyColSpan} className="sticky left-0 z-20 bg-muted overflow-hidden truncate">Gesamt</TableCell>
                <TableCell colSpan={gapAfterDesc} />
                <TableCell className="text-right">{fmt(data.total, sign)}</TableCell>
                <TableCell />
                <TableCell className="text-right text-orange-600 dark:text-orange-400">{fmt(adjustedTotalSum, sign)}</TableCell>
                {needsConversion && <TableCell className="text-right text-orange-600 dark:text-orange-400">{fmt(adjustedTotalSum * rate, sellSign)}</TableCell>}
                <TableCell colSpan={4} />
                <TableCell />
                <TableCell className="text-right text-blue-600 dark:text-blue-400">{fmt(totalsC.sellExcl, sellSign)}</TableCell>
                <TableCell className="text-right text-blue-600 dark:text-blue-400">{fmt(totalsC.sellIncl, sellSign)}</TableCell>
                <TableCell />
                <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{fmt(totalsC.profit, sellSign)}</TableCell>
              </TableRow>
              {/* Print-only footer rows — matches print columns: Beschreibung, Menge, Endpreis, MWST, Ges.inkl. */}
              <TableRow className="hidden print-only-row">
                <TableCell colSpan={3}>Netto (exkl. MWST)</TableCell>
                <TableCell />
                <TableCell className="text-right font-medium">{fmt(totalsC.sellExcl, sellSign)}</TableCell>
              </TableRow>
              <TableRow className="hidden print-only-row">
                <TableCell colSpan={3}>MWST</TableCell>
                <TableCell />
                <TableCell className="text-right">{fmt(totalsC.mwst, sellSign)}</TableCell>
              </TableRow>
              <TableRow className="hidden print-only-row font-bold">
                <TableCell colSpan={3}>Gesamt inkl. MWST</TableCell>
                <TableCell />
                <TableCell className="text-right">{fmt(totalsC.sellIncl, sellSign)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
          {/* Cover scrollbar gutter under frozen columns */}
          <div
            className="absolute bottom-0 left-0 bg-background z-30 pointer-events-none no-print"
            style={{ width: `calc(${descLeft} + ${descWidth}px)`, height: 8 }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
