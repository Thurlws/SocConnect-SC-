# Roadmap and audit findings

From the full audit of 2026-10-15. The audit report is a private page (https://claude.ai/artifact/Lfyqs1j3j9QeWVaiY8DLKs) that only its owner can open unless shared. This file is the working copy: update statuses here.

The root `roadmap.md` is Lovable's earlier phase list and is out of date.

## Findings

Line numbers are from commit `e83c5c6`.

### Must fix

| # | Finding | Where | Task | Status |
|---|---|---|---|---|
| 1 | Returning users don't receive the sign-in email | see [sign-in-email-bug.md](sign-in-email-bug.md) | T0.2, T1.1 | Investigating |
| 2 | Every `@tudublin.ie` account becomes platform admin | `drizzle/migrations/0000_identity_roles_societies.sql:264-266` | T1.2 | Open |
| 3 | SECURITY DEFINER helpers (`is_society_member`, `is_society_committee`, `has_role`, `society_visible`, `can_see_profile`) can be called through the API, so any student can probe membership of sensitive societies (GDPR Art. 9) | 0000:119-127, 0002:5-8, 0004:2-33 | T1.3 | Open |
| 4 | AI caption transcription has no quota | `src/lib/calls.functions.ts:130-142` | T1.4 | Open |
| 5 | Every tab reloads all data every 15 s | `src/lib/api/store.tsx:40`, `src/lib/api/fetch.ts:42-68` | T1.5 | Open |
| 6 | Users who posted anything can't be deleted (13 foreign keys without ON DELETE); no delete or export in the app | 0000:113, 200; 0001:15, 52, 83, 187, 193, 207, 230; 0003:11, 12, 57, 88 | T1.7 | Open |
| 7 | Anyone can exhaust the hourly sign-in email cap; no CAPTCHA | `src/routes/welcome.tsx:84`, Lovable Cloud | T1.6 | Open |
| 8 | Email change skips the domain trigger (INSERT only) | 0000:256 | T1.6 | Open |

### Should fix

| # | Finding | Where | Task | Status |
|---|---|---|---|---|
| 9 | `friendly()` turns server errors into "use your TU Dublin email" | `src/routes/welcome.tsx:69-71` | T1.1 | Open |
| 10 | No tests for any database rule | `src/test/`, migrations | T0.1 (done), T2.1 | Local stack ready |
| 11 | AI "all" block row in `society_ai_state` never expires | `src/lib/society-ai.functions.ts:8-25` | T1.4 | Open |
| 12 | A pending join request reveals the society's member profiles | 0004:21-23 | T1.3 | Open |
| 13 | Recap quota check is racy and duplicates `reserve_society_ai` | `src/lib/calls.functions.ts:21-28` | T1.4 | Open |
| 14 | No message moderation; no edit or cancel for events and announcements | 0001:88-94, `src/lib/api/store.tsx` | T2.2, T2.3 | Open |
| 15 | Missing indexes on `user_id` lookups and announcements by society and date | 0000, 0001 | T1.5 | Open |
| 16 | README described the old browser-only demo | `README.md` | T0.3 | Fixed 2026-10-15 |
| 17 | Committees can rename their society or change its logo | 0006:19-33 | Later | Open |

### Nice to have

| # | Finding | Where | Status |
|---|---|---|---|
| 18 | `getUser()` network call on every navigation | `src/routes/_authenticated/route.tsx:8-11` | Open |
| 19 | "(demo figure)" and demo calendar ids on real data | `societies.$societyId.tsx:228`, `src/lib/ics.ts:21-23` | Open (T2.4) |
| 20 | 25 unused shadcn components (3,118 lines) and about 20 packages only they use. Keep `input-otp` | `src/components/ui/` | Open (T2.6) |

## Phases

Effort in working days for one developer who knows the code: XS up to half a day, S 1-2, M 3-5, L 1-2 weeks, XL more.

### Phase 0: baseline

| Task | Status |
|---|---|
| T0.1 Local Supabase stack replaying the migrations | Done 2026-10-15: `dev/supabase/`, `db:*` scripts; all 7 migrations apply; `db:check-sign-in` passes |
| T0.2 Record Lovable Cloud auth settings and logs | Waiting on someone with Lovable access: checklist in [sign-in-email-bug.md](sign-in-email-bug.md) |
| T0.3 Rewrite README | Done 2026-10-15 |
| T0.4 CI: typecheck, tests, build | Workflow added 2026-10-15. Bun frozen-lockfile install checked locally; not yet run on GitHub |

### Phase 1: critical fixes

| Task | Pri | Effort | Needs |
|---|---|---|---|
| T1.1 Sign-in: real error messages, resend countdown, then fix whatever T0.2 finds; consider 6-digit codes | P0 | S | T0.2 |
| T1.2 Remove the staff-admin grant; review `user_roles` | P0 | XS | |
| T1.3 Move security helpers to a schema the API doesn't expose; drop `pending` from `can_see_profile` | P0 | S-M | T0.1 |
| T1.4 One quota function for all AI calls (including transcription); expire the AI block row | P1 | S | |
| T1.5 Remove `refetchInterval`; add four indexes | P1 | XS | |
| T1.6 Domain check on email change; CAPTCHA; custom sending domain | P1 | S | |
| T1.7 Fix foreign keys; delete-my-account and export | P1 | S-M | T0.1 |

### Phase 2: core and tests

T2.1 database test suite, a role-by-table permission matrix (P0, M, needs T0.1). T2.2 edit and cancel events and announcements (P1, M). T2.3 message moderation (P1, S-M). T2.4 remove demo labels (P2, XS). T2.5 Playwright journeys in CI (P1, M, needs T0.1, T0.4, T1.1). T2.6 lean cleanup and a Prettier pass (P3, XS).

### Phase 3: multi-university

T3.1 tables `universities`, `university_domains`, `university_members`, `university_roles`, plus `societies.university_id` with a TU Dublin backfill (P0, M, needs T2.1). T3.2 tenant-aware `society_visible`, society policies, `can_see_profile`, invites, `my_access`, sign-up trigger (P0, M, needs T3.1, T1.2, T1.3). T3.3 cross-university isolation tests (P0, M). T3.4 university admin console (P1, M). T3.5 remove TU Dublin hard-coding (P1, M). T3.6 yearly re-verification (P2, S).

### Phase 4: pilot readiness

T4.1 privacy notice, sub-processors, retention, DPIA, processing-agreement template (P0, M). T4.2 audit log (P1, S). T4.3 suspension (P1, S). T4.4 monitoring and alerts (P1, S). T4.5 staging project (P1, M). T4.6 onboarding runbook and society import (P2, M).

### Phase 5: when demand justifies it

Realtime notifications, per-page loading and pagination, SSO per university, email digests, analytics for societies officers, links into official membership systems.

## Milestones

- **TU Dublin demo:** T0.2, T1.1, T1.2, T0.3, T2.4, plus T0.1 and T1.3 if real students use the live site. About 3 to 10 developer-days.
- **Trinity or UCD demo:** add T2.1, T3.1-T3.3, T3.5. About 3 to 5 more developer-weeks.
- **Limited pilot:** all of Phases 0 to 4. About 7 to 12 more developer-weeks plus time with the university's DPO and IT team.
