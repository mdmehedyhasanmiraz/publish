create table if not exists public.submission_author_invites (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  email citext not null,
  full_name text,
  linked_user_id uuid references public.profiles(user_id) on delete set null,
  status text not null default 'pending_signup',
  invited_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists idx_submission_author_invites_submission
  on public.submission_author_invites(submission_id);
create index if not exists idx_submission_author_invites_email
  on public.submission_author_invites(email);

alter table public.submission_author_invites enable row level security;

drop policy if exists submission_author_invites_read on public.submission_author_invites;
create policy submission_author_invites_read
on public.submission_author_invites for select
using (
  exists (
    select 1 from public.submissions s
    where s.id = submission_id
      and (s.owner_user_id = auth.uid() or public.is_platform_admin(auth.uid()))
  )
);

drop policy if exists submission_author_invites_write on public.submission_author_invites;
create policy submission_author_invites_write
on public.submission_author_invites for all
using (
  exists (
    select 1 from public.submissions s
    where s.id = submission_id
      and (s.owner_user_id = auth.uid() or public.is_platform_admin(auth.uid()))
  )
)
with check (
  exists (
    select 1 from public.submissions s
    where s.id = submission_id
      and (s.owner_user_id = auth.uid() or public.is_platform_admin(auth.uid()))
  )
);

