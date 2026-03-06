import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  vendors,
  customers,
  invoices,
  line_items,
  payment_info,
  additional_expenses,
} from "./schema";

// Row types (equivalent to Tables<"tableName">)
export type Vendor = InferSelectModel<typeof vendors>;
export type Customer = InferSelectModel<typeof customers>;
export type Invoice = InferSelectModel<typeof invoices>;
export type LineItem = InferSelectModel<typeof line_items>;
export type PaymentInfo = InferSelectModel<typeof payment_info>;
export type AdditionalExpense = InferSelectModel<typeof additional_expenses>;

// API response types (numeric strings converted to number by API routes)
export type InvoiceRow = Omit<Invoice, "subtotal" | "tax_amount" | "total" | "global_margin" | "exchange_rate"> & {
  subtotal: number;
  tax_amount: number;
  total: number;
  global_margin: number | null;
  exchange_rate: number | null;
};

export type LineItemRow = Omit<
  LineItem,
  "quantity" | "unit_price" | "tax_rate" | "line_total"
> & {
  quantity: number;
  unit_price: number;
  tax_rate: number | null;
  line_total: number;
};

export type AdditionalExpenseRow = Omit<AdditionalExpense, "amount" | "amount_original"> & {
  amount: number;
  amount_original: number | null;
};

// Insert types (equivalent to TablesInsert<"tableName">)
export type NewVendor = InferInsertModel<typeof vendors>;
export type NewCustomer = InferInsertModel<typeof customers>;
export type NewInvoice = InferInsertModel<typeof invoices>;
export type NewLineItem = InferInsertModel<typeof line_items>;
export type NewPaymentInfo = InferInsertModel<typeof payment_info>;
export type NewAdditionalExpense = InferInsertModel<typeof additional_expenses>;
