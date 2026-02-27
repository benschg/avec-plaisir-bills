"use client";

import { useCallback, useRef, useState } from "react";
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
  resolveMargin,
  resolveMwst,
} from "@/lib/pricing";

interface InvoiceTableProps {
  data: InvoiceData;
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
      title={query ? `Search: ${query}` : "Search product image"}
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

export function InvoiceTable({ data }: InvoiceTableProps) {
  const sign = currencySign(data.currency);
  const sellSign = currencySign("CHF");
  const needsConversion = data.currency !== "CHF";
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const rate = needsConversion ? exchangeRate : 1;
  const [globalMargin, setGlobalMargin] = useState(0);
  const [globalMwst, setGlobalMwst] = useState(DEFAULT_MWST);
  const [itemMargins, setItemMargins] = useState<Record<number, number | null>>({});
  const [itemMwst, setItemMwst] = useState<Record<number, string | null>>({});
  const [expenseFlags, setExpenseFlags] = useState<boolean[]>(
    data.line_items.map((item) => item.is_expense ?? false)
  );
  const [descWidth, setDescWidth] = useState(288); // w-72 = 18rem = 288px

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
  // Footer: sticky label spans frozen columns only ([#] + Exp + Desc)
  const stickyColSpan = (hasPosition ? 1 : 0) + 1 + 1;
  // Remaining label columns after Description (Qty + UnitPrice + [Tax%])
  const gapAfterDesc = 1 + 1 + (hasTaxRate ? 1 : 0);

  // Sticky column left offsets (rem): #(w-12=3rem), Exp(w-10=2.5rem)
  const posLeft = "0rem";
  const expLeft = hasPosition ? "3rem" : "0rem";
  const descLeft = hasPosition ? "5.5rem" : "2.5rem";

  const expenseDist = calcExpenseDistribution(data.line_items, expenseFlags);

  const lineCalcs = data.line_items.map((item, i) => {
    if (expenseFlags[i]) {
      return calcLineItem(item, 0, 0);
    }
    const margin = resolveMargin(i, itemMargins, globalMargin);
    const mwstRate = resolveMwst(i, itemMwst, globalMwst);
    return calcLineItem(item, margin, mwstRate, expenseDist.adjustedUnitPriceByIndex[i]);
  });

  const totals = calcInvoiceTotals(lineCalcs, expenseFlags);

  const adjustedTotalSum = data.line_items.reduce((sum, item, i) => {
    if (expenseFlags[i]) return sum;
    return sum + expenseDist.adjustedUnitPriceByIndex[i] * item.quantity;
  }, 0);

  const handleExpenseToggle = (index: number) => {
    setExpenseFlags((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleItemMarginChange = (index: number, value: string) => {
    if (value === "") {
      setItemMargins((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    } else {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        setItemMargins((prev) => ({ ...prev, [index]: num }));
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base">Line Items</CardTitle>
          <div className="flex items-center gap-4">
            {expenseDist.totalExpenses > 0 && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Expenses: <span className="font-medium text-amber-600 dark:text-amber-400">{fmt(expenseDist.totalExpenses, sign)}</span>
              </span>
            )}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Margin</span>
              <Slider
                value={[globalMargin]}
                onValueChange={([v]) => setGlobalMargin(v)}
                min={0}
                max={200}
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
            {needsConversion && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground whitespace-nowrap">{data.currency}→CHF</span>
                <Input
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v > 0) setExchangeRate(v);
                  }}
                  className="w-20 h-7 text-right text-sm"
                  min={0.0001}
                  step={0.01}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap ml-2">Total CHF</span>
                <Input
                  type="number"
                  value={parseFloat((totals.sellIncl * exchangeRate).toFixed(2))}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v > 0 && totals.sellIncl > 0) {
                      setExchangeRate(v / totals.sellIncl);
                    }
                  }}
                  className="w-24 h-7 text-right text-sm"
                  step={0.01}
                />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden relative">
          <Table
            className="table-fixed"
            containerClassName="frozen-scroll"
            containerStyle={{ '--frozen-w': `calc(${descLeft} + ${descWidth}px)` } as React.CSSProperties}
          >
            <TableHeader>
              <TableRow>
                {hasPosition && (
                  <TableHead className="w-12 sticky z-20 bg-muted" style={{ left: posLeft }}>#</TableHead>
                )}
                <TableHead className="w-10 text-center sticky z-20 bg-muted" style={{ left: expLeft }}>Exp.</TableHead>
                <TableHead className="sticky z-20 bg-muted shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ left: descLeft, width: descWidth }}>
                  Description
                  <div
                    onMouseDown={onResizeStart}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50"
                  />
                </TableHead>
                <TableHead className="text-right w-20">Qty</TableHead>
                <TableHead className="text-right w-28">Unit Price</TableHead>
                {hasTaxRate && <TableHead className="text-right w-20">Tax %</TableHead>}
                <TableHead className="text-right w-28">Adjusted</TableHead>
                <TableHead className="text-right w-28">Total</TableHead>
                <TableHead className="text-right w-28">Adj. Total</TableHead>
                <TableHead className="text-right w-20">Margin %</TableHead>
                <TableHead className="text-right w-28">Sell</TableHead>
                <TableHead className="text-right w-28">Sell Total</TableHead>
                <TableHead className="text-right w-28">Profit</TableHead>
                <TableHead className="text-right w-28">Profit Total</TableHead>
                <TableHead className="text-right w-20">MWST</TableHead>
                <TableHead className="text-right w-28">Sell incl.</TableHead>
                <TableHead className="text-right w-28">Total incl.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.line_items.map((item, index) => {
                const calc = lineCalcs[index];
                const isExpense = expenseFlags[index];
                const hasMarginOverride = itemMargins[index] != null;
                const hasMwstOverride = itemMwst[index] != null;
                const stickyBg = isExpense
                  ? "bg-amber-50 dark:bg-amber-950"
                  : "bg-background";

                return (
                  <TableRow
                    key={index}
                    className={isExpense ? "bg-amber-50 dark:bg-amber-950/30" : ""}
                  >
                    {hasPosition && (
                      <TableCell className={`text-muted-foreground sticky z-10 ${stickyBg}`} style={{ left: posLeft }}>{item.position}</TableCell>
                    )}
                    <TableCell className={`text-center sticky z-10 ${stickyBg}`} style={{ left: expLeft }}>
                      <Checkbox
                        checked={isExpense}
                        onCheckedChange={() => handleExpenseToggle(index)}
                      />
                    </TableCell>
                    <TableCell className={`font-medium sticky z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] ${stickyBg}`} style={{ left: descLeft }}>
                      <div className="flex items-center gap-1 overflow-hidden">
                        <SearchImageButton query={item.image_search_query} fallback={item.description} />
                        <span className="truncate" title={item.description}>{item.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{fmt(item.unit_price, sign)}</TableCell>
                    {hasTaxRate && (
                      <TableCell className="text-right">
                        {item.tax_rate != null ? `${item.tax_rate}%` : "-"}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {isExpense ? (
                        <span className="text-muted-foreground">--</span>
                      ) : (
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                          {fmt(expenseDist.adjustedUnitPriceByIndex[index], sign)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmt(item.line_total, sign)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isExpense ? (
                        <span className="text-muted-foreground">--</span>
                      ) : (
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                          {fmt(expenseDist.adjustedUnitPriceByIndex[index] * item.quantity, sign)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isExpense ? (
                        <span className="text-muted-foreground">--</span>
                      ) : (
                        <Input
                          type="number"
                          value={hasMarginOverride ? itemMargins[index]! : ""}
                          placeholder={String(globalMargin)}
                          onChange={(e) => handleItemMarginChange(index, e.target.value)}
                          className="w-16 h-7 text-right text-sm ml-auto"
                          min={0}
                          max={999}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                      {isExpense ? "--" : fmt(calc.sellPrice * rate, sellSign)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                      {isExpense ? "--" : fmt(calc.sellTotal * rate, sellSign)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {isExpense ? "--" : fmt((item.quantity > 0 ? calc.profit / item.quantity : 0) * rate, sellSign)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {isExpense ? "--" : fmt(calc.profit * rate, sellSign)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isExpense ? (
                        <span className="text-muted-foreground">--</span>
                      ) : (
                        <Select
                          value={hasMwstOverride ? itemMwst[index]! : "_global"}
                          onValueChange={(v) => handleItemMwstChange(index, v)}
                        >
                          <SelectTrigger className="w-20 h-7 text-sm ml-auto">
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
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                      {isExpense ? "--" : fmt(calc.sellPriceInclMwst * rate, sellSign)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                      {isExpense ? "--" : fmt(calc.sellTotalInclMwst * rate, sellSign)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={stickyColSpan} className="sticky left-0 z-10 bg-muted overflow-hidden truncate">Subtotal</TableCell>
                <TableCell colSpan={gapAfterDesc} />
                <TableCell />
                <TableCell className="text-right">{fmt(data.subtotal, sign)}</TableCell>
                <TableCell className="text-right text-orange-600 dark:text-orange-400">
                  {fmt(adjustedTotalSum, sign)}
                </TableCell>
                <TableCell colSpan={2} />
                <TableCell className="text-right text-blue-600 dark:text-blue-400">
                  {fmt(totals.sellExcl * rate, sellSign)}
                </TableCell>
                <TableCell />
                <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                  {fmt(totals.profit * rate, sellSign)}
                </TableCell>
                <TableCell colSpan={2} />
                <TableCell className="text-right text-blue-600 dark:text-blue-400">
                  {fmt(totals.sellIncl * rate, sellSign)}
                </TableCell>
              </TableRow>
              {expenseDist.totalExpenses > 0 && (
                <TableRow>
                  <TableCell colSpan={stickyColSpan} className="sticky left-0 z-10 bg-muted text-amber-600 dark:text-amber-400 overflow-hidden truncate">
                    Expenses (distributed)
                  </TableCell>
                  <TableCell colSpan={gapAfterDesc} />
                  <TableCell />
                  <TableCell className="text-right text-amber-600 dark:text-amber-400">
                    {fmt(expenseDist.totalExpenses, sign)}
                  </TableCell>
                  <TableCell colSpan={9} />
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={stickyColSpan} className="sticky left-0 z-10 bg-muted overflow-hidden truncate">MWST</TableCell>
                <TableCell colSpan={gapAfterDesc} />
                <TableCell />
                <TableCell className="text-right">{fmt(data.tax_amount, sign)}</TableCell>
                <TableCell />
                <TableCell colSpan={7} />
                <TableCell className="text-right text-blue-600 dark:text-blue-400">
                  {fmt(totals.mwst * rate, sellSign)}
                </TableCell>
              </TableRow>
              <TableRow className="font-bold">
                <TableCell colSpan={stickyColSpan} className="sticky left-0 z-10 bg-muted overflow-hidden truncate">Total</TableCell>
                <TableCell colSpan={gapAfterDesc} />
                <TableCell />
                <TableCell className="text-right">{fmt(data.total, sign)}</TableCell>
                <TableCell className="text-right font-bold text-orange-600 dark:text-orange-400">
                  {fmt(adjustedTotalSum, sign)}
                </TableCell>
                <TableCell colSpan={2} />
                <TableCell className="text-right text-blue-600 dark:text-blue-400">
                  {fmt(totals.sellExcl * rate, sellSign)}
                </TableCell>
                <TableCell />
                <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                  {fmt(totals.profit * rate, sellSign)}
                </TableCell>
                <TableCell colSpan={2} />
                <TableCell className="text-right text-blue-600 dark:text-blue-400">
                  {fmt(totals.sellIncl * rate, sellSign)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
          {/* Cover scrollbar gutter under frozen columns */}
          <div
            className="absolute bottom-0 left-0 bg-background z-30 pointer-events-none"
            style={{ width: `calc(${descLeft} + ${descWidth}px)`, height: 8 }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
