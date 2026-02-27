"use client";

import { useState } from "react";
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

export function InvoiceTable({ data }: InvoiceTableProps) {
  const [globalMargin, setGlobalMargin] = useState(0);
  const [globalMwst, setGlobalMwst] = useState(DEFAULT_MWST);
  const [itemMargins, setItemMargins] = useState<Record<number, number | null>>({});
  const [itemMwst, setItemMwst] = useState<Record<number, string | null>>({});
  const [expenseFlags, setExpenseFlags] = useState<boolean[]>(
    data.line_items.map((item) => item.is_expense ?? false)
  );

  const hasTaxRate = data.line_items.some((item) => item.tax_rate != null);
  const hasPosition = data.line_items.some((item) => item.position != null);
  // Label columns: [#] + Exp. + img + Description + Qty + Unit Price + [Tax %]
  const labelColSpan = (hasPosition ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + (hasTaxRate ? 1 : 0);

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
                Expenses: <span className="font-medium text-amber-600 dark:text-amber-400">{expenseDist.totalExpenses.toFixed(2)}</span>
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {hasPosition && <TableHead className="w-16">#</TableHead>}
                <TableHead className="w-10 text-center">Exp.</TableHead>
                <TableHead className="w-10" />
                <TableHead>Description</TableHead>
                <TableHead className="text-right w-20">Qty</TableHead>
                <TableHead className="text-right w-28">Unit Price</TableHead>
                {hasTaxRate && <TableHead className="text-right w-20">Tax %</TableHead>}
                <TableHead className="text-right w-28">Adjusted</TableHead>
                <TableHead className="text-right w-28">Total</TableHead>
                <TableHead className="text-right w-28">Adj. Total</TableHead>
                <TableHead className="text-right w-20">Margin %</TableHead>
                <TableHead className="text-right w-20">MWST</TableHead>
                <TableHead className="text-right w-28">Sell Price</TableHead>
                <TableHead className="text-right w-28">Sell incl.</TableHead>
                <TableHead className="text-right w-28">Sell Total</TableHead>
                <TableHead className="text-right w-28">Total incl.</TableHead>
                <TableHead className="text-right w-28">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.line_items.map((item, index) => {
                const calc = lineCalcs[index];
                const isExpense = expenseFlags[index];
                const hasMarginOverride = itemMargins[index] != null;
                const hasMwstOverride = itemMwst[index] != null;

                return (
                  <TableRow
                    key={index}
                    className={isExpense ? "bg-amber-50 dark:bg-amber-950/30" : ""}
                  >
                    {hasPosition && (
                      <TableCell className="text-muted-foreground">{item.position}</TableCell>
                    )}
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isExpense}
                        onCheckedChange={() => handleExpenseToggle(index)}
                      />
                    </TableCell>
                    <TableCell>
                      <SearchImageButton query={item.image_search_query} fallback={item.description} />
                    </TableCell>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.unit_price.toFixed(2)}</TableCell>
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
                          {expenseDist.adjustedUnitPriceByIndex[index].toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.line_total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isExpense ? (
                        <span className="text-muted-foreground">--</span>
                      ) : (
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                          {(expenseDist.adjustedUnitPriceByIndex[index] * item.quantity).toFixed(2)}
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
                      {isExpense ? "--" : calc.sellPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                      {isExpense ? "--" : calc.sellPriceInclMwst.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                      {isExpense ? "--" : calc.sellTotal.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                      {isExpense ? "--" : calc.sellTotalInclMwst.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {isExpense ? "--" : calc.profit.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={labelColSpan}>Subtotal</TableCell>
                <TableCell />
                <TableCell className="text-right">{data.subtotal.toFixed(2)}</TableCell>
                <TableCell className="text-right text-orange-600 dark:text-orange-400">
                  {adjustedTotalSum.toFixed(2)}
                </TableCell>
                <TableCell colSpan={4} />
                <TableCell className="text-right text-blue-600 dark:text-blue-400">
                  {totals.sellExcl.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-blue-600 dark:text-blue-400">
                  {totals.sellIncl.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                  {totals.profit.toFixed(2)}
                </TableCell>
              </TableRow>
              {expenseDist.totalExpenses > 0 && (
                <TableRow>
                  <TableCell colSpan={labelColSpan} className="text-amber-600 dark:text-amber-400">
                    Expenses (distributed)
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right text-amber-600 dark:text-amber-400">
                    {expenseDist.totalExpenses.toFixed(2)}
                  </TableCell>
                  <TableCell colSpan={8} />
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={labelColSpan}>MWST</TableCell>
                <TableCell />
                <TableCell className="text-right">{data.tax_amount.toFixed(2)}</TableCell>
                <TableCell />
                <TableCell colSpan={4} />
                <TableCell />
                <TableCell className="text-right text-blue-600 dark:text-blue-400">
                  {totals.mwst.toFixed(2)}
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow className="font-bold">
                <TableCell colSpan={labelColSpan}>Total ({data.currency})</TableCell>
                <TableCell />
                <TableCell className="text-right">{data.total.toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold text-orange-600 dark:text-orange-400">
                  {adjustedTotalSum.toFixed(2)}
                </TableCell>
                <TableCell colSpan={4} />
                <TableCell className="text-right text-blue-600 dark:text-blue-400">
                  {totals.sellExcl.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-blue-600 dark:text-blue-400">
                  {totals.sellIncl.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                  {totals.profit.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
