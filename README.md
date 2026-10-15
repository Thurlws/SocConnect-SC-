# SocConnect

A web app for university societies. Students find societies, join them, register for events and get announcements in one feed. Committees review membership requests, post updates, run events, answer member requests and hold video calls with AI recaps.

It started as a hackathon project at TU Dublin and currently supports TU Dublin only. The domain rules, branding and society data are TU Dublin's.

> **Status:** prototype with a real backend, not yet piloted. Known open problems and the plan are in [`context/`](context/README.md). Start there if you're picking up the work.

## How it fits together

- **Frontend:** React 19, TypeScript, TanStack Router and Start (server rendering), Tailwind CSS 4, shadcn/ui.
- **Backend:** Supabase (Postgres and Auth), managed by Lovable Cloud. The browser reads and writes the database directly with the signed-in user's token. Row-level security policies and SQL functions in [`drizzle/migrations/`](drizzle/migrations) enforce every permission and business rule, so the browser is never trusted.
- **Server functions** in `src/lib/*.functions.ts` handle the parts that need secrets: LiveKit call tokens and guest links, AI recaps, captions and society recommendations.
- **Sign-in:** an emailed sign-in link (`supabase.auth.signInWithOtp`). Only `@mytudublin.ie` and `@tudublin.ie` addresses can sign up; a database trigger enforces this.

[`AGENTS.md`](AGENTS.md) has the design decisions in more detail.

## Requirements

- Node.js 22 or newer (we use 24 in CI and 26 locally)
- [Bun](https://bun.sh) as the package manager (`bun.lock`, also used by Lovable). npm works with the same `package.json`, but don't commit a `package-lock.json`.
- Docker, only for the local database

## Run it

```bash
bun install
bun run dev
```

The app runs on http://localhost:8080.

Out of the box it talks to the **production** Lovable Cloud backend, because the committed `.env` holds its public URL and key. That database has real students in it. Use the local database below for anything beyond looking around.

## Local database

The Supabase CLI runs through `npx`, pinned to one version, so there's nothing to install apart from Docker.

```bash
bun run db:start          # first run pulls the Docker images, takes a few minutes
bun run db:reset          # rebuild the database from drizzle/migrations
bun run db:check-sign-in  # check that new and returning users get a sign-in email
bun run db:stop
```

`db:start` replays all migrations in `drizzle/migrations/` (in filename order) and prints the local URLs and keys. Run `bun run supabase status` to see them again. To point the app at the local stack, create `.env.local` (git ignores it, and it overrides `.env`):

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key from db:start>
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=<publishable key from db:start>
SUPABASE_SERVICE_ROLE_KEY=<secret key from db:start>
```

Local sign-in emails never leave your machine. Read them in Mailpit at http://127.0.0.1:54324.

The local stack's settings are in `dev/supabase/config.toml`. The `supabase/config.toml` at the repo root belongs to Lovable Cloud, so leave it alone.

## Checks

```bash
bun run typecheck
bun run test
bun run build
bun run lint     # currently fails on about 2,500 Prettier formatting errors; `bun run format` fixes them
```

CI runs typecheck, tests and build on every pull request and every push to `main` (`.github/workflows/ci.yml`). The unit tests cover helpers and rendering only. Nothing tests the database rules yet.

## Environment variables

| Variable | Where it lives | Used for |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` (committed, public) | Browser database client |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | `.env` (committed, public) | Server functions acting as the signed-in user |
| `SUPABASE_SERVICE_ROLE_KEY` | Lovable Cloud secrets | Server functions that bypass row-level security: call tokens, recaps, AI quotas |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Hosting environment | Live video calls. Without them, calls show "not available". |
| `LOVABLE_API_KEY` | Provided by Lovable hosting | AI recaps, captions and recommendations. Without it, recaps fall back to a keyword summary. |

`.env` is committed on purpose: published builds read it and break without it. It must only ever hold public values. Put secrets and local overrides in `.env.local`. [`.env.example`](.env.example) lists the server-only variables.

## Database changes

Migrations are plain SQL files in `drizzle/migrations/`. Drizzle is only the migration runner (`drizzle/schema.ts` is intentionally blank), and Lovable applies the migrations to Lovable Cloud.

To add one by hand, create the next numbered file, add a matching entry to `drizzle/migrations/meta/_journal.json`, and run `bun run db:reset` to check it applies on a clean database. Then confirm in Lovable that it reached production. We haven't verified how Lovable picks up hand-written migrations pushed from GitHub.

## Deploying

The app is hosted by Lovable, which publishes from the GitHub branch it is connected to (`main`). A plain `bun run build` targets Cloudflare Workers (`.output/nitro.json` shows preset `cloudflare-module`).

Older notes described deploying to Vercel. That hasn't been tested since the move to Lovable Cloud. It would at least need `SUPABASE_SERVICE_ROLE_KEY` and the LiveKit variables set in Vercel.

## Official TU Dublin society data

The society directory comes from the public [TU Dublin Societies site](https://societies.tudublin.ie/societies/). A Scrapy crawler kept outside this repo (`student-society-spot-extractor/tud_scrapy`) collects each society's profile, and `build_socconnect_seed.py` turns the result into `drizzle/migrations/0006_official_tud_societies.sql`. That migration:

- adds official-data columns to `societies` (campus, logo and banner URLs, MyStudentLife join URL, official URL, contact email, links, extra sections, and source tracking fields);
- upserts the 67 societies, matched on `(source, source_id)`, and adds interest tags for recommendations;
- can be regenerated and re-applied. Committee edits to the tagline, description and meeting time survive a refresh, and societies that disappear from the source are never deleted automatically.

Student-number email addresses, phone numbers and committee names from the source site are not imported. Logos and banners are linked from the official site rather than copied, because we haven't confirmed the right to republish them.

## Video calls

Society calls are real multi-person calls when the LiveKit variables are set. Create a project at [LiveKit Cloud](https://cloud.livekit.io) and copy its URL, API key and secret. For local runs, put them in `.env.local`.

- Camera and microphone need HTTPS. Test on the deployed URL; `http://<your-ip>:8080` won't get camera access (only `localhost` is exempt).
- Captions record 7-second audio clips while someone speaks and send them to the server for AI transcription. Spoken and typed lines are shared with everyone in the call and feed the recap. Anyone in the call can switch captions off.
- Committees can create guest links (`/join/<code>`) that expire and have a use limit.

## Known issues

- Returning users sometimes don't receive the sign-in email. See [`context/sign-in-email-bug.md`](context/sign-in-email-bug.md).
- Single university only. TU Dublin is hard-coded in the sign-up trigger and in about a dozen source files.
- The October 2026 audit found several access-control and privacy problems that need fixing before a pilot. See [`context/roadmap.md`](context/roadmap.md).

## Project layout

```text
src/
  routes/             pages (file-based routing); signed-in pages live in _authenticated/
  components/         app components; ui/ holds generated shadcn components
  lib/api/            the single data layer: loads data, runs database functions
  lib/*.functions.ts  server functions (calls, guest links, AI)
  lib/*.server.ts     server-only helpers (LiveKit, AI gateway)
  integrations/       Supabase and Lovable clients, generated by Lovable (don't edit)
  test/               Vitest tests
drizzle/migrations/   database schema, policies and functions as SQL
dev/                  local Supabase stack and dev scripts
context/              notes for whoever picks up the work next
```

## License

No license has been chosen yet. Add one before anyone outside the team reuses the code.

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
