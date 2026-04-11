-- Persist `available_for_review` from auth user metadata at signup / auth user updates.

create or replace function sync_profile_from_auth_user()
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
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
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
