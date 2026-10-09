<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## SocConnect architecture
- App data comes from `src/lib/api/` (`useData()`: one TanStack Query over the database, polled until realtime); pages never touch the database directly — keeps one seam for data.
- Permissions and multi-step writes are Postgres functions/RLS (join_society, decide_membership, register_for_event, support-request functions); mutations return `Outcome` `{ ok, error }` from `src/lib/validation.ts`, which only holds Zod form checks — the browser is never trusted.
- "Today" and times are real Europe/Dublin via `src/lib/format.ts`; societies are addressed by slug in the UI and mapped to ids in the data layer — keeps URLs stable.
- Date formatting is manual in `src/lib/format.ts` (no toLocaleDateString) to avoid SSR hydration mismatches.
- The app shell wraps every route except `/welcome` in `__root.tsx`.
- Calls: rooms/meetings live in `call_rooms`; LiveKit tokens (1h) are minted only by server functions in `src/lib/livekit.functions.ts` after an RLS membership check, with identity from the profile; guests use hashed, expiring `call_invites` codes at `/join/$code`. Without LiveKit, calls show "not available" — never simulated people.
- Recaps are written and stored server-side (`call_recaps`), rate-limited via `ai_usage`; transcripts are cleared by a nightly pg_cron job after the retention period — keeps AI cost and personal data bounded.
- AI calls go through server functions in `src/lib/calls.functions.ts`, with gateway helpers in server-only `src/lib/ai.server.ts` — keeps the API key off the client.
- Identity comes from Lovable Cloud auth via `src/lib/auth.tsx` (session, profile, `my_access()` roles); app pages live under `src/routes/_authenticated/` so signed-out visitors go to `/welcome` — never trust the browser for roles.
- Sign-up domains and admin grants are enforced by database triggers on auth.users (`enforce_email_domain`, `handle_new_user`); committee seats come from `role_invites` claimed on sign-in — keep these rules in the database, not the UI.
- Platform admins manage societies and committees at `/admin`; RLS policies (has_role / is_society_committee) are the security boundary.
- Read policies never use `USING (true)`: profiles go through `can_see_profile` (self, admins, committee, shared society), society-scoped rows through `society_visible`, resources/proposals to members/committees — keeps personal data to the people who need it.
- `.env` (public backend URL/key only) is committed; real secrets live in Cloud secrets — published builds read `.env` from the repo and break without it.
