-- Harden role assignment: auth metadata and self-service updates must not grant or change privileged roles.

-- 1) Sync from auth.users: only author/reviewer may come from signup metadata; never merge staff roles from JWT metadata.
--    On updates to auth.users, sync profile fields but do not overwrite profiles.role / profiles.roles / profiles.active_role.
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
  disp text;
begin
  derived_role := case
    when coalesce(new.raw_user_meta_data ->> 'role', '') in ('author', 'reviewer') then
      (new.raw_user_meta_data ->> 'role')::app_role
    else 'author'::app_role
  end;

  meta_available := new.raw_user_meta_data ->> 'available_for_review';
  derived_available := case
    when meta_available is null then null
    when lower(meta_available) in ('true', 't', '1', 'yes') then true
    when lower(meta_available) in ('false', 'f', '0', 'no') then false
    else null
  end;

  disp := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

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
    disp,
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
    display_name = coalesce(nullif(trim(excluded.display_name), ''), profiles.display_name),
    available_for_review = case
      when derived_available is not null then derived_available
      else profiles.available_for_review
    end,
    updated_at = now();

  return new;
end;
$$;

-- 2) Prevent non-admins from changing profiles.role or profiles.roles on their own row (client cannot self-elevate).
create or replace function public.profiles_enforce_role_columns_immutable_for_self()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if auth.uid() is null then
    return new;
  end if;

  if public.is_platform_admin(auth.uid()) then
    return new;
  end if;

  if new.user_id is distinct from auth.uid() then
    return new;
  end if;

  if new.role is distinct from old.role or new.roles is distinct from old.roles then
    raise exception 'profiles.role and profiles.roles can only be changed by administrators'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_enforce_role_columns_immutable_for_self on public.profiles;

create trigger trg_profiles_enforce_role_columns_immutable_for_self
before update on public.profiles
for each row
execute function public.profiles_enforce_role_columns_immutable_for_self();
