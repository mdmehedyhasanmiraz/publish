-- Journal-configured step options and submission wizard metadata.

alter table public.journals
  add column if not exists submission_areas text[] not null default '{}'::text[],
  add column if not exists submission_types text[] not null default '{}'::text[];

update public.journals
set
  submission_areas = case
    when coalesce(array_length(submission_areas, 1), 0) = 0 then array['General']::text[]
    else submission_areas
  end,
  submission_types = case
    when coalesce(array_length(submission_types, 1), 0) = 0 then array['original_research', 'review']::text[]
    else submission_types
  end;

alter table public.submissions
  add column if not exists area text,
  add column if not exists submission_type text,
  add column if not exists supplementary_data_link text,
  add column if not exists submission_notes text,
  add column if not exists author_affiliations jsonb not null default '[]'::jsonb;

alter table public.submission_files
  add column if not exists description text;

