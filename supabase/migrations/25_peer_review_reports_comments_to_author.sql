alter table public.peer_review_reports
  add column if not exists comments_to_author text not null default '';
