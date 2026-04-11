-- Storage bucket + policies for author submission uploads.
-- Files live in bucket: data
-- Path convention: submissions/<submission_id>/<submission_version_id>/<uuid>-<filename>

-- Create bucket if it doesn't exist.
insert into storage.buckets (id, name, public)
values ('data', 'data', false)
on conflict (id) do nothing;

-- Helper: extract submission_id from object name.
create or replace function submission_id_from_object_name(object_name text)
returns uuid
language sql
stable
as $$
  select nullif(split_part(object_name, '/', 2), '')::uuid;
$$;

create or replace function is_submission_publisher_admin(check_user uuid, check_submission uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from submissions s
    where s.id = check_submission
      and is_publisher_admin(check_user, s.publisher_id)
  );
$$;

-- RLS policies for submission_files (table RLS already enabled in initial migration).
drop policy if exists submission_files_read on submission_files;
create policy submission_files_read
on submission_files for select
using (
  is_submission_author(auth.uid(), submission_id)
  or is_submission_publisher_admin(auth.uid(), submission_id)
);

drop policy if exists submission_files_write on submission_files;
create policy submission_files_write
on submission_files for insert
with check (
  is_submission_author(auth.uid(), submission_id)
  or is_submission_publisher_admin(auth.uid(), submission_id)
);

drop policy if exists submission_files_delete on submission_files;
create policy submission_files_delete
on submission_files for delete
using (
  is_submission_author(auth.uid(), submission_id)
  or is_submission_publisher_admin(auth.uid(), submission_id)
);

-- Storage object policies for bucket "data" restricted to submission paths.
-- Note: storage RLS works on storage.objects.
drop policy if exists data_submissions_read on storage.objects;
create policy data_submissions_read
on storage.objects for select
using (
  bucket_id = 'data'
  and split_part(name, '/', 1) = 'submissions'
  and (
    is_submission_author(auth.uid(), submission_id_from_object_name(name))
    or is_submission_publisher_admin(auth.uid(), submission_id_from_object_name(name))
    or is_platform_admin(auth.uid())
  )
);

drop policy if exists data_submissions_insert on storage.objects;
create policy data_submissions_insert
on storage.objects for insert
with check (
  bucket_id = 'data'
  and split_part(name, '/', 1) = 'submissions'
  and (
    is_submission_author(auth.uid(), submission_id_from_object_name(name))
    or is_submission_publisher_admin(auth.uid(), submission_id_from_object_name(name))
    or is_platform_admin(auth.uid())
  )
);

drop policy if exists data_submissions_delete on storage.objects;
create policy data_submissions_delete
on storage.objects for delete
using (
  bucket_id = 'data'
  and split_part(name, '/', 1) = 'submissions'
  and (
    is_submission_author(auth.uid(), submission_id_from_object_name(name))
    or is_submission_publisher_admin(auth.uid(), submission_id_from_object_name(name))
    or is_platform_admin(auth.uid())
  )
);
