-- Fix issue creation RLS for single-publisher deployments.
-- Ensures signed-in users can read/write issues without membership checks.

alter table issues enable row level security;

-- Remove legacy policies that may still exist in some environments.
drop policy if exists issues_read on issues;
drop policy if exists issues_insert_admin on issues;
drop policy if exists issues_update_admin on issues;
drop policy if exists issues_insert_authenticated on issues;
drop policy if exists issues_update_authenticated on issues;

-- Single-publisher: authenticated users can manage issues.
create policy issues_read
on issues for select
using (auth.uid() is not null);

create policy issues_insert_authenticated
on issues for insert
with check (auth.uid() is not null);

create policy issues_update_authenticated
on issues for update
using (auth.uid() is not null)
with check (auth.uid() is not null);
