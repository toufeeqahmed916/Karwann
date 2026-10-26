-- Suspicious-request review (duplicate location, copied complaint text, repeated network).
-- Adds the columns and indexes the review needs to the existing request_ai_metadata table.
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run. Safe to run again.
-- Run backend/sql/request_ai_metadata.sql first if that table does not exist yet.
--
-- NOTE: this file was written from the review code (authenticityReviewRepository.js) because the migration that was
-- mentioned in the change list was not included in the shared archive. Compare it with your teammate's copy if they have one.

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
  verification_status text default 'ok',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- A hash of the requester's network address. The plain address is never stored.
alter table request_ai_metadata add column if not exists ip_hash text;

-- Ids of the earlier requests this one looks like (shown to coordinators as area names).
alter table request_ai_metadata add column if not exists matched_request_ids jsonb default '[]'::jsonb;

-- Fast lookups for "same network in the last 24 hours" and "recent requests".
create index if not exists request_ai_metadata_ip_hash_idx on request_ai_metadata (ip_hash);
create index if not exists request_ai_metadata_created_at_idx on request_ai_metadata (created_at);

-- Compatibility cleanup: older versions used other band names (for example green / amber / red) and a narrower status list.
-- The review writes low / medium / high and the statuses ok, needs_review, verified, rejected.
alter table request_ai_metadata drop constraint if exists request_ai_metadata_credibility_band_check;
update request_ai_metadata set credibility_band = case lower(credibility_band)
  when 'green' then 'low'
  when 'amber' then 'medium'
  when 'red' then 'high'
  else credibility_band
end
where lower(credibility_band) in ('green', 'amber', 'red');
alter table request_ai_metadata
  add constraint request_ai_metadata_credibility_band_check
  check (credibility_band is null or credibility_band in ('low', 'medium', 'high'));

alter table request_ai_metadata drop constraint if exists request_ai_metadata_verification_status_check;
alter table request_ai_metadata
  add constraint request_ai_metadata_verification_status_check
  check (verification_status in ('ok', 'needs_review', 'verified', 'rejected'));

alter table request_ai_metadata drop constraint if exists request_ai_metadata_credibility_score_check;
alter table request_ai_metadata
  add constraint request_ai_metadata_credibility_score_check
  check (credibility_score is null or (credibility_score >= 0 and credibility_score <= 100));

-- Only server-side keys may touch it. No public access.
alter table request_ai_metadata enable row level security;
