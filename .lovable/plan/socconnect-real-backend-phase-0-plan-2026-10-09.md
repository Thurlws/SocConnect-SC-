# SocConnect real backend — Phase 0 plan

## 1. Cloud and sign-in
- Lovable Cloud is not on yet; it will be enabled at the start of Phase 1.
- Available sign-in: email/password, Google, Apple, Microsoft (Entra ID), phone, SAML SSO. Microsoft is supported, but needs your university's app registration (client ID, secret, tenant ID), so Phase 1 starts with email sign-in.
- Allowed domains: `mytudublin.ie` (students) and `tudublin.ie` (staff, so admins can sign in). Enforced server-side by a sign-up trigger, not just the form.

## 2. Phase 1 migrations (in order)
1. `profiles` + sign-up trigger (creates profile, rejects other domains).
2. `interests` + `profile_interests` (seed the 12 interest categories).
3. `app_role` enum, `user_roles`, `has_role()`; trigger grants `platform_admin` to every `@tudublin.ie` account.
4. `role_invites` + claim trigger.
5. `societies`, `society_tags`, `society_roles`, `society_memberships`, helper functions `is_society_committee()` / `is_society_member()`, member-count view.
6. `resources`.
7. `events`, `event_registrations` (attendee counts derived).
8. `announcements`, `channels` (+ default-channel trigger), `messages`.
9. `notifications`, notification prefs, support requests, call meetings and recaps (transcripts purged after 7 days, summaries kept).
10. RLS policies for every table.

No seed societies: there is no pilot. Societies start empty; admins add real ones (from mystudentlife.tudublin.ie) on a new `/admin` page.

## 3. Files changed in Phases 1–2
- New: `src/routes/auth.tsx`, `src/routes/reset-password.tsx`, `src/routes/_authenticated/route.tsx`, `src/routes/admin.tsx`, `src/lib/db-mappers.ts`, `src/lib/*.functions.ts` for societies/events/messages/requests, Cloud client files.
- Rewritten underneath (UI kept): `src/lib/demo-store.tsx` (becomes database-backed, async outcomes), `src/lib/demo-rules.ts` (Zod kept, rules move to database/server), `src/lib/format.ts` (real Dublin "now", real greeting), `src/data/mock.ts` and `src/data/calls.ts` (fake data removed; interests list kept).
- Pages: `index`, `welcome`, `societies.index`, `societies.$societyId`, `events.index`, `events.$eventId`, `communications`, `committee`, `calls.index`, `settings`, `society-pulse`, `inbox`, `requests.*`, `my-societies`, `recaps.$recapId`, `call.$roomId`, `join.$roomId`.
- Components: `app-shell` (account switcher/reset removed, sign-out added), `join-button`, `support-requests`, `calls`, `call-experience`, `live-call`.
- Server: `livekit.functions.ts` and `calls.functions.ts` require sign-in and membership.
- `src/start.ts` gains the sign-in token middleware; tests updated.

## 4. Conflicts and what I'll do instead
- No pilot society: skip pilot seed and committee invites; first committees are assigned from `/admin`.
- "Admins by email" becomes "admins by domain" (`@tudublin.ie`), per your answer — any staff account becomes an admin. Tell me if you'd prefer specific emails.
- `/join/$roomId` guest links: will require sign-in (rule 4), unless you want guest access kept for demos.
- Transcript deletion after 7 days needs a scheduled cleanup job; I'll use a nightly database schedule.
