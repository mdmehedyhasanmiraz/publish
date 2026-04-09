-- Comprehensive scholarly profiles + ORCID connectivity.
-- This migration is designed for journal publishing workflows.

create extension if not exists citext;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum (
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

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'author',

  -- Identity / contact
  salutation text,
  first_name text not null default '',
  middle_name text,
  last_name text not null default '',
  suffix text,
  display_name text,
  email citext,
  alternate_email citext,
  phone text,
  whatsapp text,

  -- Professional identity
  orcid_id text,
  scopus_author_id text,
  wos_researcher_id text,
  google_scholar_url text,
  loop_profile_url text,
  publons_url text,

  -- Affiliation (current)
  institution_name text,
  department text,
  faculty text,
  position_title text,
  institutional_email citext,

  -- Location
  address_line1 text,
  address_line2 text,
  city text,
  state_region text,
  postal_code text,
  country_code char(2),
  timezone text,

  -- Scholarly profile
  biography text,
  degrees text[],
  expertise_keywords text[] not null default '{}',
  research_areas text[] not null default '{}',
  reviewer_interests text[] not null default '{}',
  methods text[] not null default '{}',
  publication_interests text[] not null default '{}',
  languages text[] not null default '{}',

  -- Editorial/reviewer preferences
  accepts_review_invites boolean not null default false,
  available_for_review boolean not null default true,
  max_reviews_per_month int,
  preferred_review_model text, -- single_blind / double_blind / open
  review_turnaround_days int,
  conflict_of_interest_statement text,

  -- Compliance / preferences
  email_opt_in boolean not null default true,
  marketing_opt_in boolean not null default false,
  data_processing_consent_at timestamptz,
  ethics_training_completed_at timestamptz,

  -- Flexible extensions
  metadata jsonb not null default '{}'::jsonb,
  editorial_preferences jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_orcid_format_chk
    check (orcid_id is null or orcid_id ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$')
);

create table if not exists profile_affiliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
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

create table if not exists profile_subject_classifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  scheme text not null default 'custom', -- e.g., ASJC, MeSH, custom
  code text,
  label text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists orcid_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(user_id) on delete cascade,
  orcid_id text not null,
  connection_status text not null default 'connected', -- connected / revoked / expired
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

create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_country on profiles(country_code);
create index if not exists idx_profiles_orcid on profiles(orcid_id);
create index if not exists idx_profiles_keywords_gin on profiles using gin (expertise_keywords);
create index if not exists idx_profiles_research_areas_gin on profiles using gin (research_areas);
create index if not exists idx_profile_affiliations_user on profile_affiliations(user_id);
create index if not exists idx_profile_subjects_user on profile_subject_classifications(user_id);
create index if not exists idx_orcid_connections_user on orcid_connections(user_id);
create index if not exists idx_orcid_connections_orcid on orcid_connections(orcid_id);

create or replace function set_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
before update on profiles
for each row execute function set_timestamp_updated_at();

drop trigger if exists trg_orcid_connections_updated_at on orcid_connections;
create trigger trg_orcid_connections_updated_at
before update on orcid_connections
for each row execute function set_timestamp_updated_at();

create or replace function is_platform_admin(check_user uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from profiles p
    where p.user_id = check_user and p.role = 'admin'
  );
$$;

-- Auto-create profile when auth user signs up.
create or replace function handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_role app_role;
begin
  signup_role := case
    when coalesce(new.raw_user_meta_data ->> 'role', '') in ('author', 'reviewer') then
      (new.raw_user_meta_data ->> 'role')::app_role
    else
      'author'::app_role
  end;

  insert into public.profiles (
    user_id,
    email,
    first_name,
    last_name,
    display_name,
    role
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    signup_role
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function handle_new_auth_user_profile();

alter table profiles enable row level security;
alter table profile_affiliations enable row level security;
alter table profile_subject_classifications enable row level security;
alter table orcid_connections enable row level security;

drop policy if exists profiles_select_own_or_admin on profiles;
create policy profiles_select_own_or_admin
on profiles for select
using (auth.uid() = user_id or is_platform_admin(auth.uid()));

drop policy if exists profiles_insert_own_or_admin on profiles;
create policy profiles_insert_own_or_admin
on profiles for insert
with check (auth.uid() = user_id or is_platform_admin(auth.uid()));

drop policy if exists profiles_update_own_or_admin on profiles;
create policy profiles_update_own_or_admin
on profiles for update
using (auth.uid() = user_id or is_platform_admin(auth.uid()))
with check (auth.uid() = user_id or is_platform_admin(auth.uid()));

drop policy if exists profile_affiliations_select_own_or_admin on profile_affiliations;
create policy profile_affiliations_select_own_or_admin
on profile_affiliations for select
using (auth.uid() = user_id or is_platform_admin(auth.uid()));

drop policy if exists profile_affiliations_insert_own_or_admin on profile_affiliations;
create policy profile_affiliations_insert_own_or_admin
on profile_affiliations for insert
with check (auth.uid() = user_id or is_platform_admin(auth.uid()));

drop policy if exists profile_affiliations_update_own_or_admin on profile_affiliations;
create policy profile_affiliations_update_own_or_admin
on profile_affiliations for update
using (auth.uid() = user_id or is_platform_admin(auth.uid()))
with check (auth.uid() = user_id or is_platform_admin(auth.uid()));

drop policy if exists profile_subjects_select_own_or_admin on profile_subject_classifications;
create policy profile_subjects_select_own_or_admin
on profile_subject_classifications for select
using (auth.uid() = user_id or is_platform_admin(auth.uid()));

drop policy if exists profile_subjects_insert_own_or_admin on profile_subject_classifications;
create policy profile_subjects_insert_own_or_admin
on profile_subject_classifications for insert
with check (auth.uid() = user_id or is_platform_admin(auth.uid()));

drop policy if exists profile_subjects_update_own_or_admin on profile_subject_classifications;
create policy profile_subjects_update_own_or_admin
on profile_subject_classifications for update
using (auth.uid() = user_id or is_platform_admin(auth.uid()))
with check (auth.uid() = user_id or is_platform_admin(auth.uid()));

drop policy if exists orcid_connections_select_own_or_admin on orcid_connections;
create policy orcid_connections_select_own_or_admin
on orcid_connections for select
using (auth.uid() = user_id or is_platform_admin(auth.uid()));

drop policy if exists orcid_connections_insert_own_or_admin on orcid_connections;
create policy orcid_connections_insert_own_or_admin
on orcid_connections for insert
with check (auth.uid() = user_id or is_platform_admin(auth.uid()));

drop policy if exists orcid_connections_update_own_or_admin on orcid_connections;
create policy orcid_connections_update_own_or_admin
on orcid_connections for update
using (auth.uid() = user_id or is_platform_admin(auth.uid()))
with check (auth.uid() = user_id or is_platform_admin(auth.uid()));
