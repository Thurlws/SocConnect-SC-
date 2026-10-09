
create table public.call_rooms (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(id) on delete cascade,
  slug text not null,
  name text not null check (char_length(name) between 2 and 100),
  kind text not null default 'room' check (kind in ('room','meeting')),
  description text not null default '' check (char_length(description) <= 500),
  starts_at timestamptz,
  event_id uuid references public.events(id) on delete set null,
  host_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (society_id, slug),
  check (kind = 'room' or starts_at is not null)
);
grant select on public.call_rooms to authenticated;
grant all on public.call_rooms to service_role;
alter table public.call_rooms enable row level security;
create policy "Members read rooms" on public.call_rooms for select to authenticated using (public.is_society_member(society_id, auth.uid()));

create or replace function public.create_default_rooms()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.call_rooms(society_id, slug, name, kind, description) values
    (new.id, 'lounge', 'Lounge', 'room', 'Drop in, say hi, hang out'),
    (new.id, 'huddle', 'Planning huddle', 'room', 'Quick catch-ups about upcoming plans')
  on conflict do nothing;
  return new;
end $$;
revoke execute on function public.create_default_rooms() from public, anon, authenticated;
create trigger societies_default_rooms after insert on public.societies for each row execute function public.create_default_rooms();
insert into public.call_rooms(society_id, slug, name, kind, description)
  select s.id, v.slug, v.name, 'room', v.d from public.societies s
  cross join (values ('lounge','Lounge','Drop in, say hi, hang out'),('huddle','Planning huddle','Quick catch-ups about upcoming plans')) v(slug, name, d)
  on conflict do nothing;

create table public.call_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.call_rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  guest_name text,
  livekit_identity text not null,
  joined_at timestamptz not null default now()
);
create index on public.call_participants(room_id, user_id);
grant select on public.call_participants to authenticated;
grant all on public.call_participants to service_role;
alter table public.call_participants enable row level security;
create policy "Own or committee participants" on public.call_participants for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.call_rooms r where r.id = room_id and public.is_society_committee(r.society_id, auth.uid())));

create table public.call_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.call_rooms(id) on delete cascade,
  code_hash text not null unique,
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  max_uses int not null default 20 check (max_uses between 1 and 500),
  uses int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.call_invites to authenticated;
grant all on public.call_invites to service_role;
alter table public.call_invites enable row level security;
create policy "Committee read invites" on public.call_invites for select to authenticated
  using (exists (select 1 from public.call_rooms r where r.id = room_id and public.is_society_committee(r.society_id, auth.uid())));
create policy "Committee create invites" on public.call_invites for insert to authenticated
  with check (created_by = auth.uid() and uses = 0 and expires_at <= now() + interval '7 days'
    and exists (select 1 from public.call_rooms r where r.id = room_id and public.is_society_committee(r.society_id, auth.uid())));
create policy "Committee delete invites" on public.call_invites for delete to authenticated
  using (exists (select 1 from public.call_rooms r where r.id = room_id and public.is_society_committee(r.society_id, auth.uid())));

create table public.call_recaps (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.call_rooms(id) on delete cascade,
  society_id uuid not null references public.societies(id) on delete cascade,
  title text not null,
  started_at timestamptz not null default now(),
  duration_sec int not null default 0,
  participants text[] not null default '{}',
  participant_ids uuid[] not null default '{}',
  transcript jsonb,
  summary jsonb not null,
  qa jsonb not null default '[]',
  shared boolean not null default false,
  shared_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index on public.call_recaps(society_id, created_at desc);
grant select on public.call_recaps to authenticated;
grant all on public.call_recaps to service_role;
alter table public.call_recaps enable row level security;
create policy "Participants, committee or members of shared read recaps" on public.call_recaps for select to authenticated
  using (auth.uid() = any(participant_ids) or created_by = auth.uid()
    or public.is_society_committee(society_id, auth.uid())
    or (shared and public.is_society_member(society_id, auth.uid())));

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null,
  created_at timestamptz not null default now()
);
create index on public.ai_usage(user_id, feature, created_at);
grant select on public.ai_usage to authenticated;
grant all on public.ai_usage to service_role;
alter table public.ai_usage enable row level security;
create policy "Read own usage" on public.ai_usage for select to authenticated using (user_id = auth.uid());

create or replace function public.schedule_meeting(_society_id uuid, _name text, _description text, _date date, _start time)
returns uuid language plpgsql security definer set search_path = public as $$
declare s public.societies; _id uuid; _starts timestamptz;
begin
  select * into s from public.societies where id = _society_id;
  if not found then raise exception 'That society doesn''t exist.'; end if;
  if not public.is_society_committee(_society_id, auth.uid()) then raise exception 'Only the % committee can schedule calls.', s.short_name; end if;
  if char_length(btrim(coalesce(_name, ''))) < 2 then raise exception 'Give the call a title.'; end if;
  _starts := (_date + _start) at time zone 'Europe/Dublin';
  if _starts < now() - interval '1 hour' then raise exception 'Pick a time in the future.'; end if;
  insert into public.call_rooms(society_id, slug, name, kind, description, starts_at, host_id, created_by)
    values (_society_id, 'mt-' || substr(gen_random_uuid()::text, 1, 8), btrim(_name), 'meeting', left(btrim(coalesce(_description, '')), 500), _starts, auth.uid(), auth.uid())
    returning id into _id;
  perform public.notify_members(_society_id, auth.uid(), 'events', 'Call scheduled: ' || btrim(_name),
    s.short_name || ' · ' || to_char(_starts at time zone 'Europe/Dublin', 'Dy DD Mon, HH24:MI'),
    jsonb_build_object('to', '/call/$roomId', 'params', jsonb_build_object('roomId', _id)), 'mt:' || _id);
  return _id;
end $$;
revoke execute on function public.schedule_meeting(uuid, text, text, date, time) from public, anon;

create or replace function public.share_recap(_recap_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.call_recaps; rm public.call_rooms; s public.societies; ch uuid; body text;
begin
  select * into r from public.call_recaps where id = _recap_id for update;
  if not found then raise exception 'That recap doesn''t exist.'; end if;
  select * into rm from public.call_rooms where id = r.room_id;
  if not (public.is_society_committee(r.society_id, auth.uid()) or rm.host_id = auth.uid()) then
    raise exception 'Only the committee or the call''s host can share a recap.';
  end if;
  if r.shared then return; end if;
  select * into s from public.societies where id = r.society_id;
  update public.call_recaps set shared = true, shared_at = now() where id = r.id;
  select id into ch from public.channels where society_id = r.society_id and slug = 'general';
  body := left('📋 Call recap — ' || r.title || E'\n' || coalesce(r.summary->>'overview', ''), 1000);
  if ch is not null then insert into public.messages(channel_id, author_id, body) values (ch, auth.uid(), body); end if;
  perform public.notify_members(r.society_id, auth.uid(), 'discussions', 'Call recap shared in ' || s.short_name, r.title,
    jsonb_build_object('to', '/recaps/$recapId', 'params', jsonb_build_object('recapId', r.id)), 'rc:' || r.id);
end $$;
revoke execute on function public.share_recap(uuid) from public, anon;

create or replace function public.purge_old_transcripts()
returns int language sql security definer set search_path = public as $$
  with u as (update public.call_recaps set transcript = null where transcript is not null and created_at < now() - interval '7 days' returning 1)
  select count(*)::int from u
$$;
revoke execute on function public.purge_old_transcripts() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('purge-call-transcripts', '15 3 * * *', 'select public.purge_old_transcripts()');
