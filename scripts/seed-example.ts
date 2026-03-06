/**
 * Seed script: inserts one example invoice with 5 product items + 1 shipping expense.
 *
 * Usage:  npx tsx scripts/seed-example.ts
 * Requires DATABASE_URL in .env or environment.
 *
 * Items (EUR):
 *   1)  Schrauben M8       ×10   @  5.00  =   50.00
 *   2)  Dichtungen          ×5   @ 10.00  =   50.00
 *   3)  Schlauch 1m         ×2   @ 20.00  =   40.00
 *   4)  Druckregler         ×3   @ 50.00  =  150.00
 *   5)  Kompressor Mini     ×1   @100.00  =  100.00
 *   6)  Versandkosten       ×1   @ 15.00  =   15.00  (expense)
 *                                  ───────────────────
 *   Subtotal  390.00   Tax (19%) 74.10   Total 464.10
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  vendors,
  customers,
  invoices,
  line_items,
  payment_info,
} from "../lib/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  // 1. Vendor
  const [vendor] = await db
    .insert(vendors)
    .values({
      name: "Beispiel Lieferant GmbH",
      address: "Industriestr. 42, 80333 München, DE",
      tax_id: "DE123456789",
      email: "info@beispiel-lieferant.de",
    })
    .returning({ id: vendors.id });

  // 2. Customer
  const [customer] = await db
    .insert(customers)
    .values({
      name: "Avec Handels AG",
      address: "Bahnhofstr. 10, 8001 Zürich, CH",
      tax_id: "CHE-111.222.333",
    })
    .returning({ id: customers.id });

  // 3. Invoice
  const items = [
    { pos: 1, desc: "Schrauben M8×30 Edelstahl",  qty: 10, price:   5, tax: 19, query: "M8 stainless steel screws" },
    { pos: 2, desc: "Flachdichtungen DN25",        qty:  5, price:  10, tax: 19, query: "flat gasket DN25" },
    { pos: 3, desc: "PVC-Schlauch transparent 1m", qty:  2, price:  20, tax: 19, query: "transparent PVC hose" },
    { pos: 4, desc: "Druckregler 0-10 bar",        qty:  3, price:  50, tax: 19, query: "pressure regulator 0-10 bar" },
    { pos: 5, desc: "Kompressor Mini 8 bar",       qty:  1, price: 100, tax: 19, query: "mini air compressor 8 bar" },
  ];

  const shipping = { pos: 6, desc: "Versandkosten", qty: 1, price: 15, tax: 19 };

  const productSubtotal = items.reduce((s, i) => s + i.qty * i.price, 0);      // 390
  const shippingTotal = shipping.qty * shipping.price;                          // 15
  const subtotal = productSubtotal + shippingTotal;                             // 405
  const taxAmount = Math.round(subtotal * 0.19 * 100) / 100;                   // 76.95
  const total = subtotal + taxAmount;                                           // 481.95

  const rawExtraction = {
    vendor: { name: "Beispiel Lieferant GmbH", address: "Industriestr. 42, 80333 München, DE" },
    customer: { name: "Avec Handels AG", address: "Bahnhofstr. 10, 8001 Zürich, CH" },
    invoice_number: "DEMO-2025-001",
    invoice_date: "2025-06-15",
    currency: "EUR",
    line_items: [
      ...items.map((i) => ({
        position: i.pos,
        description: i.desc,
        quantity: i.qty,
        unit_price: i.price,
        tax_rate: i.tax,
        line_total: i.qty * i.price,
        image_search_query: i.query,
        is_expense: false,
      })),
      {
        position: shipping.pos,
        description: shipping.desc,
        quantity: shipping.qty,
        unit_price: shipping.price,
        tax_rate: shipping.tax,
        line_total: shippingTotal,
        is_expense: true,
      },
    ],
    subtotal,
    tax_amount: taxAmount,
    total,
  };

  const [invoice] = await db
    .insert(invoices)
    .values({
      file_name: "demo-rechnung.pdf",
      invoice_number: "DEMO-2025-001",
      invoice_date: "2025-06-15",
      due_date: "2025-07-15",
      currency: "EUR",
      vendor_id: vendor.id,
      customer_id: customer.id,
      subtotal: String(subtotal),
      tax_amount: String(taxAmount),
      total: String(total),
      notes: "Beispiel-Rechnung für Testzwecke",
      raw_extraction: rawExtraction,
    })
    .returning({ id: invoices.id });

  // 4. Line items
  const allItems = [
    ...items.map((i) => ({
      invoice_id: invoice.id,
      position: i.pos,
      description: i.desc,
      quantity: String(i.qty),
      unit_price: String(i.price),
      tax_rate: String(i.tax),
      line_total: String(i.qty * i.price),
      image_search_query: i.query,
      is_expense: false,
    })),
    {
      invoice_id: invoice.id,
      position: shipping.pos,
      description: shipping.desc,
      quantity: String(shipping.qty),
      unit_price: String(shipping.price),
      tax_rate: String(shipping.tax),
      line_total: String(shippingTotal),
      image_search_query: null,
      is_expense: true,
    },
  ];

  await db.insert(line_items).values(allItems);

  // 5. Payment info
  await db.insert(payment_info).values({
    invoice_id: invoice.id,
    iban: "DE89 3704 0044 0532 0130 00",
    swift: "COBADEFFXXX",
    bank_name: "Commerzbank",
    terms: "Zahlbar innerhalb 30 Tagen",
  });

  console.log("Seed complete!");
  console.log(`Invoice ID: ${invoice.id}`);
  console.log(`Invoice:    DEMO-2025-001`);
  console.log(`Items:      5 products + 1 shipping expense`);
  console.log(`Total:      ${total.toFixed(2)} EUR`);
  console.log();
  console.log("Breakdown:");
  for (const i of items) {
    console.log(`  ${i.pos}. ${i.desc.padEnd(30)} ×${String(i.qty).padStart(2)}  @ ${String(i.price).padStart(6)}.00  = ${String(i.qty * i.price).padStart(6)}.00 EUR`);
  }
  console.log(`  ${shipping.pos}. ${shipping.desc.padEnd(30)} ×${String(shipping.qty).padStart(2)}  @ ${String(shipping.price).padStart(6)}.00  = ${String(shippingTotal).padStart(6)}.00 EUR  (expense)`);
  console.log(`  ${"".padEnd(30)}              Subtotal = ${String(subtotal).padStart(6)}.00 EUR`);
  console.log(`  ${"".padEnd(30)}             Tax (19%) = ${taxAmount.toFixed(2).padStart(6)} EUR`);
  console.log(`  ${"".padEnd(30)}                Total = ${total.toFixed(2).padStart(6)} EUR`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
