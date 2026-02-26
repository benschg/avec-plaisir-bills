"use client";

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
import type { InvoiceData } from "@/lib/types";

interface InvoiceTableProps {
  data: InvoiceData;
}

export function InvoiceTable({ data }: InvoiceTableProps) {
  const hasTaxRate = data.line_items.some((item) => item.tax_rate != null);
  const hasPosition = data.line_items.some((item) => item.position != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Line Items</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {hasPosition && <TableHead className="w-16">#</TableHead>}
                <TableHead>Description</TableHead>
                <TableHead className="text-right w-20">Qty</TableHead>
                <TableHead className="text-right w-28">Unit Price</TableHead>
                {hasTaxRate && <TableHead className="text-right w-20">Tax %</TableHead>}
                <TableHead className="text-right w-28">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.line_items.map((item, index) => (
                <TableRow key={index}>
                  {hasPosition && (
                    <TableCell className="text-muted-foreground">{item.position}</TableCell>
                  )}
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
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={hasPosition ? (hasTaxRate ? 5 : 4) : (hasTaxRate ? 4 : 3)}>
                  Subtotal
                </TableCell>
                <TableCell className="text-right">{data.subtotal.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={hasPosition ? (hasTaxRate ? 5 : 4) : (hasTaxRate ? 4 : 3)}>
                  Tax
                </TableCell>
                <TableCell className="text-right">{data.tax_amount.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow className="font-bold">
                <TableCell colSpan={hasPosition ? (hasTaxRate ? 5 : 4) : (hasTaxRate ? 4 : 3)}>
                  Total ({data.currency})
                </TableCell>
                <TableCell className="text-right">{data.total.toFixed(2)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
