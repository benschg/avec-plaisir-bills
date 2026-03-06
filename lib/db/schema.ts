import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  numeric,
  smallint,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    address: text("address").notNull(),
    tax_id: text("tax_id"),
    email: text("email"),
    phone: text("phone"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_vendors_name").on(table.name)]
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    address: text("address").notNull(),
    tax_id: text("tax_id"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_customers_name").on(table.name)]
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    file_name: text("file_name").notNull(),
    invoice_number: text("invoice_number").notNull(),
    invoice_date: date("invoice_date"),
    due_date: date("due_date"),
    currency: text("currency").notNull().default("EUR"),
    vendor_id: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    customer_id: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    tax_amount: numeric("tax_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    raw_extraction: jsonb("raw_extraction").notNull(),
    file_path: text("file_path"),
    global_margin: numeric("global_margin", { precision: 5, scale: 1 }).default("100"),
    global_mwst: text("global_mwst").default("8.1"),
    exchange_rate: numeric("exchange_rate", { precision: 12, scale: 6 }).default("1"),
    item_final_prices: jsonb("item_final_prices"),
    item_mwst: jsonb("item_mwst"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_invoices_invoice_number").on(table.invoice_number),
    index("idx_invoices_created_at").on(table.created_at),
    index("idx_invoices_vendor_id").on(table.vendor_id),
    index("idx_invoices_customer_id").on(table.customer_id),
  ]
);

export const line_items = pgTable(
  "line_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoice_id: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    position: smallint("position"),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 4 })
      .notNull()
      .default("0"),
    unit_price: numeric("unit_price", { precision: 12, scale: 4 })
      .notNull()
      .default("0"),
    tax_rate: numeric("tax_rate", { precision: 5, scale: 2 }),
    line_total: numeric("line_total", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    image_search_query: text("image_search_query"),
    is_expense: boolean("is_expense").notNull().default(false),
  },
  (table) => [index("idx_line_items_invoice_id").on(table.invoice_id)]
);

export const payment_info = pgTable(
  "payment_info",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoice_id: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" })
      .unique(),
    iban: text("iban"),
    swift: text("swift"),
    bank_name: text("bank_name"),
    terms: text("terms"),
  },
  (table) => [index("idx_payment_info_invoice_id").on(table.invoice_id)]
);

export const app_users = pgTable("app_users", {
  email: text("email").primaryKey(),
  id: text("id"),
  name: text("name"),
  image: text("image"),
  role: text("role", { enum: ["admin", "editor", "viewer", "no_access"] })
    .notNull()
    .default("no_access"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const additional_expenses = pgTable("additional_expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoice_id: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").notNull().default("CHF"),
  amount_original: numeric("amount_original"),
  currency_original: text("currency_original"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
