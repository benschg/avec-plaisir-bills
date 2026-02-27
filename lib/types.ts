export interface VendorInfo {
  name: string;
  address: string;
  tax_id?: string;
  email?: string;
  phone?: string;
}

export interface CustomerInfo {
  name: string;
  address: string;
  tax_id?: string;
}

export interface LineItem {
  position?: number;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  line_total: number;
  image_search_query?: string;
  is_expense?: boolean;
}

export interface PaymentInfo {
  iban?: string;
  swift?: string;
  bank_name?: string;
  terms?: string;
}

export interface InvoiceData {
  vendor: VendorInfo;
  customer: CustomerInfo;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  currency: string;
  line_items: LineItem[];
  subtotal: number;
  tax_amount: number;
  total: number;
  payment_info?: PaymentInfo;
  notes?: string;
}

export interface ExtractionResult {
  success: boolean;
  data?: InvoiceData;
  error?: string;
}
