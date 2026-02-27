ALTER TABLE public.line_items
  ADD COLUMN is_expense boolean NOT NULL DEFAULT false;
