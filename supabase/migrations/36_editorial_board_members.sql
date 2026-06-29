-- Create editorial_board_members table
create table if not exists public.editorial_board_members (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals(id) on delete cascade,
  user_id uuid references public.profiles(user_id) on delete set null,
  name text not null,
  email text,
  affiliation text not null,
  position text not null,
  photo_path text,
  orcid text,
  profile_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.editorial_board_members enable row level security;

-- Drop existing policies if any
drop policy if exists editorial_board_members_select on public.editorial_board_members;
drop policy if exists editorial_board_members_all_authenticated on public.editorial_board_members;

-- Select policy
create policy editorial_board_members_select
on public.editorial_board_members for select
using (true);

-- Insert/Update/Delete policy for authenticated users
create policy editorial_board_members_all_authenticated
on public.editorial_board_members for all
using (auth.uid() is not null)
with check (auth.uid() is not null);

-- Indexes for performance
create index if not exists idx_editorial_board_members_journal on public.editorial_board_members(journal_id);
create index if not exists idx_editorial_board_members_sort on public.editorial_board_members(sort_order);
create index if not exists idx_editorial_board_members_position on public.editorial_board_members(position);
