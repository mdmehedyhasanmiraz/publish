-- Normalize affiliations to profile_affiliations and remove affiliation columns from profiles.

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

create index if not exists idx_profile_affiliations_user on public.profile_affiliations(user_id);

alter table public.profile_affiliations enable row level security;

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

drop policy if exists profile_affiliations_delete_own_or_admin on public.profile_affiliations;
create policy profile_affiliations_delete_own_or_admin
on public.profile_affiliations for delete
using (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

-- Backfill one affiliation row from legacy columns when present.
insert into public.profile_affiliations (
  user_id,
  institution_name,
  department,
  position_title,
  is_primary
)
select
  p.user_id,
  p.institution_name,
  p.department,
  p.position_title,
  true
from public.profiles p
where p.institution_name is not null
  and trim(p.institution_name) <> ''
on conflict do nothing;

alter table public.profiles drop column if exists institution_name;
alter table public.profiles drop column if exists department;
alter table public.profiles drop column if exists faculty;
alter table public.profiles drop column if exists position_title;
alter table public.profiles drop column if exists institutional_email;

