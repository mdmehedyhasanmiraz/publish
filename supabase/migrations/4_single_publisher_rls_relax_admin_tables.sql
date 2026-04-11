-- Single-publisher deployment: allow authenticated users to manage
-- journals/volumes/issues without per-publisher membership checks.

-- Remove old membership-based write policies.
drop policy if exists journals_insert_admin on journals;
drop policy if exists journals_update_admin on journals;
drop policy if exists volumes_insert_admin on volumes;
drop policy if exists volumes_update_admin on volumes;
drop policy if exists issues_insert_admin on issues;
drop policy if exists issues_update_admin on issues;

-- Journals
create policy journals_insert_authenticated
on journals for insert
with check (auth.uid() is not null);

create policy journals_update_authenticated
on journals for update
using (auth.uid() is not null)
with check (auth.uid() is not null);

-- Volumes
create policy volumes_insert_authenticated
on volumes for insert
with check (auth.uid() is not null);

create policy volumes_update_authenticated
on volumes for update
using (auth.uid() is not null)
with check (auth.uid() is not null);

-- Issues
create policy issues_insert_authenticated
on issues for insert
with check (auth.uid() is not null);

create policy issues_update_authenticated
on issues for update
using (auth.uid() is not null)
with check (auth.uid() is not null);
