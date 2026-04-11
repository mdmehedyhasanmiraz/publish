-- Remove multi-tenant publisher/membership model.
-- Roles/authorization are handled solely via public.profiles (platform roles).
--
-- This migration:
-- - Drops RLS policies that depend on publisher_id / is_publisher_admin / memberships
-- - Drops publisher_id columns + related constraints
-- - Drops publishers + memberships tables and membership_role enum
-- - Replaces basic RLS with platform-admin checks (is_platform_admin)

do $$
declare
  c record;
begin
  -- Drop policies referencing publisher_id / memberships-based functions.
  if to_regclass('public.journals') is not null then
    execute 'drop policy if exists journals_insert_admin on public.journals';
    execute 'drop policy if exists journals_update_admin on public.journals';
    execute 'drop policy if exists journals_read on public.journals';
  end if;

  if to_regclass('public.volumes') is not null then
    execute 'drop policy if exists volumes_read on public.volumes';
    execute 'drop policy if exists volumes_insert_admin on public.volumes';
    execute 'drop policy if exists volumes_update_admin on public.volumes';
  end if;

  if to_regclass('public.issues') is not null then
    execute 'drop policy if exists issues_read on public.issues';
    execute 'drop policy if exists issues_insert_admin on public.issues';
    execute 'drop policy if exists issues_update_admin on public.issues';
  end if;

  if to_regclass('public.submissions') is not null then
    execute 'drop policy if exists submissions_read on public.submissions';
    execute 'drop policy if exists submissions_write on public.submissions';
  end if;

  if to_regclass('public.memberships') is not null then
    execute 'drop policy if exists memberships_select_self on public.memberships';
  end if;

  -- Drop storage/submission_files policies that depend on publisher_id via helper functions.
  if to_regclass('public.submission_files') is not null then
    execute 'drop policy if exists submission_files_read on public.submission_files';
    execute 'drop policy if exists submission_files_write on public.submission_files';
    execute 'drop policy if exists submission_files_delete on public.submission_files';
  end if;
end $$;

-- Replace storage policies to rely on author ownership or platform admin only.
do $$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists data_submissions_read on storage.objects';
    execute 'drop policy if exists data_submissions_insert on storage.objects';
    execute 'drop policy if exists data_submissions_delete on storage.objects';
  end if;
end $$;

-- Helper: extract submission_id from object name (keep; does not depend on publishers).
create or replace function public.submission_id_from_object_name(object_name text)
returns uuid
language sql
stable
as $$
  select nullif(split_part(object_name, '/', 2), '')::uuid;
$$;

-- Ensure submission author helper exists (used by storage + submission_files RLS).
create or replace function public.is_submission_author(check_user uuid, check_submission uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.submissions
    where id = check_submission and owner_user_id = check_user
  );
$$;

-- New submission_files policies (author or platform admin).
do $$
begin
  if to_regclass('public.submission_files') is not null then
    execute $sql$
      create policy submission_files_read
      on public.submission_files for select
      using (
        public.is_submission_author(auth.uid(), submission_id)
        or public.is_platform_admin(auth.uid())
      )
    $sql$;

    execute $sql$
      create policy submission_files_write
      on public.submission_files for insert
      with check (
        public.is_submission_author(auth.uid(), submission_id)
        or public.is_platform_admin(auth.uid())
      )
    $sql$;

    execute $sql$
      create policy submission_files_delete
      on public.submission_files for delete
      using (
        public.is_submission_author(auth.uid(), submission_id)
        or public.is_platform_admin(auth.uid())
      )
    $sql$;
  end if;
end $$;

-- New storage object policies for bucket "data" restricted to submission paths.
do $$
begin
  if to_regclass('storage.objects') is not null then
    execute $sql$
      create policy data_submissions_read
      on storage.objects for select
      using (
        bucket_id = 'data'
        and split_part(name, '/', 1) = 'submissions'
        and (
          public.is_submission_author(auth.uid(), public.submission_id_from_object_name(name))
          or public.is_platform_admin(auth.uid())
        )
      )
    $sql$;

    execute $sql$
      create policy data_submissions_insert
      on storage.objects for insert
      with check (
        bucket_id = 'data'
        and split_part(name, '/', 1) = 'submissions'
        and (
          public.is_submission_author(auth.uid(), public.submission_id_from_object_name(name))
          or public.is_platform_admin(auth.uid())
        )
      )
    $sql$;

    execute $sql$
      create policy data_submissions_delete
      on storage.objects for delete
      using (
        bucket_id = 'data'
        and split_part(name, '/', 1) = 'submissions'
        and (
          public.is_submission_author(auth.uid(), public.submission_id_from_object_name(name))
          or public.is_platform_admin(auth.uid())
        )
      )
    $sql$;
  end if;
end $$;

-- New journals/volumes/issues read/admin-write policies (platform admin only for writes).
do $$
begin
  if to_regclass('public.journals') is not null then
    execute 'create policy journals_read on public.journals for select using (true)';
    execute 'create policy journals_insert_admin on public.journals for insert with check (public.is_platform_admin(auth.uid()))';
    execute 'create policy journals_update_admin on public.journals for update using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()))';
  end if;

  if to_regclass('public.volumes') is not null then
    execute 'create policy volumes_read on public.volumes for select using (true)';
    execute 'create policy volumes_insert_admin on public.volumes for insert with check (public.is_platform_admin(auth.uid()))';
    execute 'create policy volumes_update_admin on public.volumes for update using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()))';
  end if;

  if to_regclass('public.issues') is not null then
    execute 'create policy issues_read on public.issues for select using (true)';
    execute 'create policy issues_insert_admin on public.issues for insert with check (public.is_platform_admin(auth.uid()))';
    execute 'create policy issues_update_admin on public.issues for update using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()))';
  end if;
end $$;

-- Submissions policies: authors manage their own; platform admin can manage all.
do $$
begin
  if to_regclass('public.submissions') is not null then
    execute $sql$
      create policy submissions_read
      on public.submissions for select
      using (owner_user_id = auth.uid() or public.is_platform_admin(auth.uid()))
    $sql$;

    execute $sql$
      create policy submissions_write
      on public.submissions for all
      using (owner_user_id = auth.uid() or public.is_platform_admin(auth.uid()))
      with check (owner_user_id = auth.uid() or public.is_platform_admin(auth.uid()))
    $sql$;
  end if;
end $$;

-- Drop publisher_id columns + related constraints/fks, then drop publishers/memberships.
do $$
declare
  t text;
  con record;
begin
  foreach t in array array[
    'journals',
    'submissions',
    'submission_files',
    'review_rounds',
    'reviewer_invitations',
    'editor_decisions',
    'volumes',
    'issues',
    'articles',
    'search_documents',
    'openalex_matches',
    'email_events',
    'audit_logs'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      -- Drop any foreign keys / constraints that reference publishers via publisher_id.
      for con in
        select c.conname
        from pg_constraint c
        join pg_class r on r.oid = c.conrelid
        join pg_namespace n on n.oid = r.relnamespace
        where n.nspname = 'public'
          and r.relname = t
          and c.contype in ('f','u','c')
          and pg_get_constraintdef(c.oid) ilike '%publisher_id%'
      loop
        execute format('alter table public.%I drop constraint if exists %I', t, con.conname);
      end loop;

      -- Drop the publisher_id column if present.
      if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = t and column_name = 'publisher_id'
      ) then
        execute format('alter table public.%I drop column if exists publisher_id', t);
      end if;
    end if;
  end loop;

  -- Journals uniqueness: old model used unique(publisher_id, slug); enforce unique(slug).
  if to_regclass('public.journals') is not null then
    -- If a unique constraint remains that includes slug, drop it; we will enforce via unique index.
    for con in
      select c.conname
      from pg_constraint c
      join pg_class r on r.oid = c.conrelid
      join pg_namespace n on n.oid = r.relnamespace
      where n.nspname = 'public'
        and r.relname = 'journals'
        and c.contype = 'u'
        and pg_get_constraintdef(c.oid) ilike '%slug%'
    loop
      execute format('alter table public.journals drop constraint if exists %I', con.conname);
    end loop;
    execute 'create unique index if not exists journals_slug_unique_idx on public.journals (slug)';
  end if;
end $$;

-- Drop legacy helper functions that relied on memberships/publishers.
drop function if exists public.is_publisher_admin(uuid, uuid);
drop function if exists public.has_journal_role(uuid, uuid, public.membership_role);
drop function if exists public.is_submission_publisher_admin(uuid, uuid);

-- Drop memberships + publishers (if present).
drop table if exists public.memberships;
drop table if exists public.publishers;

-- Drop membership_role enum (no longer used).
drop type if exists public.membership_role;
