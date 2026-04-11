-- Journal default cover + optional per-issue cover (paths in public "covers" bucket).

alter table public.journals
  add column if not exists cover_image_path text;

alter table public.issues
  add column if not exists cover_image_path text;

comment on column public.journals.cover_image_path is
  'Object path in storage bucket covers/, e.g. journals/<journal_id>/cover.jpg. Shown on public journal pages when no issue-specific cover applies.';

comment on column public.issues.cover_image_path is
  'Optional object path in covers/. Falls back to journals.cover_image_path in public UI when null.';

-- Public bucket for cover images (readable anonymously via /object/public/).
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists covers_select_public on storage.objects;
create policy covers_select_public
on storage.objects for select
using (bucket_id = 'covers');

drop policy if exists covers_insert_admin on storage.objects;
create policy covers_insert_admin
on storage.objects for insert
with check (
  bucket_id = 'covers'
  and public.is_platform_admin(auth.uid())
);

drop policy if exists covers_update_admin on storage.objects;
create policy covers_update_admin
on storage.objects for update
using (
  bucket_id = 'covers'
  and public.is_platform_admin(auth.uid())
)
with check (
  bucket_id = 'covers'
  and public.is_platform_admin(auth.uid())
);

drop policy if exists covers_delete_admin on storage.objects;
create policy covers_delete_admin
on storage.objects for delete
using (
  bucket_id = 'covers'
  and public.is_platform_admin(auth.uid())
);
