# Returning users don't get the sign-in email

**Status (2026-10-15):** open. App code and migrations ruled out locally. Waiting on someone with Lovable Cloud access to fill in the checklist below.

## Symptom

A user who already has an account enters their email on `/welcome` and never receives the sign-in **link**. New users do receive theirs. It keeps happening, always to existing accounts.

The app sends a link, not a code. The first audit report said "code"; that was a wording mistake in the bug report.

## How sign-in works

1. `SignInCard.sendLink` in `src/routes/welcome.tsx:79-88` checks the domain (`emailAllowed`, `src/lib/auth.tsx:6-7`) and calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })`. The browser talks to Supabase Auth in Lovable Cloud directly. No server code of ours runs.
2. Supabase Auth (`MagicLink` handler in supabase/auth) branches:
   - new or unconfirmed address: runs sign-up, which inserts into `auth.users` (our triggers `enforce_email_domain` and `handle_new_user` fire) and sends the **Confirm signup** template;
   - existing confirmed account: sends the **Magic link** template. Our triggers are INSERT-only, so nothing of ours runs.
   - both: 60 s per-user cooldown (hosted default) and a project-wide hourly email cap.
3. On success the card shows "Check your inbox. We sent a sign-in link…". Errors are shown via `friendly()` (`welcome.tsx:69-71`), which rewrites anything containing "database error" or "tu dublin" into "Please use your TU Dublin email".

## Ruled out locally

`npm run db:start` then `npm run db:check-sign-in` (script: `dev/check-sign-in-email.mjs`). Local stack = same 7 migrations, Supabase default templates, confirmations on, 60 s cooldown. Results on 2026-10-15:

| Case | Result |
|---|---|
| New address | 200, email "Confirm your email address" |
| Open the link | session issued |
| Same address again (returning, confirmed) | 200, email "Your sign-in link" |
| Again immediately | 429 `over_email_send_rate_limit`, "For security purposes, you can only request this after 58 seconds." (the card shows this text) |
| Never-confirmed account, again after 62 s | 200, confirmation email re-sent |
| Non-university address | 500 "Please use your TU Dublin email (@mytudublin.ie)" from the trigger |

So with default settings our code sends the returning-user email. The difference in production must be in Lovable Cloud's email setup or in delivery.

## Remaining suspects

1. **Magic link template** in Lovable Cloud is broken, empty, or missing `{{ .ConfirmationURL }}`. Only returning users get this template, which matches the symptom best.
2. **Delivery to Microsoft 365** (`mytudublin.ie`): the magic-link email has a different subject and body from the confirmation email and may be junked or quarantined.
3. **Hourly cap or cooldown**: these return an error that the card displays. If users saw "Check your inbox", these are unlikely.
4. **Custom auth email hook** (Lovable "custom emails"), if one is set up, failing for the magic-link type. Unverified; nothing in this repo configures one.

Related but different: Microsoft Defender Safe Links can open single-use links before the student does, which gives "link expired" instead of "no email".

## Checklist for Lovable Cloud (roadmap task T0.2)

Needs someone signed in to the Lovable project. Fill in the answers here. Don't paste secrets or full tokens.

| # | Where | Record | Answer |
|---|---|---|---|
| 1 | Cloud → Emails → Confirm signup | Subject, and does the body contain `{{ .ConfirmationURL }}`? | |
| 2 | Cloud → Emails → Magic link | Subject, and does the body contain `{{ .ConfirmationURL }}`? Any template errors in preview? | |
| 3 | Cloud → Emails | Managed email or custom domain set up? Sender address | |
| 4 | Auth settings → Advanced | Rate limit for sending emails (per hour) | |
| 5 | Auth settings | Email confirmations on or off (auto-confirm) | |
| 6 | Auth settings | Email OTP expiration | |
| 7 | Auth settings | Site URL and redirect URLs; is the published domain listed? | |
| 8 | Auth logs | Reproduce once with a returning account: status of `POST /otp`, and any mail-send log line or error | |
| 9 | Student's Outlook | Junk folder and quarantine notices for that sender | |
| 10 | The sign-in card | Exact text shown after pressing the button | |

## Fix plan once confirmed

- Template: restore `{{ .ConfirmationURL }}` in the Magic link template and preview both templates.
- Delivery: set up a custom sending domain (SPF, DKIM, DMARC) in Lovable Cloud. That also lifts the hourly cap.
- Either way (roadmap T1.1): replace `friendly()` with messages keyed on `error.code`, add "Resend" with a 60 s countdown, and consider 6-digit codes (`verifyOtp({ email, token, type: "email" })`), which survive link scanners.
- Regression check: `npm run db:check-sign-in`. Extend it when the flow or templates change.
