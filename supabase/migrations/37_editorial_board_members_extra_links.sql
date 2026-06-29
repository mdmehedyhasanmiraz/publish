-- Add extra profile link columns to editorial_board_members
alter table public.editorial_board_members
  add column if not exists google_scholar_url text,
  add column if not exists researchgate_url text,
  add column if not exists scopus_url text,
  add column if not exists loop_url text;
