-- Migration: 20261111000001_rate_limiting.sql
-- Database-backed rate limiting for Chrome extension ingest API

create table if not exists public.api_token_rate_limits (
  token_hash text not null,
  bucket_minute timestamptz not null default date_trunc('minute', now()),
  request_count integer not null default 1,
  primary key (token_hash, bucket_minute)
);

create index if not exists api_token_rate_limits_bucket_idx
  on public.api_token_rate_limits (bucket_minute);

-- Enable RLS
alter table public.api_token_rate_limits enable row level security;

-- Atomic check and increment function
create or replace function public.check_token_rate_limit(
  p_token_hash text,
  p_max_requests integer default 60
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_minute timestamptz := date_trunc('minute', now());
  v_count integer;
  v_allowed boolean;
begin
  -- Prune old entries older than 5 minutes to keep table lean
  delete from public.api_token_rate_limits
  where bucket_minute < now() - interval '5 minutes';

  -- Upsert current minute count atomically
  insert into public.api_token_rate_limits (token_hash, bucket_minute, request_count)
  values (p_token_hash, v_minute, 1)
  on conflict (token_hash, bucket_minute)
  do update set request_count = public.api_token_rate_limits.request_count + 1
  returning request_count into v_count;

  if v_count > p_max_requests then
    v_allowed := false;
  else
    v_allowed := true;
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'count', v_count,
    'limit', p_max_requests
  );
end;
$$;
