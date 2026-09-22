-- Phase 3: profile provisioning, username login lookup, and database-backed login throttling.

create table private.login_rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

revoke all on private.login_rate_limits from public, anon, authenticated;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text := new.raw_user_meta_data ->> 'username';
  requested_display_name text := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    requested_username
  );
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, requested_username, requested_display_name);
  return new;
end;
$$;

create trigger auth_user_profile
after insert on auth.users
for each row execute function private.handle_new_user();

create function public.resolve_login_email(p_username text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username::text) = lower(btrim(p_username))
    and p.status = 'ACTIVE'
  limit 1;
$$;

create function public.consume_login_rate_limit(
  p_key_hash text,
  p_limit integer default 5,
  p_window_seconds integer default 900,
  p_block_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  current_row private.login_rate_limits;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
    or p_limit not between 1 and 100
    or p_window_seconds not between 1 and 86400
    or p_block_seconds not between 1 and 86400 then
    raise exception 'Invalid rate-limit input' using errcode = '22023';
  end if;

  insert into private.login_rate_limits (key_hash, attempt_count)
  values (p_key_hash, 0)
  on conflict (key_hash) do nothing;

  select * into current_row
  from private.login_rate_limits
  where key_hash = p_key_hash
  for update;

  if current_row.blocked_until is not null
    and current_row.blocked_until > v_now then
    return false;
  end if;

  if current_row.window_started_at
    + make_interval(secs => p_window_seconds) <= v_now then
    update private.login_rate_limits
    set window_started_at = v_now,
        attempt_count = 1,
        blocked_until = null,
        updated_at = v_now
    where key_hash = p_key_hash;
    return true;
  end if;

  if current_row.attempt_count >= p_limit then
    update private.login_rate_limits
    set blocked_until = v_now + make_interval(secs => p_block_seconds),
        updated_at = v_now
    where key_hash = p_key_hash;
    return false;
  end if;

  update private.login_rate_limits
  set attempt_count = attempt_count + 1,
      updated_at = v_now
  where key_hash = p_key_hash;
  return true;
end;
$$;

create function public.reset_login_rate_limit(p_key_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.login_rate_limits where key_hash = p_key_hash;
$$;

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = (select auth.uid()) and status = 'ACTIVE')
with check (id = (select auth.uid()) and status = 'ACTIVE');

grant update(display_name, avatar_url) on public.profiles to authenticated;

revoke all on function public.resolve_login_email(text) from public, anon, authenticated;
revoke all on function public.consume_login_rate_limit(text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.reset_login_rate_limit(text) from public, anon, authenticated;
grant execute on function public.resolve_login_email(text) to service_role;
grant execute on function public.consume_login_rate_limit(text, integer, integer, integer) to service_role;
grant execute on function public.reset_login_rate_limit(text) to service_role;

revoke all on function private.handle_new_user() from public, anon, authenticated;
