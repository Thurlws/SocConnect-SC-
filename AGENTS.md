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
- All demo state lives in `src/lib/demo-store.tsx` (context + localStorage); pages never import mutable data directly — this is the seam the backend phase replaces with API calls.
- Business rules are pure functions in `src/lib/demo-rules.ts` that return `{ ok, error }` (Outcome); store actions run them via `run()`. Add new rules there with tests in `src/test/demo-rules.test.ts`. State is per demo account (memberships, registrations, notifications).
- Static mock data lives in `src/data/mock.ts` with a fixed DEMO_TODAY so the demo reads the same on any day.
- Date formatting is manual in `src/lib/format.ts` (no toLocaleDateString) to avoid SSR hydration mismatches.
- The app shell wraps every route except `/welcome` in `__root.tsx`.
- Calls: with `LIVEKIT_URL`/`LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` set, calls are real multi-person video via LiveKit (`src/components/live-call.tsx`; tokens minted server-side in `src/lib/livekit.server.ts`), and each person's browser speech-to-text is shared over the data channel so the recap covers everyone. Without them, calls fall back to scripted simulated participants (`src/data/calls.ts`). Recaps fall back to a keyword summary when AI is unavailable (`src/lib/call-recap-fallback.ts`).
- AI calls go through server functions in `src/lib/calls.functions.ts`, with gateway helpers in server-only `src/lib/ai.server.ts` — keeps the API key off the client.
