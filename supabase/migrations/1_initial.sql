create extension if not exists pgcrypto;

create type membership_role as enum (
  'publisher_owner','publisher_admin','journal_manager','editor_in_chief','managing_editor','associate_editor',
  'editorial_assistant','reviewer','author','production_editor','copyeditor','typesetter','reader'
);

create type submission_status as enum (
  'draft','submitted','admin_check','editor_assigned','under_review','revision_requested','revised_submission',
  'accepted','rejected','withdrawn','production','scheduled','published'
);

create table if not exists publishers (id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null);
create table if not exists journals (id uuid primary key default gen_random_uuid(), publisher_id uuid not null references publishers(id), name text not null, slug text not null, unique (publisher_id, slug));
create table if not exists memberships (id uuid primary key default gen_random_uuid(), user_id uuid not null, publisher_id uuid not null references publishers(id), journal_id uuid references journals(id), role membership_role not null, status text not null default 'active');
create table if not exists submissions (id uuid primary key default gen_random_uuid(), publisher_id uuid not null references publishers(id), journal_id uuid not null references journals(id), owner_user_id uuid not null, title text not null, status submission_status not null default 'draft');
create table if not exists submission_versions (id uuid primary key default gen_random_uuid(), submission_id uuid not null references submissions(id) on delete cascade, version_number int not null, unique (submission_id, version_number));
create table if not exists submission_files (id uuid primary key default gen_random_uuid(), publisher_id uuid not null references publishers(id), journal_id uuid not null references journals(id), submission_id uuid not null references submissions(id) on delete cascade, submission_version_id uuid not null references submission_versions(id), file_kind text not null, storage_path text not null, checksum_sha256 text, mime_type text);
create table if not exists review_rounds (id uuid primary key default gen_random_uuid(), publisher_id uuid not null references publishers(id), journal_id uuid not null references journals(id), submission_id uuid not null references submissions(id), round_number int not null, unique (submission_id, round_number));
create table if not exists reviewer_invitations (id uuid primary key default gen_random_uuid(), publisher_id uuid not null references publishers(id), journal_id uuid not null references journals(id), review_round_id uuid not null references review_rounds(id), reviewer_user_id uuid not null, status text not null);
create table if not exists editor_decisions (id uuid primary key default gen_random_uuid(), publisher_id uuid not null references publishers(id), journal_id uuid not null references journals(id), submission_id uuid not null references submissions(id), actor_user_id uuid not null, decision text not null);
create table if not exists volumes (id uuid primary key default gen_random_uuid(), publisher_id uuid not null references publishers(id), journal_id uuid not null references journals(id), volume_number int not null, volume_slug text not null, published_year int, unique (journal_id, volume_number), unique (journal_id, volume_slug));
create table if not exists issues (id uuid primary key default gen_random_uuid(), publisher_id uuid not null references publishers(id), journal_id uuid not null references journals(id), volume_id uuid not null references volumes(id) on delete cascade, issue_number int, issue_slug text not null, unique (volume_id, issue_number), unique (volume_id, issue_slug));
create table if not exists articles (id uuid primary key default gen_random_uuid(), publisher_id uuid not null references publishers(id), journal_id uuid not null references journals(id), submission_id uuid references submissions(id), issue_id uuid references issues(id), title text not null, slug text not null, status text not null default 'ahead_of_issue', unique (journal_id, slug));
create table if not exists search_documents (id uuid primary key default gen_random_uuid(), publisher_id uuid not null references publishers(id), journal_id uuid references journals(id), doc_type text not null, title text not null, body text);
create table if not exists openalex_matches (id uuid primary key default gen_random_uuid(), publisher_id uuid not null references publishers(id), journal_id uuid references journals(id), entity_type text not null, entity_id uuid not null, openalex_id text not null);
create table if not exists email_events (id uuid primary key default gen_random_uuid(), publisher_id uuid not null references publishers(id), journal_id uuid references journals(id), event_type text not null, recipient text not null, provider text not null, status text not null);
create table if not exists audit_logs (id uuid primary key default gen_random_uuid(), publisher_id uuid not null references publishers(id), journal_id uuid references journals(id), actor_user_id uuid not null, entity_type text not null, entity_id uuid not null, action text not null, payload jsonb not null default '{}'::jsonb);

create index if not exists idx_memberships_user_publisher on memberships(user_id, publisher_id);
create index if not exists idx_memberships_user_journal on memberships(user_id, journal_id);
create index if not exists idx_submissions_owner on submissions(owner_user_id);
create index if not exists idx_submissions_journal on submissions(journal_id);
create index if not exists idx_volumes_journal on volumes(journal_id);
create index if not exists idx_issues_volume on issues(volume_id);

create or replace function is_publisher_admin(check_user uuid, check_publisher uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from memberships
    where user_id = check_user and publisher_id = check_publisher and status = 'active'
      and role in ('publisher_owner','publisher_admin')
  );
$$;

create or replace function has_journal_role(check_user uuid, check_journal uuid, check_role membership_role)
returns boolean language sql stable as $$
  select exists (
    select 1 from memberships
    where user_id = check_user and journal_id = check_journal and status = 'active' and role = check_role
  );
$$;

create or replace function is_submission_author(check_user uuid, check_submission uuid)
returns boolean language sql stable as $$
  select exists (select 1 from submissions where id = check_submission and owner_user_id = check_user);
$$;

alter table journals enable row level security;
alter table memberships enable row level security;
alter table submissions enable row level security;
alter table submission_files enable row level security;
alter table review_rounds enable row level security;
alter table reviewer_invitations enable row level security;
alter table volumes enable row level security;
alter table articles enable row level security;
alter table issues enable row level security;
alter table audit_logs enable row level security;

create policy journals_read on journals for select using (true);
create policy volumes_read on volumes for select using (true);
create policy memberships_select_self on memberships for select using (auth.uid() = user_id or is_publisher_admin(auth.uid(), publisher_id));
create policy submissions_read on submissions for select using (owner_user_id = auth.uid() or is_publisher_admin(auth.uid(), publisher_id));
create policy submissions_write on submissions for all using (owner_user_id = auth.uid() or is_publisher_admin(auth.uid(), publisher_id))
with check (owner_user_id = auth.uid() or is_publisher_admin(auth.uid(), publisher_id));
