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

The planned frontend stack is:

- React
- TypeScript
- Vite
- Tailwind CSS and/or shadcn/ui, where appropriate
- Lucide icons

The backend and identity-provider choices will be documented here once they are implemented in the repository. Keep this section aligned with the actual dependencies and configuration.

## Getting started

### Prerequisites

- Node.js (use a version compatible with the project's `package.json`)
- npm, or the package manager indicated by the lockfile

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open the local URL printed by Vite in the terminal.

### Build for production

```bash
npm run build
```

### Run checks

Use the scripts defined in `package.json`. For example, if configured:

```bash
npm run lint
npm run test
```

Not every script may be present yet. Check `package.json` before running these commands.

## Demo walkthrough

For a frontend demo, a useful presentation flow is:

1. Open SocConnect and enter the available demo experience.
2. Browse societies and open a society profile.
3. Join a society or view its membership state.
4. Read an announcement and explore a discussion.
5. Find an event and try the registration flow.
6. Open **Society Pulse** and explore a proposed collaboration.
7. Switch to the committee demo experience, if implemented.
8. Create a sample announcement or event, if that interaction is available.

Use only the steps supported by the current build. Clearly identify mock data and demo-only behaviour during presentations.

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
