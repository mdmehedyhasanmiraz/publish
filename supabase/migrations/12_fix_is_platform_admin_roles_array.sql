-- Fix admin checks for profiles-only role model.
-- Allow platform admin if either:
-- - legacy single role column is admin, OR
-- - roles[] contains admin

create or replace function public.is_platform_admin(check_user uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = check_user
      and (
        p.role = 'admin'
        or 'admin'::public.app_role = any (coalesce(p.roles, '{}'::public.app_role[]))
      )
  );
$$;

