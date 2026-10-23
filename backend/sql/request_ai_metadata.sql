-- Karwan 2.0: AI metadata table.
-- REQUIRED by the Express "Reset demo" (POST /api/seed/reset), which clears this table after reset_demo().
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run. Safe to run again.

create table if not exists request_ai_metadata (
  request_id text primary key,
  raw_text text,
  english_text text,
  detected_language text,
  people_is_estimate boolean default false,
  field_confidence jsonb default '{}'::jsonb,
  credibility_score int,
  credibility_band text,
  credibility_flags jsonb default '[]'::jsonb,
  credibility_reasons jsonb default '[]'::jsonb,
  verification_status text default 'ok'
    check (verification_status in ('ok', 'needs_review', 'verified', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Only server-side keys (Express secret key / FastAPI service role) may touch it. No public access.
alter table request_ai_metadata enable row level security;
