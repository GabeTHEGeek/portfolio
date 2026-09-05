create extension if not exists pgcrypto;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  content text not null,
  source_url text,
  source_type text not null check (char_length(trim(source_type)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_documents_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_documents_updated_at();

alter table public.documents enable row level security;

-- Secret API keys assume the service_role database role. PostgreSQL grants are
-- checked before RLS, so explicitly grant only the access Phase 1 requires.
grant usage on schema public to service_role;
grant select on table public.documents to service_role;

-- Intentionally no anon/authenticated policies in Phase 1. The server-only
-- Supabase secret key bypasses RLS; browser clients cannot read this table.
