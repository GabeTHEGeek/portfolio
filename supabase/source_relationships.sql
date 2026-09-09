alter table public.documents
  add column if not exists related_project text,
  add column if not exists github_url text;

alter table public.document_chunks
  add column if not exists related_project text;

create index if not exists documents_related_project_idx
  on public.documents (related_project)
  where related_project is not null;

create index if not exists document_chunks_related_project_idx
  on public.document_chunks (related_project)
  where related_project is not null;

drop function if exists public.match_document_chunks(extensions.vector, double precision, integer);

create function public.match_document_chunks(
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
  related_project text,
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
    chunks.related_project,
    1 - (chunks.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.document_chunks as chunks
  where 1 - (chunks.embedding OPERATOR(extensions.<=>) query_embedding) >= match_threshold
  order by chunks.embedding OPERATOR(extensions.<=>) query_embedding
  limit least(greatest(match_count, 1), 10);
$$;

grant execute on function public.match_document_chunks(extensions.vector, double precision, integer)
  to service_role;

comment on column public.documents.related_project is
  'Stable portfolio project slug used to group project, article, and GitHub citations.';
comment on column public.documents.github_url is
  'Approved GitHub repository URL selected on a portfolio project.';
