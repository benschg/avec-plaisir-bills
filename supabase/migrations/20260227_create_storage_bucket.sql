-- Create storage bucket for invoice PDF files
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', true);

-- Allow anonymous uploads and reads for local development
create policy "Allow anonymous uploads"
  on storage.objects for insert
  with check (bucket_id = 'invoices');

create policy "Allow anonymous reads"
  on storage.objects for select
  using (bucket_id = 'invoices');

create policy "Allow anonymous deletes"
  on storage.objects for delete
  using (bucket_id = 'invoices');
