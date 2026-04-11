-- Allow assigned peer reviewers (accepted or completed invitation) to read the
-- submission row, submission_files metadata, and storage objects for that submission.

create or replace function public.is_user_peer_reviewer_for_submission(p_user_id uuid, p_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.review_rounds rr
    join public.reviewer_invitations i on i.review_round_id = rr.id
    where rr.submission_id = p_submission_id
      and i.reviewer_user_id = p_user_id
      and i.status in ('accepted', 'completed')
  );
$$;

revoke all on function public.is_user_peer_reviewer_for_submission(uuid, uuid) from public;
grant execute on function public.is_user_peer_reviewer_for_submission(uuid, uuid) to authenticated;

drop policy if exists submissions_read on public.submissions;
create policy submissions_read on public.submissions for select using (
  owner_user_id = auth.uid()
  or public.is_platform_admin(auth.uid())
  or assigned_editor_user_id = auth.uid()
  or public.can_edit_articles(auth.uid())
  or public.is_user_peer_reviewer_for_submission(auth.uid(), id)
);

drop policy if exists submission_files_read on public.submission_files;
create policy submission_files_read on public.submission_files for select using (
  public.is_submission_author(auth.uid(), submission_id)
  or public.is_platform_admin(auth.uid())
  or public.is_user_peer_reviewer_for_submission(auth.uid(), submission_id)
);

drop policy if exists data_submissions_read on storage.objects;
create policy data_submissions_read on storage.objects for select using (
  bucket_id = 'data'
  and split_part(name, '/', 1) = 'submissions'
  and (
    public.is_submission_author(auth.uid(), public.submission_id_from_object_name(name))
    or public.is_platform_admin(auth.uid())
    or public.is_user_peer_reviewer_for_submission(
      auth.uid(),
      public.submission_id_from_object_name(name)
    )
  )
);

-- Logged-in invitee can decline before accepting (same email check as accept).
create or replace function public.decline_reviewer_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  user_email text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;

  select email into user_email from auth.users where id = auth.uid();

  select i.* into inv
  from public.reviewer_invitations i
  where i.invite_token = p_token;

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  if inv.status is distinct from 'sent' then
    return jsonb_build_object('ok', false, 'error', 'not_open_for_decline', 'status', inv.status);
  end if;

  if lower(trim(coalesce(inv.reviewer_email, ''))) is distinct from lower(trim(coalesce(user_email, ''))) then
    return jsonb_build_object('ok', false, 'error', 'email_mismatch');
  end if;

  update public.reviewer_invitations
  set status = 'declined'
  where id = inv.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.decline_reviewer_invitation(text) from public;
grant execute on function public.decline_reviewer_invitation(text) to authenticated;
