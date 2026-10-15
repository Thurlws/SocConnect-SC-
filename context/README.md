# Context for whoever picks this up next

Working notes that carry state between sessions, for people and coding agents. The code is the source of truth; these files say what's going on, why, and what's next.

| File | What's in it |
|---|---|
| [architecture.md](architecture.md) | How the app is put together, where the rules live, environments, gotchas |
| [roadmap.md](roadmap.md) | Audit findings (numbered) and the phased task list with current status |
| [sign-in-email-bug.md](sign-in-email-bug.md) | Open bug: returning users don't get the sign-in email. Evidence so far and the Lovable Cloud checklist |

Design decisions that are already settled live in [`../AGENTS.md`](../AGENTS.md). Setup and commands are in [`../README.md`](../README.md).

## Conventions

- One topic per file. Add a file when a topic needs more than a few lines elsewhere, and list it in the table above.
- When a task finishes or a finding changes, update the relevant file in the same change, and date status lines (YYYY-MM-DD).
- Cite code as `path:line` and say which commit or date the line numbers come from.
- Never paste secrets, tokens, or students' personal data.
- Git: small commits with one logical change each, no AI co-author trailers, and ask before pushing. Never rewrite pushed history; Lovable syncs from `main`.
