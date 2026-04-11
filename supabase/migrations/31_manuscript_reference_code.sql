-- Journal-scoped manuscript reference codes: PREFIX-YYYY-NNNNNN assigned on first publish.

create table if not exists public.journal_manuscript_serial_counters (
  journal_id uuid not null references public.journals (id) on delete cascade,
  year int not null check (year >= 1900 and year <= 2100),
  last_serial bigint not null default 0 check (last_serial >= 0),
  primary key (journal_id, year)
);

alter table public.articles
  add column if not exists manuscript_reference_code text;

create unique index if not exists articles_journal_manuscript_ref_unique
  on public.articles (journal_id, manuscript_reference_code)
  where manuscript_reference_code is not null;

alter table public.journals
  add column if not exists manuscript_code_prefix text;

alter table public.journals
  drop constraint if exists journals_manuscript_code_prefix_chk;

alter table public.journals
  add constraint journals_manuscript_code_prefix_chk check (
    manuscript_code_prefix is null
    or manuscript_code_prefix ~ '^[A-Z0-9]{2,12}$'
  );

alter table public.journal_manuscript_serial_counters enable row level security;

-- Internal: lock counter, assign code, no auth (used by trigger and migration backfill).
create or replace function public.assign_manuscript_reference_code_core (p_article_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_journal record;
  v_prefix text;
  v_year int;
  v_next bigint;
  v_code text;
  v_existing text;
begin
  select
    a.id,
    a.journal_id,
    a.manuscript_reference_code,
    a.published_at,
    a.status
  into v_row
  from public.articles a
  where a.id = p_article_id
  for update;

  if v_row.id is null then
    raise exception 'Article not found: %', p_article_id;
  end if;

  if v_row.manuscript_reference_code is not null then
    return v_row.manuscript_reference_code;
  end if;

  if v_row.status is distinct from 'published' or v_row.published_at is null then
    raise exception 'Manuscript reference code requires published status and published_at.';
  end if;

  select j.manuscript_code_prefix, j.slug
  into v_journal
  from public.journals j
  where j.id = v_row.journal_id;

  if v_journal.slug is null then
    raise exception 'Journal not found for article.';
  end if;

  v_prefix := case
    when v_journal.manuscript_code_prefix is not null
      and btrim(v_journal.manuscript_code_prefix) <> '' then v_journal.manuscript_code_prefix
    else upper(regexp_replace(v_journal.slug, '[^a-zA-Z0-9]', '', 'g'))
  end;

  if length(v_prefix) < 2 then
    v_prefix := 'JR';
  end if;

  v_prefix := left(v_prefix, 12);

  v_year := extract(year from (v_row.published_at at time zone 'UTC'))::int;

  insert into public.journal_manuscript_serial_counters (journal_id, year, last_serial)
  values (v_row.journal_id, v_year, 0)
  on conflict (journal_id, year) do nothing;

  update public.journal_manuscript_serial_counters c
  set last_serial = c.last_serial + 1
  where c.journal_id = v_row.journal_id
    and c.year = v_year
  returning c.last_serial into v_next;

  if v_next is null then
    raise exception 'Counter update failed for journal % year %.', v_row.journal_id, v_year;
  end if;

  v_code := format('%s-%s-%s', v_prefix, v_year, lpad(v_next::text, 6, '0'));

  update public.articles a
  set manuscript_reference_code = v_code
  where a.id = p_article_id
    and a.manuscript_reference_code is null
  returning a.manuscript_reference_code into v_existing;

  if v_existing is not null then
    return v_existing;
  end if;

  select a.manuscript_reference_code into v_existing
  from public.articles a
  where a.id = p_article_id;

  if v_existing is not null then
    return v_existing;
  end if;

  raise exception 'Could not assign manuscript reference code.';
end;
$$;

revoke all on function public.assign_manuscript_reference_code_core (uuid) from public;

-- Authenticated editors: manual repair or tooling.
create or replace function public.assign_manuscript_reference_code (p_article_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
    or not (
      public.can_edit_articles(auth.uid())
      or public.is_platform_admin(auth.uid())
    ) then
    raise exception 'forbidden';
  end if;

  return public.assign_manuscript_reference_code_core(p_article_id);
end;
$$;

revoke all on function public.assign_manuscript_reference_code (uuid) from public;
grant execute on function public.assign_manuscript_reference_code (uuid) to authenticated;
grant execute on function public.assign_manuscript_reference_code (uuid) to service_role;

create or replace function public.trg_articles_assign_manuscript_reference ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published'
    and new.published_at is not null
    and new.manuscript_reference_code is null then
    perform public.assign_manuscript_reference_code_core(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_articles_assign_manuscript_reference on public.articles;

-- Fires on publish (status/published_at). Updates that only set manuscript_reference_code do not refire.
create trigger trg_articles_assign_manuscript_reference
after insert or update of status, published_at on public.articles
for each row
execute function public.trg_articles_assign_manuscript_reference();

-- Backfill existing published rows (deterministic order per journal/year).
do $$
declare
  r record;
begin
  for r in
    select a.id
    from public.articles a
    where a.status = 'published'
      and a.published_at is not null
      and a.manuscript_reference_code is null
    order by
      a.journal_id,
      (extract(year from (a.published_at at time zone 'UTC')))::int,
      a.published_at asc,
      a.id
  loop
    perform public.assign_manuscript_reference_code_core(r.id);
  end loop;
end;
$$;
