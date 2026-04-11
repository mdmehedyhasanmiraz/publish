-- Editorial outcomes (accept / revision / reject) + author-visible reviewer comments (RPC).

create or replace function public.apply_editor_author_decision(
  p_submission_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  st public.submission_status;
  next_st public.submission_status;
  max_ver int;
begin
  if not (
    public.is_platform_admin(auth.uid())
    or public.can_manage_peer_review(auth.uid(), p_submission_id)
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p_decision not in ('accept', 'revision', 'reject') then
    raise exception 'invalid decision';
  end if;

  select status into st from public.submissions where id = p_submission_id;
  if not found then
    raise exception 'submission not found';
  end if;

  if p_decision = 'accept' then
    if st in (
      'under_review'::public.submission_status,
      'revised_submission'::public.submission_status,
      'editor_assigned'::public.submission_status
    ) then
      next_st := 'accepted'::public.submission_status;
    else
      raise exception 'cannot accept from status %', st;
    end if;
  elsif p_decision = 'reject' then
    if st in (
      'under_review'::public.submission_status,
      'revised_submission'::public.submission_status,
      'editor_assigned'::public.submission_status,
      'admin_check'::public.submission_status
    ) then
      next_st := 'rejected'::public.submission_status;
    else
      raise exception 'cannot reject from status %', st;
    end if;
  else
    -- revision
    if st = 'revision_requested'::public.submission_status then
      -- Idempotent: allow resending email without duplicating versions.
      return;
    elsif st in (
      'under_review'::public.submission_status,
      'revised_submission'::public.submission_status
    ) then
      next_st := 'revision_requested'::public.submission_status;
    else
      raise exception 'cannot request revision from status %', st;
    end if;
  end if;

  update public.submissions
  set status = next_st
  where id = p_submission_id;

  if p_decision = 'revision' and st in (
    'under_review'::public.submission_status,
    'revised_submission'::public.submission_status
  ) then
    select coalesce(max(version_number), 0) into max_ver
    from public.submission_versions
    where submission_id = p_submission_id;

    insert into public.submission_versions (submission_id, version_number)
    values (p_submission_id, max_ver + 1);
  end if;
end;
$$;

grant execute on function public.apply_editor_author_decision(uuid, text) to authenticated;

-- Aggregated comments_to_author for the corresponding author (no confidential narrative).
create or replace function public.get_author_submission_review_comments(p_submission_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    string_agg(
      format(
        E'Reviewer %s:\n%s',
        coalesce(i.reviewer_number::text, '?'),
        trim(pr.comments_to_author)
      ),
      E'\n\n---\n\n'
      order by i.reviewer_number nulls last, i.id
    )
    filter (where trim(pr.comments_to_author) <> ''),
    ''
  )
  from public.peer_review_reports pr
  join public.reviewer_invitations i on i.id = pr.reviewer_invitation_id
  join public.review_rounds rr on rr.id = i.review_round_id
  join public.submissions s on s.id = rr.submission_id
  where rr.submission_id = p_submission_id
    and s.owner_user_id = auth.uid()
    and s.status in (
      'revision_requested'::public.submission_status,
      'revised_submission'::public.submission_status
    );
$$;

grant execute on function public.get_author_submission_review_comments(uuid) to authenticated;
