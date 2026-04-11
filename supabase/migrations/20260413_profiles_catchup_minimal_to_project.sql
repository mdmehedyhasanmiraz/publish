-- Align a minimal / starter `profiles` table with this repo’s expected schema.
-- Safe to run on Supabase: uses IF NOT EXISTS / idempotent patterns where possible.
--
-- Your current table is missing:
--   - Scholarly / editorial columns from migration 3
--   - `available_for_review` (required by app settings + sync_profile_from_auth_user in 20260412)

create extension if not exists citext;

-- Ensure app_role has every label this app uses (skip errors if already present).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum (
      'admin',
      'author',
      'reviewer',
      'editor_in_chief',
      'managing_editor',
      'associate_editor',
      'production_editor',
      'copyeditor',
      'typesetter'
    );
  end if;
end $$;

-- PostgreSQL 15+ (Supabase): add any missing enum values.
alter type public.app_role add value if not exists 'admin';
alter type public.app_role add value if not exists 'author';
alter type public.app_role add value if not exists 'reviewer';
alter type public.app_role add value if not exists 'editor_in_chief';
alter type public.app_role add value if not exists 'managing_editor';
alter type public.app_role add value if not exists 'associate_editor';
alter type public.app_role add value if not exists 'production_editor';
alter type public.app_role add value if not exists 'copyeditor';
alter type public.app_role add value if not exists 'typesetter';

-- Identity / contact (migration 3)
alter table public.profiles add column if not exists salutation text;
alter table public.profiles add column if not exists middle_name text;
alter table public.profiles add column if not exists suffix text;
alter table public.profiles add column if not exists alternate_email citext;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists whatsapp text;

-- Professional identity
alter table public.profiles add column if not exists orcid_id text;
alter table public.profiles add column if not exists scopus_author_id text;
alter table public.profiles add column if not exists wos_researcher_id text;
alter table public.profiles add column if not exists google_scholar_url text;
alter table public.profiles add column if not exists loop_profile_url text;
alter table public.profiles add column if not exists publons_url text;

-- Affiliation
alter table public.profiles add column if not exists institution_name text;
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists faculty text;
alter table public.profiles add column if not exists position_title text;
alter table public.profiles add column if not exists institutional_email citext;

-- Location
alter table public.profiles add column if not exists address_line1 text;
alter table public.profiles add column if not exists address_line2 text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists state_region text;
alter table public.profiles add column if not exists postal_code text;
alter table public.profiles add column if not exists country_code char(2);
alter table public.profiles add column if not exists timezone text;

-- Scholarly profile
alter table public.profiles add column if not exists biography text;
alter table public.profiles add column if not exists degrees text[];
alter table public.profiles add column if not exists expertise_keywords text[] not null default '{}'::text[];
alter table public.profiles add column if not exists research_areas text[] not null default '{}'::text[];
alter table public.profiles add column if not exists reviewer_interests text[] not null default '{}'::text[];
alter table public.profiles add column if not exists methods text[] not null default '{}'::text[];
alter table public.profiles add column if not exists publication_interests text[] not null default '{}'::text[];
alter table public.profiles add column if not exists languages text[] not null default '{}'::text[];

-- Editorial / reviewer preferences (app + auth sync use available_for_review)
alter table public.profiles add column if not exists accepts_review_invites boolean not null default false;
alter table public.profiles add column if not exists available_for_review boolean not null default true;
alter table public.profiles add column if not exists max_reviews_per_month int;
alter table public.profiles add column if not exists preferred_review_model text;
alter table public.profiles add column if not exists review_turnaround_days int;
alter table public.profiles add column if not exists conflict_of_interest_statement text;

-- Compliance / preferences
alter table public.profiles add column if not exists email_opt_in boolean not null default true;
alter table public.profiles add column if not exists marketing_opt_in boolean not null default false;
alter table public.profiles add column if not exists data_processing_consent_at timestamptz;
alter table public.profiles add column if not exists ethics_training_completed_at timestamptz;

-- Extensions
alter table public.profiles add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists editorial_preferences jsonb not null default '{}'::jsonb;

-- Multi-role (migration 7) — you likely already have these; keep idempotent
alter table public.profiles add column if not exists roles public.app_role[] not null default '{}'::public.app_role[];
alter table public.profiles add column if not exists active_role public.app_role;

-- Backfill roles / active_role when empty
update public.profiles
set
  roles = case
    when roles is null or cardinality(roles) = 0 then array[role]::public.app_role[]
    else roles
  end,
  active_role = coalesce(active_role, role)
where roles is null or cardinality(roles) = 0 or active_role is null;

alter table public.profiles
  drop constraint if exists profiles_active_role_in_roles_chk;

alter table public.profiles
  add constraint profiles_active_role_in_roles_chk
  check (active_role is null or active_role = any (roles));

alter table public.profiles
  drop constraint if exists profiles_orcid_format_chk;

alter table public.profiles
  add constraint profiles_orcid_format_chk
  check (orcid_id is null or orcid_id ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$');

-- Indexes from migration 3
create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_country on public.profiles (country_code);
create index if not exists idx_profiles_orcid on public.profiles (orcid_id);
create index if not exists idx_profiles_keywords_gin on public.profiles using gin (expertise_keywords);
create index if not exists idx_profiles_research_areas_gin on public.profiles using gin (research_areas);

-- updated_at trigger (name used in repo migrations)
create or replace function public.set_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_timestamp_updated_at();

-- Helper for RLS policies
create or replace function public.is_platform_admin(check_user uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = check_user and p.role = 'admin'
  );
$$;

-- Related tables (migration 3) — no-op if already present
create table if not exists public.profile_affiliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  institution_name text not null,
  department text,
  position_title text,
  city text,
  country_code char(2),
  start_date date,
  end_date date,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_subject_classifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  scheme text not null default 'custom',
  code text,
  label text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.orcid_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(user_id) on delete cascade,
  orcid_id text not null,
  connection_status text not null default 'connected',
  scope text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  id_token text,
  last_synced_at timestamptz,
  raw_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orcid_connections_orcid_format_chk
    check (orcid_id ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$')
);

drop trigger if exists trg_orcid_connections_updated_at on public.orcid_connections;
create trigger trg_orcid_connections_updated_at
before update on public.orcid_connections
for each row execute function public.set_timestamp_updated_at();

create index if not exists idx_profile_affiliations_user on public.profile_affiliations(user_id);
create index if not exists idx_profile_subjects_user on public.profile_subject_classifications(user_id);
create index if not exists idx_orcid_connections_user on public.orcid_connections(user_id);
create index if not exists idx_orcid_connections_orcid on public.orcid_connections(orcid_id);

alter table public.profile_affiliations enable row level security;
alter table public.profile_subject_classifications enable row level security;
alter table public.orcid_connections enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles for select
using (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

drop policy if exists profiles_insert_own_or_admin on public.profiles;
create policy profiles_insert_own_or_admin
on public.profiles for insert
with check (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles for update
using (auth.uid() = user_id or public.is_platform_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

drop policy if exists profile_affiliations_select_own_or_admin on public.profile_affiliations;
create policy profile_affiliations_select_own_or_admin
on public.profile_affiliations for select
using (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

drop policy if exists profile_affiliations_insert_own_or_admin on public.profile_affiliations;
create policy profile_affiliations_insert_own_or_admin
on public.profile_affiliations for insert
with check (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

drop policy if exists profile_affiliations_update_own_or_admin on public.profile_affiliations;
create policy profile_affiliations_update_own_or_admin
on public.profile_affiliations for update
using (auth.uid() = user_id or public.is_platform_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

drop policy if exists profile_subjects_select_own_or_admin on public.profile_subject_classifications;
create policy profile_subjects_select_own_or_admin
on public.profile_subject_classifications for select
using (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

drop policy if exists profile_subjects_insert_own_or_admin on public.profile_subject_classifications;
create policy profile_subjects_insert_own_or_admin
on public.profile_subject_classifications for insert
with check (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

drop policy if exists profile_subjects_update_own_or_admin on public.profile_subject_classifications;
create policy profile_subjects_update_own_or_admin
on public.profile_subject_classifications for update
using (auth.uid() = user_id or public.is_platform_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

drop policy if exists orcid_connections_select_own_or_admin on public.orcid_connections;
create policy orcid_connections_select_own_or_admin
on public.orcid_connections for select
using (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

drop policy if exists orcid_connections_insert_own_or_admin on public.orcid_connections;
create policy orcid_connections_insert_own_or_admin
on public.orcid_connections for insert
with check (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

drop policy if exists orcid_connections_update_own_or_admin on public.orcid_connections;
create policy orcid_connections_update_own_or_admin
on public.orcid_connections for update
using (auth.uid() = user_id or public.is_platform_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

alter table public.profiles enable row level security;

-- Auth sync: matches 8_profile_available_for_review + 9_baseline_author_reviewer_roles (author + reviewer always in roles).
create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  derived_role app_role;
  meta_available text;
  derived_available boolean;
begin
  derived_role := case
    when coalesce(new.raw_user_meta_data ->> 'role', '') in (
      'admin',
      'author',
      'reviewer',
      'editor_in_chief',
      'managing_editor',
      'associate_editor',
      'production_editor',
      'copyeditor',
      'typesetter'
    ) then (new.raw_user_meta_data ->> 'role')::app_role
    else 'author'::app_role
  end;

  meta_available := new.raw_user_meta_data ->> 'available_for_review';
  derived_available := case
    when meta_available is null then null
    when lower(meta_available) in ('true', 't', '1', 'yes') then true
    when lower(meta_available) in ('false', 'f', '0', 'no') then false
    else null
  end;

  insert into public.profiles (
    user_id,
    email,
    first_name,
    last_name,
    display_name,
    role,
    roles,
    active_role,
    available_for_review
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    derived_role,
    (
      select coalesce(array_agg(distinct r), '{}'::app_role[])
      from unnest(array[derived_role, 'author'::app_role, 'reviewer'::app_role]) as r
    ),
    derived_role,
    coalesce(derived_available, false)
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    display_name = excluded.display_name,
    role = excluded.role,
    roles = (
      select coalesce(array_agg(distinct r), '{}'::app_role[])
      from unnest(
        coalesce(profiles.roles, '{}'::app_role[])
        || array[excluded.role, 'author'::app_role, 'reviewer'::app_role]
      ) as r
    ),
    active_role = coalesce(profiles.active_role, excluded.role),
    available_for_review = case
      when derived_available is not null then derived_available
      else profiles.available_for_review
    end,
    updated_at = now();

  return new;
end;
$$;

update public.profiles p
set roles = (
  select coalesce(array_agg(distinct r), '{}'::app_role[])
  from unnest(coalesce(p.roles, '{}'::app_role[]) || array['author'::app_role, 'reviewer'::app_role]) as r
);

drop trigger if exists on_auth_user_created_profile on auth.users;
drop trigger if exists on_auth_user_synced_profile on auth.users;

create trigger on_auth_user_synced_profile
after insert or update on auth.users
for each row execute function public.sync_profile_from_auth_user();
