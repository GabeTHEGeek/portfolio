create extension if not exists vector with schema extensions;

create table if not exists public.document_chunks (
  id bigint generated always as identity primary key,
  document_id bigint not null references public.documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(trim(content)) > 0),
  title text not null,
  source_url text,
  source_type text not null,
  embedding extensions.vector(768) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists document_chunks_document_id_idx
  on public.document_chunks (document_id);

create index if not exists document_chunks_embedding_hnsw_idx
  on public.document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

drop trigger if exists document_chunks_set_updated_at on public.document_chunks;
create trigger document_chunks_set_updated_at
before update on public.document_chunks
for each row execute function public.set_documents_updated_at();

alter table public.document_chunks enable row level security;

grant select, insert, update, delete on table public.document_chunks to service_role;
grant usage, select on sequence public.document_chunks_id_seq to service_role;

create or replace function public.match_document_chunks(
  query_embedding extensions.vector(768),
  match_threshold double precision default 0.62,
  match_count integer default 5
)
returns table (
  id bigint,
  document_id bigint,
  chunk_index integer,
  content text,
  title text,
  source_url text,
  source_type text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    chunks.id,
    chunks.document_id,
    chunks.chunk_index,
    chunks.content,
    chunks.title,
    chunks.source_url,
    chunks.source_type,
    1 - (chunks.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.document_chunks as chunks
  where 1 - (chunks.embedding OPERATOR(extensions.<=>) query_embedding) >= match_threshold
  order by chunks.embedding OPERATOR(extensions.<=>) query_embedding
  limit least(greatest(match_count, 1), 10);
$$;

grant execute on function public.match_document_chunks(extensions.vector, double precision, integer)
  to service_role;

-- No anon/authenticated policies are added. Only server-side service-role calls
-- can write chunks or execute retrieval through the project API.
