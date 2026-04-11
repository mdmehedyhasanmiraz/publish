-- Break RLS cycle: review_rounds_select referenced reviewer_invitations while
-- reviewer_invitations_* referenced review_rounds → infinite recursion.

create or replace function public.user_has_linked_reviewer_invitation_for_round(
  p_round_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.reviewer_invitations i
    where i.review_round_id = p_round_id
      and i.reviewer_user_id = p_user_id
  );
$$;

revoke all on function public.user_has_linked_reviewer_invitation_for_round(uuid, uuid) from public;
grant execute on function public.user_has_linked_reviewer_invitation_for_round(uuid, uuid) to authenticated;

drop policy if exists review_rounds_select on public.review_rounds;
create policy review_rounds_select on public.review_rounds for select using (
  exists (
    select 1
    from public.submissions s
    where s.id = review_rounds.submission_id
      and (
        public.can_manage_peer_review(auth.uid(), s.id)
        or public.is_platform_admin(auth.uid())
      )
  )
  or public.user_has_linked_reviewer_invitation_for_round(review_rounds.id, auth.uid())
);
