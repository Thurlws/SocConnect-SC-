# SocConnect

**One university. Every society. Connected.**

SocConnect is a university society platform designed to bring society discovery, membership, communications, events, and community management into one place.

Instead of relying on a different combination of social media accounts, group chats, emails, and spreadsheets for every society, students can use SocConnect to find communities, keep up with announcements, discover events, and participate in university life. Society committees can use dedicated workspaces to share updates, organise activities, and manage their communities.

> **Project status:** Hackathon project / prototype. Features described as planned or in development should not be assumed to be production-ready. Update this README as implementation progresses.

## Why SocConnect?

University society information and communication can be spread across multiple platforms. This makes it harder for students to discover communities and keep track of activities, while committees may need to maintain several separate tools.

SocConnect aims to provide a central home for university societies, making it easier to:

- **Discover** societies and communities that match students' interests.
- **Connect** through society announcements and discussions.
- **Participate** by finding events and managing registrations.
- **Collaborate** by discovering potential partnerships between societies.

## Core features

### For students
- Browse and search societies by name, category, and interests.
- View society profiles and membership information.
- Join societies or request membership where approval is required.
- See announcements and updates from joined societies in one place.
- Discover events and manage event registrations.
- Explore recommendations based on declared interests.

### For society committees
- Maintain a society profile.
- Publish announcements.
- Create and manage events.
- Review membership requests.
- Communicate with members.
- Keep useful society information and resources together.

### Society Pulse
**Society Pulse** is SocConnect's collaboration-discovery concept. It helps societies explore shared interests and generate ideas for joint activities—for example, a proposed music technology workshop between technology and music communities.

Suggestions are proposals, not confirmed partnerships or scheduled events.

## Project status and scope

SocConnect is being developed in stages:

1. **Frontend prototype:** establish the design, navigation, screens, and demo interactions.
2. **Full-stack implementation:** connect the interface to persistent data and implement real authentication, membership, events, and communications.
3. **Testing and deployment:** verify user journeys, permissions, reliability, and deployment configuration.

The current repository may contain demo data and local-only interactions. Check the implementation before relying on any feature.

Unless explicitly implemented and tested in this repository, do **not** assume the following are available:
- Real Microsoft university-account authentication.
- Persistent backend storage.
- Production-grade role-based access control.
- Real-time messaging or push notifications.
- Verified live university society or event information.

Demo societies, events, memberships, and statistics should be treated as sample data, not verified information about any particular university.

## Technology

- React 19 + TypeScript, TanStack Start/Router (SSR), Vite
- Tailwind CSS v4 with shadcn/ui (Radix) components, Lucide icons
- Zod for input validation, Sonner toasts, Vitest + Testing Library
- AI call recaps through server functions (`src/lib/calls.functions.ts`); the `LOVABLE_API_KEY` stays on the server

There is **no backend database or real authentication yet**. All app state is demo state in the browser (see *Demo mode* below).

## Getting started

### Prerequisites

- Node.js 22+ (tested with Node 26)
- [Bun](https://bun.sh) is the project's package manager (`bun.lock`, used by Lovable). npm also works with the same `package.json`. Don't commit a `package-lock.json`.

### Install, run and build

```bash
bun install          # or: npm install
bun run dev          # or: npm run dev
bun run build        # or: npm run build
```

### Run checks

```bash
bun run typecheck    # tsc --noEmit
bun run test         # vitest run
bun run lint         # eslint (the existing code has many Prettier formatting errors; run `bun run format` to fix them)
```

## Demo mode: what's real and what isn't

All state lives in `src/lib/demo-store.tsx`. It's saved to `localStorage` under `socconnect-demo-v2`, so it stays in **this browser only** and other users never see it. Reset it from the profile menu or **Settings → Demo controls**. The two demo accounts (Alex Morgan, student; Jordan Lee, CompSoc committee) are fictional, and anyone can switch between them. **The account switcher is not authentication, and the checks below are not security.**

Business rules are pure functions in `src/lib/demo-rules.ts`, tested in `src/test/demo-rules.test.ts`. Every store action returns `{ ok, error }`, so the UI shows a clear error instead of corrupting the state:

- **Membership:** join open societies instantly; approval-only societies (CompSoc, RoboSoc, VolSoc) create a pending request that you can cancel. Duplicate joins or requests, leaving a society you aren't in, and a committee member leaving their own society are all rejected.
- **Request review:** only the society's own committee can review. **Approve** adds the person as a member and updates the member count; **Decline** doesn't. A student's own request appears in the committee inbox and they get notified of the decision.
- **Events:** no duplicate registrations, no registering beyond capacity (there's no waitlist) and no registering for past events. Attendee and member counts are derived from the seeded figures plus demo actions. Registered events can be exported as `.ics`.
- **Committee actions** (announcements, events, profile edits) are checked against the acting account's society and validated with Zod (lengths, end time after start, capacity of at least 1, no past dates).
- **Notifications** are in-app only and follow the toggles in Settings. Identical unread notifications aren't repeated. There's no email or push delivery.
- **Discussions** are saved in this browser only and aren't real-time.
- **Calls:** your camera and mic are real; the other participants are scripted. There are no real calls between members yet.

To move to a real backend, re-implement the `demo-rules.ts` checks on the server and in database policies (for example Supabase row-level security). They shouldn't stay client-side only.

## Demo walkthrough

A 2–3 minute flow that only uses working features (reset the demo data first):

1. **Welcome → Explore as a student** (Alex). Home shows registrations, announcements and recommendations.
2. **Discover Societies** → open **CompSoc** → **Joined → Leave**. CompSoc needs approval, so click **Request to join**. The button now shows *Pending · cancel*.
3. Open **Events** → *Halloween LAN Party* shows **Event full** (capacity is enforced). Register for *Open Jam Night* and download the `.ics` file.
4. Profile menu → **Jordan Lee · Committee**. The **Committee** page lists Alex's request. **Approve** it: the member count goes up and it shows under *Recently reviewed*. **Decline** a different request to show it doesn't add a member.
5. Post an announcement and create an event. Try an end time before the start time to show the validation.
6. Switch back to Alex. The bell shows *"You're in! CompSoc approved your request"* and the new announcement.
7. **Society Pulse** → pick two societies → explore a curated idea (labelled as a proposal, not a confirmed event).
8. **Calls** → join a room. Point out that the camera is real, the other participants are simulated, and you get a recap at the end.

Say clearly that the data is fictional and stored only in this browser.

## Repository structure

The exact structure depends on the generated implementation. A typical frontend structure may look like:

```text
src/
├── components/    # Shared UI components
├── pages/         # Route-level pages
├── data/          # Demo data and seed content
├── types/         # Shared TypeScript domain types
├── hooks/         # Reusable React hooks
├── lib/           # Utilities and integration helpers
└── ...
```

Update this section to reflect the actual repository layout.

## Data, privacy, and security

- Use sample or explicitly consented data for demonstrations.
- Do not commit passwords, API keys, access tokens, or other secrets.
- Configure authentication and authorisation on the server when backend functionality is added.
- Hiding a button in the frontend is not a security boundary.
- Restrict society committee actions to authorised users in the backend.
- Avoid exposing private member details in public society pages.
- Verify society and event information before presenting it as official.

Microsoft sign-in is an intended direction for university access, but it requires a properly configured identity application and appropriate account/tenant restrictions. A demo role switcher is not real authentication.

## Roadmap

- [ ] Society directory, search, and filters
- [ ] Society profiles and membership flows
- [ ] Unified announcements and communications
- [ ] Event discovery and registration
- [ ] Committee workspace and management actions
- [ ] Society Pulse collaboration discovery
- [ ] Microsoft university-account authentication
- [ ] Persistent database and server-side authorisation
- [ ] Real-time discussions and notifications, if in scope
- [ ] Automated tests for core user journeys
- [ ] Deployment and setup documentation

Adjust the checklist to reflect the actual state of the project.

## Screenshots and demo

Add screenshots or a short GIF here once the interface is ready.

- **Live demo:** _Add URL when available_
- **Demo video:** _Add URL when available_

## Contributing

This is a hackathon project. If contributing with the team:

1. Create a branch for your change.
2. Keep components and domain logic reasonably separated.
3. Test the affected user journey.
4. Do not commit secrets or real personal data.
5. Update this README when setup steps, architecture, or feature status changes.

## Team

_Add team members and links here._

## License

_No license has been specified yet. Add a license before distributing or reusing the project outside the team._
