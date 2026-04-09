# PublisherOS Architecture

- Next.js App Router for public and portal surfaces
- Supabase Postgres/Auth/Storage for core backend
- Supabase queues + Edge Functions for async jobs
- OpenAlex integration for metadata enrichment

## Core Principles

- RLS on every tenant-bound table
- Server-side workflow transition boundaries
- Versioned immutable file records per submission version
- Submission workflow object is separate from article publication object
