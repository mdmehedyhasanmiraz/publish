-- PostgREST / plpgsql: "structure of query does not match function result type" when
-- RETURNS TABLE uses `text` but profiles.email (and similar) are `citext`. Cast outputs to text.

create or replace function public.list_handling_editor_candidates()
returns table (
  user_id uuid,
  email text,
  display_name text,
  primary_editor_role text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.can_assign_handling_editor(auth.uid()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select
    p.user_id,
    coalesce(p.email::text, '') as email,
    (
      trim(
        coalesce(
          nullif(trim(coalesce(p.display_name::text, '')), ''),
          nullif(
            trim(
              coalesce(p.first_name::text, '')
              || case
                when coalesce(p.middle_name::text, '') <> '' then ' ' || trim(p.middle_name::text)
                else ''
              end
              || case
                when coalesce(p.last_name::text, '') <> '' then ' ' || trim(p.last_name::text)
                else ''
              end
            ),
            ''
          ),
          coalesce(p.email::text, 'User')
        )
      )
    )::text as display_name,
    (
      case
        when
          'editor_in_chief'::public.app_role = any (coalesce(p.roles, '{}'::public.app_role[]))
          or p.role = 'editor_in_chief'
          or p.active_role = 'editor_in_chief'
          then 'editor_in_chief'
        when
          'managing_editor'::public.app_role = any (coalesce(p.roles, '{}'::public.app_role[]))
          or p.role = 'managing_editor'
          or p.active_role = 'managing_editor'
          then 'managing_editor'
        when
          'associate_editor'::public.app_role = any (coalesce(p.roles, '{}'::public.app_role[]))
          or p.role = 'associate_editor'
          or p.active_role = 'associate_editor'
          then 'associate_editor'
        when
          'production_editor'::public.app_role = any (coalesce(p.roles, '{}'::public.app_role[]))
          or p.role = 'production_editor'
          or p.active_role = 'production_editor'
          then 'production_editor'
        else 'associate_editor'
      end
    )::text as primary_editor_role
  from public.profiles p
  where
    'editor_in_chief'::public.app_role = any (coalesce(p.roles, '{}'::public.app_role[]))
    or 'managing_editor'::public.app_role = any (coalesce(p.roles, '{}'::public.app_role[]))
    or 'associate_editor'::public.app_role = any (coalesce(p.roles, '{}'::public.app_role[]))
    or 'production_editor'::public.app_role = any (coalesce(p.roles, '{}'::public.app_role[]))
    or p.role in ('editor_in_chief', 'managing_editor', 'associate_editor', 'production_editor')
    or p.active_role in ('editor_in_chief', 'managing_editor', 'associate_editor', 'production_editor')
  order by 3;
end;
$$;

grant execute on function public.list_handling_editor_candidates() to authenticated;
