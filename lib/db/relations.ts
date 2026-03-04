import { relations } from "drizzle-orm";
import {
  vendors,
  customers,
  invoices,
  line_items,
  payment_info,
  additional_expenses,
} from "./schema";

export const vendorsRelations = relations(vendors, ({ many }) => ({
  invoices: many(invoices),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  vendors: one(vendors, {
    fields: [invoices.vendor_id],
    references: [vendors.id],
  }),
  customers: one(customers, {
    fields: [invoices.customer_id],
    references: [customers.id],
  }),
  line_items: many(line_items),
  payment_info: one(payment_info),
  additional_expenses: many(additional_expenses),
}));

export const lineItemsRelations = relations(line_items, ({ one }) => ({
  invoice: one(invoices, {
    fields: [line_items.invoice_id],
    references: [invoices.id],
  }),
}));

export const paymentInfoRelations = relations(payment_info, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payment_info.invoice_id],
    references: [invoices.id],
  }),
}));

export const additionalExpensesRelations = relations(
  additional_expenses,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [additional_expenses.invoice_id],
      references: [invoices.id],
    }),
  })
);
