create table if not exists public.article_views (
  slug text primary key check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  view_count bigint not null default 0 check (view_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.article_views enable row level security;

grant usage on schema public to service_role;
grant select, insert, update on table public.article_views to service_role;

create or replace function public.increment_article_view(p_slug text)
returns bigint
language sql
set search_path = ''
as $$
  insert into public.article_views (slug, view_count)
  values (p_slug, 1)
  on conflict (slug) do update
    set view_count = public.article_views.view_count + 1,
        updated_at = now()
  returning view_count;
$$;

revoke all on function public.increment_article_view(text) from public, anon, authenticated;
grant execute on function public.increment_article_view(text) to service_role;

comment on table public.article_views is
  'Aggregate public article view counts. No visitor identifiers or IP addresses are stored.';
