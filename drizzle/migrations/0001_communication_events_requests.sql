
-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text not null check (char_length(venue) between 2 and 120),
  category text not null,
  capacity int check (capacity is null or capacity between 1 and 5000),
  tags text[] not null default '{}',
  featured boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index on public.events(society_id, starts_at);
grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;
create policy "Read events" on public.events for select to authenticated using (true);
create policy "Committee edit events" on public.events for update to authenticated using (public.is_society_committee(society_id, auth.uid())) with check (public.is_society_committee(society_id, auth.uid()));
create policy "Committee delete events" on public.events for delete to authenticated using (public.is_society_committee(society_id, auth.uid()));

create table public.event_registrations (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
grant select on public.event_registrations to authenticated;
grant all on public.event_registrations to service_role;
alter table public.event_registrations enable row level security;
create policy "Read own registrations" on public.event_registrations for select to authenticated using (user_id = auth.uid());

create or replace function public.event_attendee_counts()
returns table(event_id uuid, attendees int) language sql stable security definer set search_path = public as $$
  select event_id, count(*)::int from public.event_registrations group by event_id
$$;

create or replace function public.society_member_counts()
returns table(society_id uuid, members int) language sql stable security definer set search_path = public as $$
  select society_id, count(*)::int from public.society_memberships where status = 'member' group by society_id
$$;

-- Announcements
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(id) on delete cascade,
  author_id uuid references public.profiles(id),
  title text not null check (char_length(title) between 3 and 100),
  body text not null check (char_length(body) between 10 and 1000),
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;
create policy "Read announcements" on public.announcements for select to authenticated using (true);
create policy "Committee post announcements" on public.announcements for insert to authenticated with check (public.is_society_committee(society_id, auth.uid()) and author_id = auth.uid());
create policy "Committee edit announcements" on public.announcements for update to authenticated using (public.is_society_committee(society_id, auth.uid()));
create policy "Committee delete announcements" on public.announcements for delete to authenticated using (public.is_society_committee(society_id, auth.uid()));

-- Channels and messages
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null default '',
  unique (society_id, slug)
);
grant select on public.channels to authenticated;
grant all on public.channels to service_role;
alter table public.channels enable row level security;
create policy "Members read channels" on public.channels for select to authenticated using (public.is_society_member(society_id, auth.uid()));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index on public.messages(channel_id, created_at);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "Members read messages" on public.messages for select to authenticated
  using (exists (select 1 from public.channels c where c.id = channel_id and public.is_society_member(c.society_id, auth.uid())));
create policy "Members post messages" on public.messages for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.channels c where c.id = channel_id and public.is_society_member(c.society_id, auth.uid())));

create or replace function public.create_default_channels()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.channels(society_id, slug, name, description) values
    (new.id, 'general', 'general', 'Chat about anything society-related'),
    (new.id, 'events', 'events', 'Plans, lifts and logistics for upcoming events'),
    (new.id, 'help', case when new.category = 'Academic' then 'help-desk' else 'questions' end, 'Ask the community')
  on conflict do nothing;
  return new;
end $$;
create trigger societies_default_channels after insert on public.societies for each row execute function public.create_default_channels();
insert into public.channels(society_id, slug, name, description)
  select s.id, v.slug, case when v.slug = 'help' and s.category = 'Academic' then 'help-desk' when v.slug = 'help' then 'questions' else v.slug end, v.d
  from public.societies s cross join (values ('general','Chat about anything society-related'),('events','Plans, lifts and logistics for upcoming events'),('help','Ask the community')) v(slug, d)
  on conflict do nothing;

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('announcements','events','discussions','requests')),
  title text not null,
  body text not null default '',
  link jsonb,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index notifications_dedupe on public.notifications(user_id, dedupe_key) where read_at is null and dedupe_key is not null;
create index on public.notifications(user_id, created_at desc);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "Read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "Mark own notifications read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.notify_user(_uid uuid, _kind text, _title text, _body text, _link jsonb, _dedupe text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p public.notification_prefs;
begin
  if _uid is null then return; end if;
  select * into p from public.notification_prefs where user_id = _uid;
  if found and ((_kind = 'announcements' and not p.announcements) or (_kind = 'events' and not p.events) or (_kind = 'discussions' and not p.discussions)) then
    return;
  end if;
  insert into public.notifications(user_id, kind, title, body, link, dedupe_key)
    values (_uid, _kind, _title, coalesce(_body, ''), _link, _dedupe)
    on conflict do nothing;
end $$;
revoke execute on function public.notify_user(uuid, text, text, text, jsonb, text) from public, anon, authenticated;

create or replace function public.notify_members(_society_id uuid, _except uuid, _kind text, _title text, _body text, _link jsonb, _dedupe text)
returns void language plpgsql security definer set search_path = public as $$
declare m record;
begin
  for m in select user_id from public.society_memberships where society_id = _society_id and status = 'member'
           union select user_id from public.society_roles where society_id = _society_id loop
    if m.user_id is distinct from _except then
      perform public.notify_user(m.user_id, _kind, _title, _body, _link, _dedupe);
    end if;
  end loop;
end $$;
revoke execute on function public.notify_members(uuid, uuid, text, text, text, jsonb, text) from public, anon, authenticated;

create or replace function public.on_announcement_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare s public.societies;
begin
  select * into s from public.societies where id = new.society_id;
  perform public.notify_members(new.society_id, new.author_id, 'announcements', s.short_name || ': ' || new.title, left(new.body, 140),
    jsonb_build_object('to', '/societies/$societyId', 'params', jsonb_build_object('societyId', s.slug)), 'ann:' || new.id);
  return null;
end $$;
create trigger announcements_notify after insert on public.announcements for each row execute function public.on_announcement_created();

create or replace function public.on_event_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare s public.societies;
begin
  select * into s from public.societies where id = new.society_id;
  perform public.notify_members(new.society_id, new.created_by, 'events', 'New event: ' || new.title,
    s.short_name || ' · ' || to_char(new.starts_at at time zone 'Europe/Dublin', 'Dy DD Mon, HH24:MI') || ' · ' || new.venue,
    jsonb_build_object('to', '/events/$eventId', 'params', jsonb_build_object('eventId', new.id)), 'ev:' || new.id);
  return null;
end $$;
create trigger events_notify after insert on public.events for each row execute function public.on_event_created();

-- Support requests
create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id),
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 10 and 2000),
  category text not null check (category in ('question','membership','event','equipment','finance','other')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  assigned_to uuid references public.profiles(id),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.support_requests to authenticated;
grant all on public.support_requests to service_role;
alter table public.support_requests enable row level security;
create policy "Submitter or committee read requests" on public.support_requests for select to authenticated
  using (submitted_by = auth.uid() or public.is_society_committee(society_id, auth.uid()));

create table public.support_request_activity (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  kind text not null check (kind in ('created','status','assigned','comment')),
  text text not null check (char_length(text) <= 2000),
  created_at timestamptz not null default now()
);
grant select on public.support_request_activity to authenticated;
grant all on public.support_request_activity to service_role;
alter table public.support_request_activity enable row level security;
create policy "Read activity of visible requests" on public.support_request_activity for select to authenticated
  using (exists (select 1 from public.support_requests r where r.id = request_id and (r.submitted_by = auth.uid() or public.is_society_committee(r.society_id, auth.uid()))));

-- Collaboration proposals (filled in Phase 4)
create table public.collaboration_proposals (
  id uuid primary key default gen_random_uuid(),
  society_a uuid not null references public.societies(id) on delete cascade,
  society_b uuid not null references public.societies(id) on delete cascade,
  title text not null,
  summary text not null default '',
  shared_interests text[] not null default '{}',
  rationale text not null default '',
  contributions jsonb not null default '{}',
  next_steps text[] not null default '{}',
  source text not null default 'ai' check (source in ('ai','committee')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
grant select on public.collaboration_proposals to authenticated;
grant all on public.collaboration_proposals to service_role;
alter table public.collaboration_proposals enable row level security;
create policy "Read proposals" on public.collaboration_proposals for select to authenticated using (true);

create table public.saved_proposals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  proposal_id uuid not null references public.collaboration_proposals(id) on delete cascade,
  primary key (user_id, proposal_id)
);
grant select, insert, delete on public.saved_proposals to authenticated;
grant all on public.saved_proposals to service_role;
alter table public.saved_proposals enable row level security;
create policy "Read own saved" on public.saved_proposals for select to authenticated using (user_id = auth.uid());
create policy "Save own" on public.saved_proposals for insert to authenticated with check (user_id = auth.uid());
create policy "Unsave own" on public.saved_proposals for delete to authenticated using (user_id = auth.uid());

-- Atomic operations
create or replace function public.join_society(_society_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare s public.societies; cur text; _uid uuid := auth.uid();
begin
  if _uid is null then raise exception 'Please sign in first.'; end if;
  select * into s from public.societies where id = _society_id and status = 'active';
  if not found then raise exception 'That society doesn''t exist.'; end if;
  select status into cur from public.society_memberships where society_id = _society_id and user_id = _uid;
  if cur = 'member' or public.is_society_committee(_society_id, _uid) then raise exception 'You''re already a member of %.', s.short_name; end if;
  if cur = 'pending' then raise exception 'Your request to join % is already pending.', s.short_name; end if;
  insert into public.society_memberships(society_id, user_id, status, requested_at, decided_at, decided_by)
    values (_society_id, _uid, case when s.requires_approval then 'pending' else 'member' end, now(), case when s.requires_approval then null else now() end, null)
    on conflict (society_id, user_id) do update set status = excluded.status, requested_at = now(), decided_at = excluded.decided_at, decided_by = null;
  if s.requires_approval then
    perform public.notify_user(r.user_id, 'requests', 'New membership request', s.short_name, jsonb_build_object('to', '/committee'), 'req:' || _society_id || ':' || _uid)
      from public.society_roles r where r.society_id = _society_id;
    return 'pending';
  end if;
  return 'member';
end $$;

create or replace function public.cancel_membership_request(_society_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s public.societies;
begin
  select * into s from public.societies where id = _society_id;
  if not found then raise exception 'That society doesn''t exist.'; end if;
  delete from public.society_memberships where society_id = _society_id and user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'You don''t have a pending request for %.', s.short_name; end if;
end $$;

create or replace function public.leave_society(_society_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s public.societies;
begin
  select * into s from public.societies where id = _society_id;
  if not found then raise exception 'That society doesn''t exist.'; end if;
  if public.is_society_committee(_society_id, auth.uid()) then raise exception 'You''re on the % committee, so you can''t leave it here.', s.short_name; end if;
  delete from public.society_memberships where society_id = _society_id and user_id = auth.uid() and status = 'member';
  if not found then raise exception 'You''re not a member of %.', s.short_name; end if;
end $$;

create or replace function public.decide_membership(_membership_id uuid, _decision text)
returns void language plpgsql security definer set search_path = public as $$
declare m public.society_memberships; s public.societies;
begin
  if _decision not in ('approve','decline') then raise exception 'Unknown decision.'; end if;
  select * into m from public.society_memberships where id = _membership_id for update;
  if not found or m.status <> 'pending' then raise exception 'This request has already been handled.'; end if;
  select * into s from public.societies where id = m.society_id;
  if not public.is_society_committee(m.society_id, auth.uid()) then raise exception 'Only the % committee can review this request.', s.short_name; end if;
  update public.society_memberships set status = case when _decision = 'approve' then 'member' else 'declined' end, decided_at = now(), decided_by = auth.uid() where id = m.id;
  perform public.notify_user(m.user_id, 'requests',
    case when _decision = 'approve' then 'You''re in! Welcome to ' || s.short_name else 'Your request to join ' || s.short_name || ' was declined' end,
    case when _decision = 'approve' then 'Your membership request was approved.' else 'You can contact the committee for more information.' end,
    jsonb_build_object('to', '/societies/$societyId', 'params', jsonb_build_object('societyId', s.slug)), null);
end $$;

create or replace function public.register_for_event(_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e public.events; n int;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  select * into e from public.events where id = _event_id for update;
  if not found then raise exception 'That event doesn''t exist.'; end if;
  if coalesce(e.ends_at, e.starts_at) < now() then raise exception 'This event has already taken place.'; end if;
  if exists (select 1 from public.event_registrations where event_id = _event_id and user_id = auth.uid()) then raise exception 'You''re already registered for this event.'; end if;
  if e.capacity is not null then
    select count(*) into n from public.event_registrations where event_id = _event_id;
    if n >= e.capacity then raise exception 'This event is full.'; end if;
  end if;
  insert into public.event_registrations(event_id, user_id) values (_event_id, auth.uid());
end $$;

create or replace function public.cancel_registration(_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.event_registrations where event_id = _event_id and user_id = auth.uid();
  if not found then raise exception 'You''re not registered for this event.'; end if;
end $$;

create or replace function public.create_event(_society_id uuid, _title text, _description text, _date date, _start time, _end time, _venue text, _category text, _capacity int)
returns uuid language plpgsql security definer set search_path = public as $$
declare s public.societies; _id uuid; _starts timestamptz;
begin
  select * into s from public.societies where id = _society_id;
  if not found then raise exception 'That society doesn''t exist.'; end if;
  if not public.is_society_committee(_society_id, auth.uid()) then raise exception 'Only the % committee can create events.', s.short_name; end if;
  _starts := (_date + _start) at time zone 'Europe/Dublin';
  if _starts < now() - interval '1 day' then raise exception 'Pick today or a later date.'; end if;
  insert into public.events(society_id, title, description, starts_at, ends_at, venue, category, capacity, tags, created_by)
    values (_society_id, btrim(_title), btrim(coalesce(_description, '')), _starts,
      case when _end is null then null else (_date + _end) at time zone 'Europe/Dublin' end,
      btrim(_venue), _category, _capacity, array[_category], auth.uid())
    returning id into _id;
  return _id;
end $$;

create or replace function public.submit_support_request(_society_id uuid, _title text, _description text, _category text, _priority text)
returns uuid language plpgsql security definer set search_path = public as $$
declare s public.societies; _id uuid;
begin
  select * into s from public.societies where id = _society_id;
  if not found then raise exception 'That society doesn''t exist.'; end if;
  if not public.is_society_member(_society_id, auth.uid()) then raise exception 'Join % to contact its committee.', s.short_name; end if;
  insert into public.support_requests(society_id, submitted_by, title, description, category, priority)
    values (_society_id, auth.uid(), btrim(_title), btrim(_description), _category, _priority) returning id into _id;
  insert into public.support_request_activity(request_id, actor_id, kind, text) values (_id, auth.uid(), 'created', 'Request submitted');
  perform public.notify_user(r.user_id, 'requests', 'New request: ' || btrim(_title), s.short_name,
    jsonb_build_object('to', '/requests/$requestId', 'params', jsonb_build_object('requestId', _id)), 'sr:' || _id)
    from public.society_roles r where r.society_id = _society_id and r.user_id <> auth.uid();
  return _id;
end $$;

create or replace function public.assign_support_request(_id uuid, _assignee uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.support_requests; nm text;
begin
  select * into r from public.support_requests where id = _id for update;
  if not found or not public.is_society_committee(r.society_id, auth.uid()) then raise exception 'Only this society''s committee can assign requests.'; end if;
  if _assignee is not null and not public.is_society_committee(r.society_id, _assignee) then raise exception 'Pick someone on this society''s committee.'; end if;
  if r.assigned_to is not distinct from _assignee then return; end if;
  update public.support_requests set assigned_to = _assignee, updated_at = now() where id = _id;
  select display_name into nm from public.profiles where id = _assignee;
  insert into public.support_request_activity(request_id, actor_id, kind, text)
    values (_id, auth.uid(), 'assigned', case when _assignee is null then 'Unassigned' else 'Assigned to ' || nm end);
end $$;

create or replace function public.set_support_request_status(_id uuid, _to text, _resolution text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.support_requests; lbl jsonb := '{"open":"Open","in_progress":"In progress","resolved":"Resolved"}';
begin
  select * into r from public.support_requests where id = _id for update;
  if not found or not public.is_society_committee(r.society_id, auth.uid()) then raise exception 'Only this society''s committee can change a request''s status.'; end if;
  if not ((r.status = 'open' and _to in ('in_progress','resolved')) or (r.status = 'in_progress' and _to in ('open','resolved')) or (r.status = 'resolved' and _to = 'in_progress')) then
    raise exception 'Can''t move a request from % to %.', lbl->>r.status, coalesce(lbl->>_to, _to);
  end if;
  if _to = 'resolved' and char_length(btrim(coalesce(_resolution, ''))) < 3 then raise exception 'Add a resolution note so the member knows the outcome.'; end if;
  update public.support_requests set status = _to, resolution = case when _to = 'resolved' then btrim(_resolution) else resolution end, updated_at = now() where id = _id;
  insert into public.support_request_activity(request_id, actor_id, kind, text)
    values (_id, auth.uid(), 'status', 'Moved to ' || (lbl->>_to) || case when _to = 'resolved' then ': ' || btrim(_resolution) else '' end);
  perform public.notify_user(r.submitted_by, 'requests', 'Request ' || lower(lbl->>_to) || ': ' || r.title,
    case when _to = 'resolved' then btrim(_resolution) else 'The committee updated your request.' end,
    jsonb_build_object('to', '/requests/$requestId', 'params', jsonb_build_object('requestId', _id)), null);
end $$;

create or replace function public.comment_on_support_request(_id uuid, _text text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.support_requests;
begin
  select * into r from public.support_requests where id = _id;
  if not found or not (r.submitted_by = auth.uid() or public.is_society_committee(r.society_id, auth.uid())) then raise exception 'You can''t comment on this request.'; end if;
  if char_length(btrim(coalesce(_text, ''))) < 1 then raise exception 'Write a comment first.'; end if;
  if char_length(_text) > 1000 then raise exception 'Comments can be up to 1,000 characters.'; end if;
  insert into public.support_request_activity(request_id, actor_id, kind, text) values (_id, auth.uid(), 'comment', btrim(_text));
  update public.support_requests set updated_at = now() where id = _id;
  if auth.uid() = r.submitted_by then
    perform public.notify_user(coalesce(r.assigned_to, x.user_id), 'requests', 'New comment: ' || r.title, left(btrim(_text), 140),
      jsonb_build_object('to', '/requests/$requestId', 'params', jsonb_build_object('requestId', _id)), 'src:' || _id)
      from (select user_id from public.society_roles where society_id = r.society_id and (r.assigned_to is null or user_id = r.assigned_to)) x;
  else
    perform public.notify_user(r.submitted_by, 'requests', 'New reply: ' || r.title, left(btrim(_text), 140),
      jsonb_build_object('to', '/requests/$requestId', 'params', jsonb_build_object('requestId', _id)), 'src:' || _id);
  end if;
end $$;

-- Committee-visible member list (no emails)
create or replace function public.society_members(_society_id uuid)
returns table(user_id uuid, display_name text, course text, status text, message text, requested_at timestamptz, decided_at timestamptz, membership_id uuid)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.display_name, p.course, m.status, m.message, m.requested_at, m.decided_at, m.id
  from public.society_memberships m join public.profiles p on p.id = m.user_id
  where m.society_id = _society_id and public.is_society_committee(_society_id, auth.uid())
$$;

alter table public.society_memberships add constraint society_memberships_message_len check (char_length(message) <= 500);
