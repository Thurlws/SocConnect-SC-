-- ===== Identity =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  course text not null default '' check (char_length(course) <= 120),
  year text not null default '' check (char_length(year) <= 40),
  avatar_url text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Signed-in users read profiles" on public.profiles for select to authenticated using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create table public.interests (id uuid primary key default gen_random_uuid(), name text not null unique);
grant select on public.interests to authenticated;
grant all on public.interests to service_role;
alter table public.interests enable row level security;
create policy "Signed-in read interests" on public.interests for select to authenticated using (true);
insert into public.interests(name) values
 ('Technology'),('Gaming'),('Music'),('Arts'),('Sport'),('Outdoors'),('Culture'),('Volunteering'),('Business'),('Science'),('Wellbeing'),('Food');

create table public.profile_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete cascade,
  primary key (profile_id, interest_id)
);
grant select, insert, delete on public.profile_interests to authenticated;
grant all on public.profile_interests to service_role;
alter table public.profile_interests enable row level security;
create policy "Read own interests" on public.profile_interests for select to authenticated using (profile_id = auth.uid());
create policy "Add own interests" on public.profile_interests for insert to authenticated with check (profile_id = auth.uid());
create policy "Remove own interests" on public.profile_interests for delete to authenticated using (profile_id = auth.uid());

create table public.notification_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  announcements boolean not null default true,
  events boolean not null default true,
  discussions boolean not null default false,
  email boolean not null default false
);
grant select, update on public.notification_prefs to authenticated;
grant all on public.notification_prefs to service_role;
alter table public.notification_prefs enable row level security;
create policy "Read own prefs" on public.notification_prefs for select to authenticated using (user_id = auth.uid());
create policy "Update own prefs" on public.notification_prefs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===== Roles =====
create type public.app_role as enum ('platform_admin');
create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  primary key (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ===== Societies =====
create table public.societies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 100),
  short_name text not null check (char_length(short_name) between 1 and 30),
  category text not null default 'Community',
  tagline text not null default '' check (char_length(tagline) <= 140),
  description text not null default '' check (char_length(description) <= 2000),
  icon text not null default 'Users',
  accent text not null default 'indigo' check (accent in ('indigo','teal','coral','amber','rose','sky','emerald','plum')),
  requires_approval boolean not null default false,
  meets text not null default '' check (char_length(meets) <= 140),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.societies to authenticated;
grant all on public.societies to service_role;

create table public.society_tags (
  society_id uuid not null references public.societies(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete cascade,
  primary key (society_id, interest_id)
);
grant select, insert, delete on public.society_tags to authenticated;
grant all on public.society_tags to service_role;

create table public.society_roles (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'committee' check (role in ('committee','admin')),
  position text not null default 'Committee member' check (char_length(position) <= 60),
  unique (society_id, user_id)
);
grant select, insert, update, delete on public.society_roles to authenticated;
grant all on public.society_roles to service_role;

create table public.society_memberships (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','member','declined')),
  message text not null default '' check (char_length(message) <= 500),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id),
  unique (society_id, user_id)
);
grant select on public.society_memberships to authenticated;
grant all on public.society_memberships to service_role;

create or replace function public.is_society_committee(_society_id uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.society_roles where society_id = _society_id and user_id = _uid)
$$;
create or replace function public.is_society_member(_society_id uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.society_memberships where society_id = _society_id and user_id = _uid and status = 'member')
      or public.is_society_committee(_society_id, _uid)
$$;

alter table public.societies enable row level security;
create policy "Read active societies" on public.societies for select to authenticated
  using (status = 'active' or public.has_role(auth.uid(), 'platform_admin'));
create policy "Admins create societies" on public.societies for insert to authenticated
  with check (public.has_role(auth.uid(), 'platform_admin'));
create policy "Admins or committee update societies" on public.societies for update to authenticated
  using (public.has_role(auth.uid(), 'platform_admin') or public.is_society_committee(id, auth.uid()))
  with check (public.has_role(auth.uid(), 'platform_admin') or public.is_society_committee(id, auth.uid()));

-- Committee may edit only descriptive fields; status/slug changes are admin-only.
create or replace function public.guard_society_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'platform_admin') and auth.uid() is not null then
    if new.slug is distinct from old.slug or new.status is distinct from old.status then
      raise exception 'Only platform admins can change a society''s address or archive it';
    end if;
  end if;
  return new;
end $$;
create trigger societies_guard before update on public.societies for each row execute function public.guard_society_update();

alter table public.society_tags enable row level security;
create policy "Read tags" on public.society_tags for select to authenticated using (true);
create policy "Admins add tags" on public.society_tags for insert to authenticated with check (public.has_role(auth.uid(), 'platform_admin'));
create policy "Admins remove tags" on public.society_tags for delete to authenticated using (public.has_role(auth.uid(), 'platform_admin'));

alter table public.society_roles enable row level security;
create policy "Read committees" on public.society_roles for select to authenticated using (true);
create policy "Admins add committee" on public.society_roles for insert to authenticated with check (public.has_role(auth.uid(), 'platform_admin'));
create policy "Admins edit committee" on public.society_roles for update to authenticated using (public.has_role(auth.uid(), 'platform_admin')) with check (public.has_role(auth.uid(), 'platform_admin'));
create policy "Admins remove committee" on public.society_roles for delete to authenticated using (public.has_role(auth.uid(), 'platform_admin'));

alter table public.society_memberships enable row level security;
create policy "Read own or committee memberships" on public.society_memberships for select to authenticated
  using (user_id = auth.uid() or public.is_society_committee(society_id, auth.uid()));

create view public.society_member_counts with (security_invoker = on) as
  select s.id as society_id,
    (select count(*) from public.society_memberships m where m.society_id = s.id and m.status = 'member')::int as member_count
  from public.societies s;
-- counts must be visible to everyone, so expose via definer function instead of the view's RLS
create or replace function public.society_member_count(_society_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.society_memberships where society_id = _society_id and status = 'member'
$$;
grant select on public.society_member_counts to authenticated;

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  kind text not null check (kind in ('Guide','Link','Document','Form')),
  description text not null default '',
  url text not null default ''
);
grant select, insert, update, delete on public.resources to authenticated;
grant all on public.resources to service_role;
alter table public.resources enable row level security;
create policy "Read resources" on public.resources for select to authenticated using (true);
create policy "Committee add resources" on public.resources for insert to authenticated with check (public.is_society_committee(society_id, auth.uid()));
create policy "Committee edit resources" on public.resources for update to authenticated using (public.is_society_committee(society_id, auth.uid()));
create policy "Committee delete resources" on public.resources for delete to authenticated using (public.is_society_committee(society_id, auth.uid()));

-- ===== Invites =====
create table public.role_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  society_id uuid references public.societies(id) on delete cascade,
  role text not null check (role in ('committee','admin','platform_admin')),
  position text not null default 'Committee member',
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
create unique index role_invites_unique on public.role_invites (email, coalesce(society_id, '00000000-0000-0000-0000-000000000000'::uuid)) where claimed_at is null;
grant select, insert, delete on public.role_invites to authenticated;
grant all on public.role_invites to service_role;
alter table public.role_invites enable row level security;
create policy "Admins read invites" on public.role_invites for select to authenticated using (public.has_role(auth.uid(), 'platform_admin'));
create policy "Admins create invites" on public.role_invites for insert to authenticated with check (public.has_role(auth.uid(), 'platform_admin'));
create policy "Admins delete invites" on public.role_invites for delete to authenticated using (public.has_role(auth.uid(), 'platform_admin'));

create or replace function public.claim_invites(_uid uuid, _email text)
returns void language plpgsql security definer set search_path = public as $$
declare inv record;
begin
  for inv in select * from public.role_invites where email = lower(_email) and claimed_at is null loop
    if inv.society_id is null then
      insert into public.user_roles(user_id, role) values (_uid, 'platform_admin') on conflict do nothing;
    else
      insert into public.society_roles(society_id, user_id, role, position)
        values (inv.society_id, _uid, case when inv.role = 'admin' then 'admin' else 'committee' end, inv.position)
        on conflict (society_id, user_id) do update set position = excluded.position;
      insert into public.society_memberships(society_id, user_id, status, decided_at)
        values (inv.society_id, _uid, 'member', now())
        on conflict (society_id, user_id) do update set status = 'member';
    end if;
    update public.role_invites set claimed_at = now() where id = inv.id;
  end loop;
end $$;

-- Claim right away if the invited person already has an account.
create or replace function public.on_invite_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare _uid uuid;
begin
  select id into _uid from auth.users where lower(email) = new.email;
  if _uid is not null then perform public.claim_invites(_uid, new.email); end if;
  return null;
end $$;
create trigger role_invites_claim after insert on public.role_invites for each row execute function public.on_invite_created();

-- ===== Sign-up rules =====
create or replace function public.email_domain_allowed(_email text)
returns boolean language sql immutable set search_path = public as $$
  select split_part(lower(_email), '@', 2) in ('mytudublin.ie', 'tudublin.ie')
$$;

create or replace function public.enforce_email_domain()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or not public.email_domain_allowed(new.email) then
    raise exception 'Please use your TU Dublin email (@mytudublin.ie)';
  end if;
  return new;
end $$;
create trigger enforce_email_domain before insert on auth.users for each row execute function public.enforce_email_domain();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  insert into public.notification_prefs(user_id) values (new.id);
  if split_part(lower(new.email), '@', 2) = 'tudublin.ie' then
    insert into public.user_roles(user_id, role) values (new.id, 'platform_admin') on conflict do nothing;
  end if;
  perform public.claim_invites(new.id, new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ===== Current user summary for the app =====
create or replace function public.my_access()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'is_admin', public.has_role(auth.uid(), 'platform_admin'),
    'committee', coalesce((select json_agg(json_build_object('society_id', s.id, 'slug', s.slug, 'short_name', s.short_name, 'position', r.position))
       from public.society_roles r join public.societies s on s.id = r.society_id where r.user_id = auth.uid() and s.status = 'active'), '[]'::json)
  )
$$;
revoke execute on function public.my_access() from anon;