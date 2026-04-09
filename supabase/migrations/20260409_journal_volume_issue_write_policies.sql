-- Allow publisher admins to create journals, volumes, issues.
-- Authors create submissions (already covered by submissions_write when owner_user_id = auth.uid()).

alter table submissions add column if not exists abstract text;

create policy journals_insert_admin on journals for insert
with check (is_publisher_admin(auth.uid(), publisher_id));

create policy journals_update_admin on journals for update
using (is_publisher_admin(auth.uid(), publisher_id))
with check (is_publisher_admin(auth.uid(), publisher_id));

create policy volumes_insert_admin on volumes for insert
with check (is_publisher_admin(auth.uid(), publisher_id));

create policy volumes_update_admin on volumes for update
using (is_publisher_admin(auth.uid(), publisher_id))
with check (is_publisher_admin(auth.uid(), publisher_id));

create policy issues_insert_admin on issues for insert
with check (is_publisher_admin(auth.uid(), publisher_id));

create policy issues_update_admin on issues for update
using (is_publisher_admin(auth.uid(), publisher_id))
with check (is_publisher_admin(auth.uid(), publisher_id));
