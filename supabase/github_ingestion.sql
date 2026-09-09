alter table public.documents
  add column if not exists source_external_id text,
  add column if not exists source_status text not null default 'active',
  add column if not exists source_updated_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists removed_at timestamptz;

alter table public.documents
  drop constraint if exists documents_source_status_check;

alter table public.documents
  add constraint documents_source_status_check
  check (source_status in ('active', 'unavailable', 'removed'));

create unique index if not exists documents_source_external_id_unique_idx
  on public.documents (source_type, source_external_id)
  where source_external_id is not null;

comment on column public.documents.source_external_id is
  'Stable identifier assigned by the external source, such as a GitHub repository ID.';
comment on column public.documents.source_status is
  'Whether this source is active in retrieval, unavailable, or no longer approved.';
comment on column public.documents.source_updated_at is
  'Most recent update timestamp reported by the external source.';
comment on column public.documents.last_seen_at is
  'Most recent time the source appeared during successful discovery.';
comment on column public.documents.removed_at is
  'Time the source became unavailable or no longer approved for public retrieval.';

grant select, insert, update, delete on table public.documents to service_role;
