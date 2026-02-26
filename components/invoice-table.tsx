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
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { InvoiceData } from "@/lib/types";

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
  const [itemMargins, setItemMargins] = useState<Record<number, number | null>>({});

  const hasTaxRate = data.line_items.some((item) => item.tax_rate != null);
  const hasPosition = data.line_items.some((item) => item.position != null);
  // Label columns (everything before Total): [#] + img + Description + Qty + Unit Price + [Tax %]
  const labelColSpan = (hasPosition ? 1 : 0) + 1 + 1 + 1 + 1 + (hasTaxRate ? 1 : 0);

  const getEffectiveMargin = (index: number) => {
    const override = itemMargins[index];
    return override != null ? override : globalMargin;
  };

  const getSellPrice = (unitPrice: number, margin: number) => {
    return unitPrice * (1 + margin / 100);
  };

  const sellTotals = data.line_items.map((item, i) => {
    const margin = getEffectiveMargin(i);
    return item.quantity * getSellPrice(item.unit_price, margin);
  });
  const sellGrandTotal = sellTotals.reduce((sum, t) => sum + t, 0);

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base">Line Items</CardTitle>
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {hasPosition && <TableHead className="w-16">#</TableHead>}
                <TableHead className="w-10" />
                <TableHead>Description</TableHead>
                <TableHead className="text-right w-20">Qty</TableHead>
                <TableHead className="text-right w-28">Unit Price</TableHead>
                {hasTaxRate && <TableHead className="text-right w-20">Tax %</TableHead>}
                <TableHead className="text-right w-28">Total</TableHead>
                <TableHead className="text-right w-20">Margin %</TableHead>
                <TableHead className="text-right w-28">Sell Price</TableHead>
                <TableHead className="text-right w-28">Sell Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.line_items.map((item, index) => {
                const margin = getEffectiveMargin(index);
                const sellPrice = getSellPrice(item.unit_price, margin);
                const sellTotal = item.quantity * sellPrice;
                const hasOverride = itemMargins[index] != null;

                return (
                  <TableRow key={index}>
                    {hasPosition && (
                      <TableCell className="text-muted-foreground">{item.position}</TableCell>
                    )}
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
                    <TableCell className="text-right font-medium">
                      {item.line_total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={hasOverride ? itemMargins[index]! : ""}
                        placeholder={String(globalMargin)}
                        onChange={(e) => handleItemMarginChange(index, e.target.value)}
                        className="w-16 h-7 text-right text-sm ml-auto"
                        min={0}
                        max={999}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                      {sellPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                      {sellTotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={labelColSpan}>Subtotal</TableCell>
                <TableCell className="text-right">{data.subtotal.toFixed(2)}</TableCell>
                <TableCell colSpan={3} />
              </TableRow>
              <TableRow>
                <TableCell colSpan={labelColSpan}>Tax</TableCell>
                <TableCell className="text-right">{data.tax_amount.toFixed(2)}</TableCell>
                <TableCell colSpan={3} />
              </TableRow>
              <TableRow className="font-bold">
                <TableCell colSpan={labelColSpan}>Total ({data.currency})</TableCell>
                <TableCell className="text-right">{data.total.toFixed(2)}</TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right text-blue-600 dark:text-blue-400">
                  {sellGrandTotal.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
