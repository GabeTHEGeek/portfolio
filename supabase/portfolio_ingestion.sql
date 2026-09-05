alter table public.documents
  add column if not exists content_hash text,
  add column if not exists last_fetched_at timestamptz,
  add column if not exists last_changed_at timestamptz;

create unique index if not exists documents_source_url_unique_idx
  on public.documents (source_url)
  where source_url is not null;

grant select, insert, update, delete on table public.documents to service_role;
grant usage, select on sequence public.documents_id_seq to service_role;

comment on column public.documents.content_hash is
  'SHA-256 hash of normalized fetched content, used to avoid unnecessary embedding calls.';
comment on column public.documents.last_fetched_at is
  'Most recent successful fetch of the allowlisted source URL.';
comment on column public.documents.last_changed_at is
  'Most recent time normalized source content changed.';
