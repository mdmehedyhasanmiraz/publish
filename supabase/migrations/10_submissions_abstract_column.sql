-- App expects submissions.abstract (create-submission-form, submission action, detail page).
-- Safe if migration 2 already ran: IF NOT EXISTS.

alter table public.submissions add column if not exists abstract text;
