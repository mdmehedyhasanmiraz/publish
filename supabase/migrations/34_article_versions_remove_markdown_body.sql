alter table public.article_versions
  drop column if exists markdown_body;

comment on column public.article_versions.jats_xml is
  'Canonical and only stored article body content in JATS XML.';

