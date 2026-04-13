-- Store canonical article bodies as JATS XML (while keeping markdown_body for editor convenience).

alter table public.article_versions
  add column if not exists jats_xml text null;

comment on column public.article_versions.jats_xml is
  'Canonical article body as JATS XML. Public rendering prefers this when present; markdown_body may be kept for editor convenience.';

