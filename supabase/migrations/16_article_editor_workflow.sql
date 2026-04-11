-- Scientific article editing workflow schema (markdown + shortcode assets).

create extension if not exists pgcrypto;

alter table public.articles
  add column if not exists doi text,
  add column if not exists abstract text,
  add column if not exists keywords text[] not null default '{}'::text[],
  add column if not exists published_at timestamptz;

create table if not exists public.article_versions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  version_number int not null,
  title text not null,
  abstract text,
  markdown_body text not null default '',
  workflow_status text not null default 'draft',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint article_versions_unique_number unique (article_id, version_number),
  constraint article_versions_status_chk check (workflow_status in ('draft', 'in_review', 'approved', 'published'))
);

alter table public.articles
  add column if not exists current_version_id uuid references public.article_versions(id) on delete set null;

create table if not exists public.article_assets (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  version_id uuid not null references public.article_versions(id) on delete cascade,
  asset_key text not null,
  asset_type text not null,
  caption text,
  alt_text text,
  table_markdown text,
  storage_path text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint article_assets_type_chk check (asset_type in ('figure', 'table')),
  constraint article_assets_key_unique unique (version_id, asset_key)
);

create table if not exists public.article_workflow_events (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  version_id uuid references public.article_versions(id) on delete set null,
  actor_user_id uuid not null,
  event_type text not null,
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_article_versions_article on public.article_versions(article_id);
create index if not exists idx_article_versions_status on public.article_versions(workflow_status);
create index if not exists idx_article_assets_article on public.article_assets(article_id);
create index if not exists idx_article_assets_version on public.article_assets(version_id);
create index if not exists idx_article_workflow_events_article on public.article_workflow_events(article_id);

create or replace function public.set_article_versions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_article_versions_updated_at on public.article_versions;
create trigger trg_article_versions_updated_at
before update on public.article_versions
for each row execute function public.set_article_versions_updated_at();

create or replace function public.can_edit_articles(check_user uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = check_user
      and (
        p.role in ('admin', 'editor_in_chief', 'managing_editor', 'associate_editor')
        or p.active_role in ('admin', 'editor_in_chief', 'managing_editor', 'associate_editor')
        or 'admin'::public.app_role = any(coalesce(p.roles, '{}'::public.app_role[]))
        or 'editor_in_chief'::public.app_role = any(coalesce(p.roles, '{}'::public.app_role[]))
        or 'managing_editor'::public.app_role = any(coalesce(p.roles, '{}'::public.app_role[]))
        or 'associate_editor'::public.app_role = any(coalesce(p.roles, '{}'::public.app_role[]))
      )
  );
$$;

alter table public.article_versions enable row level security;
alter table public.article_assets enable row level security;
alter table public.article_workflow_events enable row level security;

drop policy if exists articles_read_public_published_or_staff on public.articles;
create policy articles_read_public_published_or_staff
on public.articles for select
using (
  status = 'published'
  or public.can_edit_articles(auth.uid())
  or public.is_platform_admin(auth.uid())
);

drop policy if exists articles_write_staff on public.articles;
create policy articles_write_staff
on public.articles for all
using (public.can_edit_articles(auth.uid()) or public.is_platform_admin(auth.uid()))
with check (public.can_edit_articles(auth.uid()) or public.is_platform_admin(auth.uid()));

drop policy if exists article_versions_read_public_or_staff on public.article_versions;
create policy article_versions_read_public_or_staff
on public.article_versions for select
using (
  workflow_status = 'published'
  or public.can_edit_articles(auth.uid())
  or public.is_platform_admin(auth.uid())
);

drop policy if exists article_versions_write_staff on public.article_versions;
create policy article_versions_write_staff
on public.article_versions for all
using (public.can_edit_articles(auth.uid()) or public.is_platform_admin(auth.uid()))
with check (public.can_edit_articles(auth.uid()) or public.is_platform_admin(auth.uid()));

drop policy if exists article_assets_read_public_or_staff on public.article_assets;
create policy article_assets_read_public_or_staff
on public.article_assets for select
using (
  exists (
    select 1
    from public.article_versions av
    where av.id = version_id
      and av.workflow_status = 'published'
  )
  or public.can_edit_articles(auth.uid())
  or public.is_platform_admin(auth.uid())
);

drop policy if exists article_assets_write_staff on public.article_assets;
create policy article_assets_write_staff
on public.article_assets for all
using (public.can_edit_articles(auth.uid()) or public.is_platform_admin(auth.uid()))
with check (public.can_edit_articles(auth.uid()) or public.is_platform_admin(auth.uid()));

drop policy if exists article_workflow_events_read_staff on public.article_workflow_events;
create policy article_workflow_events_read_staff
on public.article_workflow_events for select
using (public.can_edit_articles(auth.uid()) or public.is_platform_admin(auth.uid()));

drop policy if exists article_workflow_events_write_staff on public.article_workflow_events;
create policy article_workflow_events_write_staff
on public.article_workflow_events for insert
with check (public.can_edit_articles(auth.uid()) or public.is_platform_admin(auth.uid()));

drop policy if exists data_articles_read on storage.objects;
create policy data_articles_read
on storage.objects for select
using (
  bucket_id = 'data'
  and split_part(name, '/', 1) = 'articles'
  and (
    public.can_edit_articles(auth.uid())
    or public.is_platform_admin(auth.uid())
    or exists (
      select 1
      from public.article_assets aa
      join public.article_versions av on av.id = aa.version_id
      where aa.storage_path = name
        and av.workflow_status = 'published'
    )
  )
);

drop policy if exists data_articles_insert on storage.objects;
create policy data_articles_insert
on storage.objects for insert
with check (
  bucket_id = 'data'
  and split_part(name, '/', 1) = 'articles'
  and (public.can_edit_articles(auth.uid()) or public.is_platform_admin(auth.uid()))
);

drop policy if exists data_articles_delete on storage.objects;
create policy data_articles_delete
on storage.objects for delete
using (
  bucket_id = 'data'
  and split_part(name, '/', 1) = 'articles'
  and (public.can_edit_articles(auth.uid()) or public.is_platform_admin(auth.uid()))
);

