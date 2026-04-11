-- Keep public.profiles synchronized with auth.users (insert + update).
-- Adds multi-role columns (roles[], active_role) and merges prior sync + multi-role migrations.

-- If `profiles` already existed before migration 3, CREATE TABLE IF NOT EXISTS does not add
-- new columns — ensure columns this migration uses are present.
create extension if not exists citext;

alter table profiles add column if not exists email citext;
alter table profiles add column if not exists first_name text not null default '';
alter table profiles add column if not exists last_name text not null default '';
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists updated_at timestamptz not null default now();

-- Requires migration 3 (profiles + app_role).
alter table profiles
  add column if not exists roles app_role[] not null default '{}'::app_role[],
  add column if not exists active_role app_role;

-- Backfill rows created before multi-role support.
update profiles
set roles = case
    when array_length(roles, 1) is null then array[role]
    else roles
  end,
  active_role = coalesce(active_role, role);

alter table profiles
  drop constraint if exists profiles_active_role_in_roles_chk;

alter table profiles
  add constraint profiles_active_role_in_roles_chk
  check (active_role is null or active_role = any(roles));

-- Single auth sync function: roles merge on update; replaces handle_new_auth_user_profile from migration 3.
create or replace function sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  derived_role app_role;
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

  insert into public.profiles (
    user_id,
    email,
    first_name,
    last_name,
    display_name,
    role,
    roles,
    active_role
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    derived_role,
    array[derived_role],
    derived_role
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    display_name = excluded.display_name,
    role = excluded.role,
    roles = (
      select array_agg(distinct r)
      from unnest(coalesce(profiles.roles, '{}'::app_role[]) || array[excluded.role]) as r
    ),
    active_role = coalesce(profiles.active_role, excluded.role),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
drop trigger if exists on_auth_user_synced_profile on auth.users;

create trigger on_auth_user_synced_profile
after insert or update on auth.users
for each row execute function sync_profile_from_auth_user();

-- Backfill existing auth users into profiles (roles + active_role).
insert into public.profiles (
  user_id,
  email,
  first_name,
  last_name,
  display_name,
  role,
  roles,
  active_role
)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'first_name', ''),
  coalesce(u.raw_user_meta_data ->> 'last_name', ''),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
  case
    when coalesce(u.raw_user_meta_data ->> 'role', '') in (
      'admin',
      'author',
      'reviewer',
      'editor_in_chief',
      'managing_editor',
      'associate_editor',
      'production_editor',
      'copyeditor',
      'typesetter'
    ) then (u.raw_user_meta_data ->> 'role')::app_role
    else 'author'::app_role
  end,
  array[
    case
      when coalesce(u.raw_user_meta_data ->> 'role', '') in (
        'admin',
        'author',
        'reviewer',
        'editor_in_chief',
        'managing_editor',
        'associate_editor',
        'production_editor',
        'copyeditor',
        'typesetter'
      ) then (u.raw_user_meta_data ->> 'role')::app_role
      else 'author'::app_role
    end
  ]::app_role[],
  case
    when coalesce(u.raw_user_meta_data ->> 'role', '') in (
      'admin',
      'author',
      'reviewer',
      'editor_in_chief',
      'managing_editor',
      'associate_editor',
      'production_editor',
      'copyeditor',
      'typesetter'
    ) then (u.raw_user_meta_data ->> 'role')::app_role
    else 'author'::app_role
  end
from auth.users u
on conflict (user_id) do update
set
  email = excluded.email,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  display_name = excluded.display_name,
  role = excluded.role,
  roles = (
    select array_agg(distinct r)
    from unnest(coalesce(profiles.roles, '{}'::app_role[]) || excluded.roles) as r
  ),
  active_role = coalesce(profiles.active_role, excluded.active_role),
  updated_at = now();
