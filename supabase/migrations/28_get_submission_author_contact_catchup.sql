-- Ensures staff can resolve the submitting author's email when sending author notifications.
-- (Also shipped in 18_peer_review_workflow.sql; this catch-up fixes DBs where 18 was not applied.)

create or replace function public.get_submission_author_contact(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  owner_id uuid;
  em text;
begin
  if not (
    public.is_platform_admin(auth.uid())
    or public.can_manage_peer_review(auth.uid(), p_submission_id)
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select s.owner_user_id into owner_id from public.submissions s where s.id = p_submission_id;
  if owner_id is null then
    return jsonb_build_object('email', null);
  end if;

  select
    coalesce(nullif(trim(p.email), ''), nullif(trim(p.alternate_email), '')) into em
  from public.profiles p
  where p.user_id = owner_id;

  return jsonb_build_object('email', em);
end;
$$;

grant execute on function public.get_submission_author_contact(uuid) to authenticated;
