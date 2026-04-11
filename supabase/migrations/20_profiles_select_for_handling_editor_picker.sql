-- Managing editors / EIC could call list_handling_editor_candidates(), but RLS on profiles only
-- allowed "own row" or "platform admin". Non-admin assigners could not see other users → empty dropdown.
-- Allow anyone who may assign a handling editor to read profiles (needed for the picker).

drop policy if exists profiles_select_own_or_admin on public.profiles;

create policy profiles_select_own_or_admin
on public.profiles for select
using (
  auth.uid() = user_id
  or public.is_platform_admin(auth.uid())
  or public.can_assign_handling_editor(auth.uid())
);
