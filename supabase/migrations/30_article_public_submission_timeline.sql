-- Public article page: snapshot submission type + milestone dates on articles at publish.
-- Submissions table: maintain submitted_at / revised_at / accepted_at on status transitions.

alter table public.submissions
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists submitted_at timestamptz,
  add column if not exists revised_at timestamptz,
  add column if not exists accepted_at timestamptz;

alter table public.articles
  add column if not exists public_submitted_at timestamptz,
  add column if not exists public_revised_at timestamptz,
  add column if not exists public_accepted_at timestamptz,
  add column if not exists public_submission_type text;

create or replace function public.submissions_timestamps_on_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'submitted'::public.submission_status and new.submitted_at is null then
      new.submitted_at := now();
    end if;
    if new.status = 'revised_submission'::public.submission_status then
      new.revised_at := now();
    end if;
    if new.status = 'accepted'::public.submission_status then
      new.accepted_at := now();
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_submissions_timestamps_on_status on public.submissions;
create trigger trg_submissions_timestamps_on_status
before update on public.submissions
for each row execute function public.submissions_timestamps_on_status();

update public.articles a
set
  public_submission_type = s.submission_type,
  public_submitted_at = s.submitted_at,
  public_revised_at = s.revised_at,
  public_accepted_at = s.accepted_at
from public.submissions s
where a.submission_id = s.id
  and a.status = 'published';
