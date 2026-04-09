# PublisherOS

Multi-journal publisher platform scaffold on Next.js App Router + Supabase.

## Included

- Public route group for journals, issue/archive, and article pages
- Portal route group for submissions, review/editorial/production/admin surfaces
- Workflow transition service (`lib/workflows`) with explicit state transitions
- API boundaries for workflow actions and queue enqueueing
- OpenAlex integration endpoint and service abstraction
- Supabase migration with core tables, helper auth functions, indexes, and RLS
- Edge Function stubs for queue processing and enrichment

## Key Paths

- `app/(public)`
- `app/(portal)`
- `app/api`
- `lib/workflows`
- `supabase/migrations/20260408_initial.sql`
- `supabase/functions`

## Run Locally

1. Copy `.env.example` to `.env.local` and set Supabase keys.
2. Run `npm run dev`.
3. Apply `supabase/migrations/20260408_initial.sql` to your Supabase project.
