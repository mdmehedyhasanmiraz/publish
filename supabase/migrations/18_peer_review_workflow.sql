-- Peer review: handling editor, email-based reviewer invites, tokens, reports, template presets.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Submissions: single handling editor (set by EIC / managing editor / admin)
-- ---------------------------------------------------------------------------
alter table public.submissions
  add column if not exists assigned_editor_user_id uuid references auth.users (id) on delete set null;

create index if not exists idx_submissions_assigned_editor on public.submissions (assigned_editor_user_id);

-- ---------------------------------------------------------------------------
-- Reviewer invitations: optional account at invite time; magic link by token
-- ---------------------------------------------------------------------------
alter table public.reviewer_invitations
  alter column reviewer_user_id drop not null;

alter table public.reviewer_invitations
  add column if not exists created_at timestamptz not null default now();

alter table public.reviewer_invitations
  add column if not exists reviewer_email text,
  add column if not exists invite_token text,
  add column if not exists reviewer_number int,
  add column if not exists deadline_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists review_duration_days int not null default 7,
  add column if not exists email_subject_snapshot text,
  add column if not exists email_body_snapshot text;

drop index if exists public.idx_reviewer_invitations_token;
create unique index idx_reviewer_invitations_token on public.reviewer_invitations (invite_token)
  where invite_token is not null;

alter table public.reviewer_invitations
  drop constraint if exists reviewer_invitations_target_chk;

alter table public.reviewer_invitations
  add constraint reviewer_invitations_target_chk check (
    reviewer_user_id is not null
    or (reviewer_email is not null and length(trim(reviewer_email)) > 0)
  );

-- ---------------------------------------------------------------------------
-- Peer review report (one per invitation)
-- ---------------------------------------------------------------------------
create table if not exists public.peer_review_reports (
  id uuid primary key default gen_random_uuid(),
  reviewer_invitation_id uuid not null references public.reviewer_invitations (id) on delete cascade,
  narrative text not null default '',
  no_competing_interests_confirmed boolean not null default false,
  checklist jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  unique (reviewer_invitation_id)
);

create index if not exists idx_peer_review_reports_invitation on public.peer_review_reports (reviewer_invitation_id);

-- ---------------------------------------------------------------------------
-- Saved email templates (reviewer invite + author notification)
-- ---------------------------------------------------------------------------
create table if not exists public.email_template_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_key text not null,
  journal_id uuid references public.journals (id) on delete cascade,
  subject text not null default '',
  body text not null default '',
  updated_at timestamptz not null default now(),
  constraint email_template_presets_key_chk check (template_key in ('reviewer_invite', 'author_decision')),
  constraint email_template_presets_scope unique (user_id, template_key, journal_id)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.can_assign_handling_editor(check_user uuid)
returns boolean
language sql
stable
as $$
  select public.is_platform_admin(check_user)
  or exists (
    select 1
    from public.profiles p
    where p.user_id = check_user
      and (
        'editor_in_chief'::public.app_role = any (coalesce(p.roles, '{}'::public.app_role[]))
        or 'managing_editor'::public.app_role = any (coalesce(p.roles, '{}'::public.app_role[]))
        or p.role in ('editor_in_chief', 'managing_editor')
        or p.active_role in ('editor_in_chief', 'managing_editor')
      )
  );
$$;

create or replace function public.can_manage_peer_review(check_user uuid, p_submission_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_platform_admin(check_user)
  or exists (
    select 1
    from public.submissions s
    where s.id = p_submission_id
      and s.assigned_editor_user_id is not null
      and s.assigned_editor_user_id = check_user
  );
$$;

create or replace function public.assign_submission_handling_editor(p_submission_id uuid, p_editor_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_assign_handling_editor(auth.uid()) then
    raise exception 'not allowed to assign handling editor' using errcode = '42501';
  end if;

  update public.submissions
  set
    assigned_editor_user_id = p_editor_user_id,
    status = case
      when status in ('submitted'::public.submission_status, 'admin_check'::public.submission_status)
        then 'editor_assigned'::public.submission_status
      else status
    end
  where id = p_submission_id;
end;
$$;

create or replace function public.ensure_active_review_round(p_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
  j_id uuid;
begin
  if not (
    public.is_platform_admin(auth.uid())
    or public.can_manage_peer_review(auth.uid(), p_submission_id)
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select id into rid
  from public.review_rounds
  where submission_id = p_submission_id
    and round_number = 1
  limit 1;

  if rid is not null then
    return rid;
  end if;

  select journal_id into j_id from public.submissions where id = p_submission_id;

  insert into public.review_rounds (journal_id, submission_id, round_number)
  values (j_id, p_submission_id, 1)
  returning id into rid;

  return rid;
end;
$$;

create or replace function public.enforce_max_peer_reviewers()
returns trigger
language plpgsql
as $$
declare
  cnt int;
begin
  select count(*) into cnt
  from public.reviewer_invitations
  where review_round_id = new.review_round_id
    and status not in ('declined', 'withdrawn');

  if cnt >= 10 then
    raise exception 'A maximum of 10 reviewers is allowed per review round.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_max_peer_reviewers on public.reviewer_invitations;
create trigger trg_enforce_max_peer_reviewers
before insert on public.reviewer_invitations
for each row execute function public.enforce_max_peer_reviewers();

-- Public token lookup (no auth)
create or replace function public.get_reviewer_invite_by_token(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'invitation_id', i.id,
    'submission_id', s.id,
    'submission_title', s.title,
    'journal_name', j.name,
    'reviewer_email', i.reviewer_email,
    'status', i.status,
    'deadline_at', i.deadline_at,
    'reviewer_number', i.reviewer_number,
    'review_duration_days', i.review_duration_days
  )
  from public.reviewer_invitations i
  join public.review_rounds rr on rr.id = i.review_round_id
  join public.submissions s on s.id = rr.submission_id
  join public.journals j on j.id = s.journal_id
  where i.invite_token = p_token
    and i.invite_token is not null;
$$;

-- Accept invite (logged-in user email must match)
create or replace function public.accept_reviewer_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  next_num int;
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
    return jsonb_build_object('ok', false, 'error', 'not_open_for_accept', 'status', inv.status);
  end if;

  if lower(trim(coalesce(inv.reviewer_email, ''))) is distinct from lower(trim(coalesce(user_email, ''))) then
    return jsonb_build_object('ok', false, 'error', 'email_mismatch');
  end if;

  select coalesce(max(reviewer_number), 0) + 1 into next_num
  from public.reviewer_invitations
  where review_round_id = inv.review_round_id
    and reviewer_number is not null;

  update public.reviewer_invitations
  set
    reviewer_user_id = auth.uid(),
    status = 'accepted',
    accepted_at = now(),
    reviewer_number = next_num,
    deadline_at = now() + make_interval(days => coalesce(inv.review_duration_days, 7))
  where id = inv.id;

  return jsonb_build_object('ok', true, 'invitation_id', inv.id);
end;
$$;

create or replace function public.mark_peer_invitations_sent_and_progress_submission(
  p_submission_id uuid,
  p_invitation_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_platform_admin(auth.uid())
    or public.can_manage_peer_review(auth.uid(), p_submission_id)
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.reviewer_invitations i
  set
    status = 'sent',
    sent_at = coalesce(i.sent_at, now())
  from public.review_rounds rr
  where i.id = any (p_invitation_ids)
    and i.review_round_id = rr.id
    and rr.submission_id = p_submission_id
    and i.status = 'pending_send';

  update public.submissions s
  set status = 'under_review'::public.submission_status
  where s.id = p_submission_id
    and s.status in (
      'editor_assigned'::public.submission_status,
      'under_review'::public.submission_status,
      'revision_requested'::public.submission_status,
      'revised_submission'::public.submission_status
    );
end;
$$;

create or replace function public.complete_reviewer_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reviewer_invitations i
  set status = 'completed'
  where i.id = p_invitation_id
    and i.reviewer_user_id = auth.uid()
    and i.status = 'accepted';
end;
$$;

-- ---------------------------------------------------------------------------
-- Submissions RLS: handling editor can read
-- ---------------------------------------------------------------------------
drop policy if exists submissions_read on public.submissions;
create policy submissions_read on public.submissions for select using (
  owner_user_id = auth.uid()
  or public.is_platform_admin(auth.uid())
  or assigned_editor_user_id = auth.uid()
  or public.can_edit_articles(auth.uid())
);

-- ---------------------------------------------------------------------------
-- review_rounds RLS
-- ---------------------------------------------------------------------------
alter table public.review_rounds enable row level security;

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
  or exists (
    select 1
    from public.reviewer_invitations i
    where i.review_round_id = review_rounds.id
      and i.reviewer_user_id = auth.uid()
  )
);

drop policy if exists review_rounds_all_staff on public.review_rounds;
create policy review_rounds_all_staff on public.review_rounds for all using (
  exists (
    select 1
    from public.submissions s
    where s.id = review_rounds.submission_id
      and (
        public.can_manage_peer_review(auth.uid(), s.id)
        or public.is_platform_admin(auth.uid())
      )
  )
)
with check (
  exists (
    select 1
    from public.submissions s
    where s.id = review_rounds.submission_id
      and (
        public.can_manage_peer_review(auth.uid(), s.id)
        or public.is_platform_admin(auth.uid())
      )
  )
);

-- ---------------------------------------------------------------------------
-- reviewer_invitations RLS
-- ---------------------------------------------------------------------------
alter table public.reviewer_invitations enable row level security;

drop policy if exists reviewer_invitations_select on public.reviewer_invitations;
create policy reviewer_invitations_select on public.reviewer_invitations for select using (
  reviewer_user_id = auth.uid()
  or public.is_platform_admin(auth.uid())
  or exists (
    select 1
    from public.review_rounds rr
    join public.submissions s on s.id = rr.submission_id
    where rr.id = reviewer_invitations.review_round_id
      and public.can_manage_peer_review(auth.uid(), s.id)
  )
);

drop policy if exists reviewer_invitations_insert on public.reviewer_invitations;
create policy reviewer_invitations_insert on public.reviewer_invitations for insert with check (
  exists (
    select 1
    from public.review_rounds rr
    join public.submissions s on s.id = rr.submission_id
    where rr.id = reviewer_invitations.review_round_id
      and (
        public.can_manage_peer_review(auth.uid(), s.id)
        or public.is_platform_admin(auth.uid())
      )
  )
);

drop policy if exists reviewer_invitations_update on public.reviewer_invitations;
create policy reviewer_invitations_update on public.reviewer_invitations for update using (
  public.is_platform_admin(auth.uid())
  or exists (
    select 1
    from public.review_rounds rr
    join public.submissions s on s.id = rr.submission_id
    where rr.id = reviewer_invitations.review_round_id
      and public.can_manage_peer_review(auth.uid(), s.id)
  )
)
with check (
  public.is_platform_admin(auth.uid())
  or exists (
    select 1
    from public.review_rounds rr
    join public.submissions s on s.id = rr.submission_id
    where rr.id = reviewer_invitations.review_round_id
      and public.can_manage_peer_review(auth.uid(), s.id)
  )
);

drop policy if exists reviewer_invitations_delete on public.reviewer_invitations;
create policy reviewer_invitations_delete on public.reviewer_invitations for delete using (
  public.is_platform_admin(auth.uid())
  or exists (
    select 1
    from public.review_rounds rr
    join public.submissions s on s.id = rr.submission_id
    where rr.id = reviewer_invitations.review_round_id
      and public.can_manage_peer_review(auth.uid(), s.id)
  )
);

-- ---------------------------------------------------------------------------
-- peer_review_reports RLS
-- ---------------------------------------------------------------------------
alter table public.peer_review_reports enable row level security;

drop policy if exists peer_review_reports_select on public.peer_review_reports;
create policy peer_review_reports_select on public.peer_review_reports for select using (
  exists (
    select 1
    from public.reviewer_invitations i
    join public.review_rounds rr on rr.id = i.review_round_id
    join public.submissions s on s.id = rr.submission_id
    where i.id = peer_review_reports.reviewer_invitation_id
      and (
        i.reviewer_user_id = auth.uid()
        or public.can_manage_peer_review(auth.uid(), s.id)
        or public.is_platform_admin(auth.uid())
      )
  )
);

drop policy if exists peer_review_reports_insert on public.peer_review_reports;
create policy peer_review_reports_insert on public.peer_review_reports for insert with check (
  exists (
    select 1
    from public.reviewer_invitations i
    where i.id = peer_review_reports.reviewer_invitation_id
      and i.reviewer_user_id = auth.uid()
      and i.status = 'accepted'
  )
);

drop policy if exists peer_review_reports_update on public.peer_review_reports;
create policy peer_review_reports_update on public.peer_review_reports for update using (
  exists (
    select 1
    from public.reviewer_invitations i
    where i.id = peer_review_reports.reviewer_invitation_id
      and i.reviewer_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.reviewer_invitations i
    where i.id = peer_review_reports.reviewer_invitation_id
      and i.reviewer_user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- email_template_presets RLS
-- ---------------------------------------------------------------------------
alter table public.email_template_presets enable row level security;

drop policy if exists email_template_presets_all on public.email_template_presets;
create policy email_template_presets_all on public.email_template_presets for all using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- editor_decisions RLS (queue pages)
-- ---------------------------------------------------------------------------
alter table public.editor_decisions enable row level security;

drop policy if exists editor_decisions_select on public.editor_decisions;
create policy editor_decisions_select on public.editor_decisions for select using (
  exists (
    select 1
    from public.submissions s
    where s.id = editor_decisions.submission_id
      and (
        s.owner_user_id = auth.uid()
        or public.is_platform_admin(auth.uid())
        or public.can_manage_peer_review(auth.uid(), s.id)
      )
  )
);

drop policy if exists editor_decisions_insert on public.editor_decisions;
create policy editor_decisions_insert on public.editor_decisions for insert with check (
  public.is_platform_admin(auth.uid())
  or public.can_manage_peer_review(auth.uid(), submission_id)
);

-- ---------------------------------------------------------------------------
-- Grants (RPC)
-- ---------------------------------------------------------------------------
grant execute on function public.get_reviewer_invite_by_token(text) to anon, authenticated;
grant execute on function public.accept_reviewer_invitation(text) to authenticated;
grant execute on function public.assign_submission_handling_editor(uuid, uuid) to authenticated;
grant execute on function public.ensure_active_review_round(uuid) to authenticated;
grant execute on function public.mark_peer_invitations_sent_and_progress_submission(uuid, uuid[]) to authenticated;
grant execute on function public.complete_reviewer_invitation(uuid) to authenticated;

-- Candidates for “handling editor” (EIC / managing editor / admin assign — not for self-service profile listing)
create or replace function public.list_handling_editor_candidates()
returns table (user_id uuid, email text, display_name text)
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
    coalesce(p.email, '') as email,
    trim(
      coalesce(
        nullif(trim(coalesce(p.display_name, '')), ''),
        nullif(
          trim(
            coalesce(p.first_name, '')
            || case
              when coalesce(p.middle_name, '') <> '' then ' ' || trim(p.middle_name)
              else ''
            end
            || case
              when coalesce(p.last_name, '') <> '' then ' ' || trim(p.last_name)
              else ''
            end
          ),
          ''
        ),
        coalesce(p.email, '')
      )
    ) as display_name
  from public.profiles p
  where
    'associate_editor'::public.app_role = any (coalesce(p.roles, '{}'::public.app_role[]))
    or 'managing_editor'::public.app_role = any (coalesce(p.roles, '{}'::public.app_role[]))
    or 'editor_in_chief'::public.app_role = any (coalesce(p.roles, '{}'::public.app_role[]))
    or p.role in ('associate_editor', 'managing_editor', 'editor_in_chief')
    or p.active_role in ('associate_editor', 'managing_editor', 'editor_in_chief');
end;
$$;

grant execute on function public.list_handling_editor_candidates() to authenticated;

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
