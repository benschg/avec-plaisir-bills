CREATE TABLE additional_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'CHF',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE additional_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON additional_expenses FOR ALL USING (true) WITH CHECK (true);
