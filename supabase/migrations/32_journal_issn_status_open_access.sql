-- ISSN (print/online), editorial status (free text), and open-access flag for journals.

alter table public.journals
  add column if not exists issn_print text null;

alter table public.journals
  add column if not exists issn_online text null;

alter table public.journals
  add column if not exists status text null;

alter table public.journals
  add column if not exists is_open_access boolean not null default false;

comment on column public.journals.issn_print is 'ISSN for the print edition (pISSN), if applicable.';
comment on column public.journals.issn_online is 'ISSN for the online edition (eISSN), if applicable.';
comment on column public.journals.status is 'Editorial lifecycle label (e.g. upcoming, publishing, discontinued); set from the admin UI only.';
comment on column public.journals.is_open_access is 'Whether the journal is described as open access.';
