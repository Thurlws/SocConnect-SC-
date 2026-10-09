-- Helpers (security definer to avoid RLS recursion)
create or replace function public.society_visible(_society_id uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _uid is not null and (
    exists (select 1 from public.societies where id = _society_id and status = 'active')
    or public.has_role(_uid, 'platform_admin')
    or public.is_society_committee(_society_id, _uid)
  )
$$;

create or replace function public.can_see_profile(_profile uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _uid is not null and (
    _profile = _uid
    or public.has_role(_uid, 'platform_admin')
    -- committee members are public contacts for their societies
    or exists (select 1 from public.society_roles where user_id = _profile)
    -- people who share a society (member or committee) can see each other
    or exists (
      select 1
      from (select society_id from public.society_memberships where user_id = _uid and status in ('member','pending')
            union select society_id from public.society_roles where user_id = _uid) mine
      join (select society_id from public.society_memberships where user_id = _profile and status in ('member','pending')
            union select society_id from public.society_roles where user_id = _profile) theirs
        on mine.society_id = theirs.society_id
    )
  )
$$;

revoke execute on function public.society_visible(uuid, uuid) from public, anon;
revoke execute on function public.can_see_profile(uuid, uuid) from public, anon;
grant execute on function public.society_visible(uuid, uuid) to authenticated;
grant execute on function public.can_see_profile(uuid, uuid) to authenticated;

-- profiles: only yourself, admins, committee members, and people you share a society with
drop policy if exists "Signed-in users read profiles" on public.profiles;
create policy "Read visible profiles" on public.profiles for select to authenticated
  using (public.can_see_profile(id, auth.uid()));

-- interests: catalogue for signed-in users
drop policy if exists "Signed-in read interests" on public.interests;
create policy "Signed-in read interests" on public.interests for select to authenticated
  using (auth.uid() is not null);

-- society-scoped public info: only for active societies (or admins/committee)
drop policy if exists "Read tags" on public.society_tags;
create policy "Read tags" on public.society_tags for select to authenticated
  using (public.society_visible(society_id, auth.uid()));

drop policy if exists "Read committees" on public.society_roles;
create policy "Read committees" on public.society_roles for select to authenticated
  using (public.society_visible(society_id, auth.uid()));

drop policy if exists "Read events" on public.events;
create policy "Read events" on public.events for select to authenticated
  using (public.society_visible(society_id, auth.uid()));

drop policy if exists "Read announcements" on public.announcements;
create policy "Read announcements" on public.announcements for select to authenticated
  using (public.society_visible(society_id, auth.uid()));

-- resources: members, committee and admins only
drop policy if exists "Read resources" on public.resources;
create policy "Read resources" on public.resources for select to authenticated
  using (public.is_society_member(society_id, auth.uid()) or public.has_role(auth.uid(), 'platform_admin'));

-- collaboration proposals: committees of either society, the creator, and admins
drop policy if exists "Read proposals" on public.collaboration_proposals;
create policy "Read proposals" on public.collaboration_proposals for select to authenticated
  using (
    created_by = auth.uid()
    or public.is_society_committee(society_a, auth.uid())
    or public.is_society_committee(society_b, auth.uid())
    or public.has_role(auth.uid(), 'platform_admin')
  );