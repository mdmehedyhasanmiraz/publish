-- Optional structured fields for production editing (acknowledgements, references metadata, etc.)

alter table public.article_versions
  add column if not exists extra_metadata jsonb not null default '{}'::jsonb;

comment on column public.article_versions.extra_metadata is
  'JSON: acknowledgement, competing_interests, references[{text,doi,google_scholar_url}], etc.';
