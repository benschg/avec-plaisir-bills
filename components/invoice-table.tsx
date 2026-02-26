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
import { Button } from "@/components/ui/button";
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
  const hasTaxRate = data.line_items.some((item) => item.tax_rate != null);
  const hasPosition = data.line_items.some((item) => item.position != null);
  const footerColSpan = (hasPosition ? 1 : 0) + 1 + 1 + 1 + (hasTaxRate ? 1 : 0) + 1;

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
                <TableHead className="w-10" />
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
                  <TableCell>
                    <SearchImageButton query={item.image_search_query} fallback={item.description} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={footerColSpan}>Subtotal</TableCell>
                <TableCell className="text-right">{data.subtotal.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={footerColSpan}>Tax</TableCell>
                <TableCell className="text-right">{data.tax_amount.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow className="font-bold">
                <TableCell colSpan={footerColSpan}>Total ({data.currency})</TableCell>
                <TableCell className="text-right">{data.total.toFixed(2)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
