/**
 * SocConnect demo data.
 *
 * All societies, people, events and numbers below are fictional demo entities —
 * they do not describe any real university. The demo schedule is fixed: "today"
 * is DEMO_TODAY so the app reads the same on any presentation day.
 */
import type {
  Announcement,
  CollaborationProposal,
  DiscussionChannel,
  DiscussionMessage,
  Event,
  MembershipRequest,
  MembershipStatus,
  Notification,
  Resource,
  Society,
  SupportRequest,
  User,
} from "@/lib/types";

export const DEMO_TODAY = "2026-10-12";

export const demoUsers: Record<"student" | "committee", User> = {
  student: {
    id: "u-alex",
    name: "Alex Morgan",
    role: "student",
    initials: "AM",
    course: "BSc Computer Science",
    year: "Second year",
    interests: ["Technology", "Music", "Creative", "Social", "Learning"],
  },
  committee: {
    id: "u-jordan",
    name: "Jordan Lee",
    role: "committee",
    initials: "JL",
    course: "BSc Software Engineering",
    year: "Third year",
    interests: ["Technology", "Learning", "Career", "Social"],
    committeeSocietyId: "compsoc",
  },
};

export const allInterests = [
  "Technology",
  "Music",
  "Creative",
  "Social",
  "Learning",
  "Outdoors",
  "Career",
  "Culture",
  "Sport",
  "Volunteering",
  "Games",
  "Sustainability",
];

export const societies: Society[] = [
  {
    id: "compsoc", name: "Computer Science Society", shortName: "CompSoc", category: "Academic",
    tagline: "Code, hack and learn together.",
    description: "We run weekly workshops, hackathons, tech talks with industry guests and relaxed coding socials. Whether you've never written a line of code or you're shipping side projects, there's a seat for you.",
    icon: "Code2", accent: "indigo", memberCount: 412, tags: ["Technology", "Learning", "Career"],
    committee: [{ name: "Jordan Lee", position: "President" }, { name: "Priya Nair", position: "Events Officer" }, { name: "Sam Okafor", position: "Treasurer" }],
    requiresApproval: false, meets: "Wednesdays, 18:00 · Engineering Building",
  },
  {
    id: "music", name: "Music Society", shortName: "MusicSoc", category: "Arts",
    tagline: "Play, sing, jam — every level welcome.",
    description: "Open jam nights, ensembles, songwriting circles and an end-of-term showcase. Bring an instrument, your voice, or just your ears.",
    icon: "Music", accent: "rose", memberCount: 287, tags: ["Music", "Creative", "Social"],
    committee: [{ name: "Ella Byrne", position: "President" }, { name: "Marco Russo", position: "Ensembles Lead" }],
    requiresApproval: false, meets: "Thursdays, 19:00 · Arts Centre Studio 2",
  },
  {
    id: "photo", name: "Photography Society", shortName: "PhotoSoc", category: "Arts",
    tagline: "See the campus differently.",
    description: "Photo walks, darkroom sessions, editing workshops and monthly themed challenges. Phones and film cameras equally welcome.",
    icon: "Camera", accent: "amber", memberCount: 198, tags: ["Creative", "Outdoors", "Learning"],
    committee: [{ name: "Noah Fitzgerald", position: "President" }, { name: "Hana Sato", position: "Exhibitions" }],
    requiresApproval: false, meets: "Fortnightly Tuesdays · Media Lab",
  },
  {
    id: "robotics", name: "Robotics Society", shortName: "RoboSoc", category: "Academic",
    tagline: "Build things that move.",
    description: "From line-followers to competition bots, we design, solder and program robots in a friendly lab environment.",
    icon: "Bot", accent: "sky", memberCount: 143, tags: ["Technology", "Learning", "Creative"],
    committee: [{ name: "Aoife Kelly", position: "President" }],
    requiresApproval: true, meets: "Mondays, 17:00 · Maker Lab",
  },
  {
    id: "entre", name: "Entrepreneurship Society", shortName: "EntreSoc", category: "Career",
    tagline: "Turn ideas into ventures.",
    description: "Founder talks, pitch nights and a startup weekend. We connect students with mentors and early-stage funding programmes.",
    icon: "Rocket", accent: "coral", memberCount: 256, tags: ["Career", "Learning", "Social"],
    committee: [{ name: "Daniel Osei", position: "President" }],
    requiresApproval: false, meets: "Tuesdays, 18:30 · Business School",
  },
  {
    id: "gaming", name: "Gaming Society", shortName: "GameSoc", category: "Social",
    tagline: "Casual nights, competitive leagues.",
    description: "LAN parties, console nights, esports teams and the occasional retro marathon. Friendly, inclusive and loud.",
    icon: "Gamepad2", accent: "plum", memberCount: 364, tags: ["Games", "Social", "Technology"],
    committee: [{ name: "Lucas Brennan", position: "President" }],
    requiresApproval: false, meets: "Fridays, 19:00 · Student Union",
  },
  {
    id: "intl", name: "International Students Society", shortName: "ISS", category: "Culture",
    tagline: "A home away from home.",
    description: "Cultural nights, city trips, language exchanges and a welcoming community for students from everywhere.",
    icon: "Globe2", accent: "teal", memberCount: 521, tags: ["Culture", "Social"],
    committee: [{ name: "Mei Chen", position: "President" }],
    requiresApproval: false, meets: "Various · see events",
  },
  {
    id: "hiking", name: "Hiking & Outdoor Society", shortName: "HikeSoc", category: "Sport",
    tagline: "Weekends on the trail.",
    description: "Day hikes, camping trips and navigation skills workshops. Kit can be borrowed from our gear store.",
    icon: "Mountain", accent: "emerald", memberCount: 233, tags: ["Outdoors", "Sport", "Social"],
    committee: [{ name: "Ciara Walsh", position: "President" }],
    requiresApproval: false, meets: "Saturdays · meet at main gate",
  },
  {
    id: "film", name: "Film Society", shortName: "FilmSoc", category: "Arts",
    tagline: "Watch, discuss, make films.",
    description: "Weekly screenings, director retrospectives and a short-film production group that shoots every term.",
    icon: "Clapperboard", accent: "coral", memberCount: 176, tags: ["Creative", "Culture"],
    committee: [{ name: "Ruth Adeyemi", position: "President" }],
    requiresApproval: false, meets: "Wednesdays, 19:30 · Lecture Theatre B",
  },
  {
    id: "debate", name: "Debating Society", shortName: "DebSoc", category: "Academic",
    tagline: "Argue well. Think clearly.",
    description: "British Parliamentary debates, public speaking training and inter-varsity competitions.",
    icon: "Mic2", accent: "indigo", memberCount: 129, tags: ["Learning", "Career"],
    committee: [{ name: "Tomás Ryan", position: "Auditor" }],
    requiresApproval: false, meets: "Mondays, 19:00 · Old Library",
  },
  {
    id: "enviro", name: "Environmental Society", shortName: "EnviroSoc", category: "Causes",
    tagline: "Act local, think planet.",
    description: "Campus clean-ups, a community garden, repair cafés and talks on climate policy.",
    icon: "Leaf", accent: "emerald", memberCount: 188, tags: ["Sustainability", "Volunteering", "Outdoors"],
    committee: [{ name: "Isla Murphy", position: "Chair" }],
    requiresApproval: false, meets: "Thursdays, 13:00 · Garden Hut",
  },
  {
    id: "dance", name: "Dance Society", shortName: "DanceSoc", category: "Sport",
    tagline: "Move to every rhythm.",
    description: "Classes in hip-hop, contemporary, salsa and K-pop, plus a competition squad.",
    icon: "Sparkles", accent: "rose", memberCount: 302, tags: ["Sport", "Music", "Social"],
    committee: [{ name: "Grace Kim", position: "President" }],
    requiresApproval: false, meets: "Tue & Thu, 18:00 · Sports Hall",
  },
  {
    id: "art", name: "Art Society", shortName: "ArtSoc", category: "Arts",
    tagline: "Make a mess, make something.",
    description: "Life drawing, printmaking and mural projects. Materials provided for every session.",
    icon: "Palette", accent: "amber", memberCount: 154, tags: ["Creative", "Social"],
    committee: [{ name: "Oisín Doyle", position: "President" }],
    requiresApproval: false, meets: "Wednesdays, 17:00 · Studio 4",
  },
  {
    id: "eng", name: "Engineering Society", shortName: "EngSoc", category: "Academic",
    tagline: "Design, build, test, repeat.",
    description: "Site visits, industry nights and hands-on build challenges across every engineering discipline.",
    icon: "Cog", accent: "sky", memberCount: 341, tags: ["Technology", "Career", "Learning"],
    committee: [{ name: "Fatima Hassan", position: "President" }],
    requiresApproval: false, meets: "Fortnightly Thursdays · Engineering Atrium",
  },
  {
    id: "boardgames", name: "Board Games Society", shortName: "BoardSoc", category: "Social",
    tagline: "Hundreds of games, one table.",
    description: "A library of 300+ games and relaxed weekly sessions. Teaching new players is our favourite thing.",
    icon: "Dices", accent: "plum", memberCount: 207, tags: ["Games", "Social"],
    committee: [{ name: "Ben Carter", position: "President" }],
    requiresApproval: false, meets: "Sundays, 14:00 · Student Union",
  },
  {
    id: "volunteer", name: "Volunteer Society", shortName: "VolSoc", category: "Causes",
    tagline: "Show up for your community.",
    description: "Weekly volunteering with local charities, tutoring programmes and fundraising drives.",
    icon: "HeartHandshake", accent: "teal", memberCount: 268, tags: ["Volunteering", "Social"],
    committee: [{ name: "Leah O'Brien", position: "President" }],
    requiresApproval: true, meets: "Flexible · see events",
  },
];

export const initialMemberships: Record<string, MembershipStatus> = {
  compsoc: "member",
  music: "member",
  photo: "member",
};

export const events: Event[] = [
  { id: "e-hack", title: "Autumn Hack Night", societyId: "compsoc", date: "2026-10-14", start: "18:00", end: "23:00", venue: "Engineering Building, Lab 3", category: "Workshop", capacity: 80, attendees: 62, tags: ["Technology", "Social"], featured: true,
    description: "A relaxed five-hour hack night. Form a team or join one on the night, pick a prompt, and build something fun. Pizza at 20:00, demos at 22:30. Beginners strongly encouraged." },
  { id: "e-jam", title: "Open Jam Night", societyId: "music", date: "2026-10-15", start: "19:00", end: "22:00", venue: "Arts Centre Studio 2", category: "Social", capacity: 40, attendees: 28, tags: ["Music", "Social"],
    description: "Bring an instrument or borrow one of ours. House band backs anyone who wants to play." },
  { id: "e-walk", title: "Golden Hour Photo Walk", societyId: "photo", date: "2026-10-17", start: "16:30", end: "18:30", venue: "Meet at Main Gate", category: "Outdoors", capacity: 25, attendees: 19, tags: ["Creative", "Outdoors"],
    description: "A slow walk along the river capturing evening light. Short composition tips at the start." },
  { id: "e-pitch", title: "Pitch Night Vol. 3", societyId: "entre", date: "2026-10-20", start: "18:30", end: "21:00", venue: "Business School Auditorium", category: "Talk", capacity: 150, attendees: 97, tags: ["Career"],
    description: "Eight student teams pitch to a panel of founders. Networking drinks after." },
  { id: "e-lan", title: "Halloween LAN Party", societyId: "gaming", date: "2026-10-30", start: "18:00", end: "02:00", venue: "Student Union Hall", category: "Social", capacity: 120, attendees: 120, tags: ["Games", "Social"],
    description: "Overnight LAN with costume contest and tournaments. Bring your own setup or use a society PC." },
  { id: "e-cultural", title: "Global Food Night", societyId: "intl", date: "2026-10-22", start: "18:00", end: "21:00", venue: "Student Union Atrium", category: "Social", capacity: 200, attendees: 154, tags: ["Culture", "Social"],
    description: "Dishes from 30+ countries cooked by members. Free entry, small plates." },
  { id: "e-hike", title: "Coastal Day Hike", societyId: "hiking", date: "2026-10-24", start: "08:30", end: "17:30", venue: "Coach from Main Gate", category: "Outdoors", capacity: 45, attendees: 38, tags: ["Outdoors", "Sport"],
    description: "A 14 km moderate coastal route. Bring lunch, water and waterproofs." },
  { id: "e-ai-talk", title: "Tech Talk: Building with Open Models", societyId: "compsoc", date: "2026-10-21", start: "18:00", end: "19:30", venue: "Lecture Theatre A", category: "Talk", capacity: 120, attendees: 74, tags: ["Technology", "Career", "Learning"],
    description: "An alumni engineer walks through shipping a small product on open-source models — the good, the bad and the costs." },
  { id: "e-screening", title: "Screening: Classic Sci-Fi Double Bill", societyId: "film", date: "2026-10-28", start: "19:30", end: "23:00", venue: "Lecture Theatre B", category: "Social", attendees: 41, tags: ["Culture", "Creative"],
    description: "Two classics back to back with a short discussion in the interval." },
  { id: "e-cleanup", title: "River Clean-Up", societyId: "enviro", date: "2026-10-18", start: "10:00", end: "13:00", venue: "Boathouse", category: "Volunteering", capacity: 50, attendees: 22, tags: ["Sustainability", "Volunteering", "Outdoors"],
    description: "Gloves, bags and coffee provided. Followed by lunch in the community garden." },
  { id: "e-git", title: "Git & GitHub for Beginners", societyId: "compsoc", date: "2026-11-04", start: "18:00", end: "20:00", venue: "Engineering Building, Lab 1", category: "Workshop", capacity: 40, attendees: 17, tags: ["Technology", "Learning"],
    description: "Hands-on intro to version control. Laptop required, no experience needed." },
  { id: "e-showcase", title: "Winter Showcase Auditions", societyId: "music", date: "2026-11-06", start: "17:00", end: "20:00", venue: "Arts Centre Main Hall", category: "Performance", capacity: 30, attendees: 12, tags: ["Music", "Creative"],
    description: "Five-minute slots for solo and group acts hoping to perform at December's showcase." },
  { id: "e-printmaking", title: "Linocut Printmaking", societyId: "art", date: "2026-10-27", start: "17:00", end: "19:00", venue: "Studio 4", category: "Workshop", capacity: 20, attendees: 14, tags: ["Creative"],
    description: "Carve and print your own design. All materials provided." },
  { id: "e-robot", title: "Robot Sumo Build Day", societyId: "robotics", date: "2026-11-01", start: "11:00", end: "17:00", venue: "Maker Lab", category: "Workshop", capacity: 24, attendees: 20, tags: ["Technology", "Creative"],
    description: "Build a mini sumo robot in teams, then compete at 16:00." },
];

export const initialRegistrations: string[] = ["e-hack"];

export const initialAnnouncements: Announcement[] = [
  { id: "a1", societyId: "compsoc", author: "Jordan Lee", title: "Hack Night teams are forming", body: "Our Autumn Hack Night is this Wednesday! Post in #general if you're looking for teammates — solo arrivals will be matched on the night.", createdAt: "2026-10-11T17:20:00", pinned: true },
  { id: "a2", societyId: "music", author: "Ella Byrne", title: "New practice room bookings", body: "Members can now book Studio 2 practice slots through the resources tab. Max two hours per week per person.", createdAt: "2026-10-10T12:05:00" },
  { id: "a3", societyId: "photo", author: "Noah Fitzgerald", title: "October challenge: 'Reflections'", body: "Submit up to three photos by Oct 31. Winners get printed and hung in the Media Lab.", createdAt: "2026-10-09T09:40:00" },
  { id: "a4", societyId: "compsoc", author: "Priya Nair", title: "Slides from last week's talk", body: "Slides and the recording from the Rust intro are now in Resources.", createdAt: "2026-10-08T15:30:00" },
  { id: "a5", societyId: "gaming", author: "Lucas Brennan", title: "LAN party is sold out", body: "Thanks everyone! We're running a waitlist — check the event page.", createdAt: "2026-10-08T21:10:00" },
  { id: "a6", societyId: "hiking", author: "Ciara Walsh", title: "Gear store open hours", body: "Borrow boots, jackets and packs on Thursdays 12:00–14:00.", createdAt: "2026-10-07T10:00:00" },
];

export const channels: DiscussionChannel[] = societies.flatMap((s) => [
  { id: `${s.id}-general`, societyId: s.id, name: "general", description: "Chat about anything society-related" },
  { id: `${s.id}-events`, societyId: s.id, name: "events", description: "Plans, lifts and logistics for upcoming events" },
  { id: `${s.id}-help`, societyId: s.id, name: s.category === "Academic" ? "help-desk" : "questions", description: "Ask the community" },
]);

export const initialMessages: DiscussionMessage[] = [
  { id: "m1", channelId: "compsoc-general", author: "Priya Nair", body: "Anyone want to team up for Hack Night? Thinking something with music visualisers.", createdAt: "2026-10-11T18:02:00" },
  { id: "m2", channelId: "compsoc-general", author: "Sam Okafor", body: "I'm in — I've been playing with the Web Audio API.", createdAt: "2026-10-11T18:10:00" },
  { id: "m3", channelId: "compsoc-general", author: "Jordan Lee", body: "Love it. We'll have a couple of MIDI keyboards from MusicSoc too 👀", createdAt: "2026-10-11T18:25:00" },
  { id: "m4", channelId: "compsoc-help-desk", author: "Kevin Doherty", body: "Is there a recommended setup guide for Python on Windows?", createdAt: "2026-10-10T14:00:00" },
  { id: "m5", channelId: "compsoc-help-desk", author: "Priya Nair", body: "Yep — check Resources → 'Dev environment setup'.", createdAt: "2026-10-10T14:12:00" },
  { id: "m6", channelId: "compsoc-events", author: "Aisha Bello", body: "Will the hack night have vegetarian pizza?", createdAt: "2026-10-11T09:30:00" },
  { id: "m7", channelId: "music-general", author: "Marco Russo", body: "Need a bassist for the jam on Thursday!", createdAt: "2026-10-11T11:15:00" },
  { id: "m8", channelId: "photo-general", author: "Hana Sato", body: "The light by the river was unreal yesterday. Posting a few shots soon.", createdAt: "2026-10-10T19:45:00" },
];

export const resources: Resource[] = [
  { id: "r1", societyId: "compsoc", title: "Dev environment setup", kind: "Guide", description: "Step-by-step setup for Python, Node and Git." },
  { id: "r2", societyId: "compsoc", title: "Rust intro — slides & recording", kind: "Document", description: "From last week's beginner talk." },
  { id: "r3", societyId: "compsoc", title: "Project ideas board", kind: "Link", description: "Community list of beginner-friendly projects." },
  { id: "r4", societyId: "music", title: "Practice room booking", kind: "Form", description: "Reserve Studio 2 slots." },
  { id: "r5", societyId: "photo", title: "Editing presets pack", kind: "Document", description: "Free Lightroom presets made by members." },
];

export const initialNotifications: Notification[] = [
  { id: "n1", title: "Hack Night is in 2 days", body: "You're registered for Autumn Hack Night.", createdAt: "2026-10-12T09:00:00", read: false, link: { to: "/events/$eventId", params: { eventId: "e-hack" } } },
  { id: "n2", title: "New announcement in MusicSoc", body: "New practice room bookings", createdAt: "2026-10-10T12:05:00", read: false, link: { to: "/societies/$societyId", params: { societyId: "music" } } },
  { id: "n3", title: "Photo challenge launched", body: "October challenge: 'Reflections'", createdAt: "2026-10-09T09:40:00", read: true, link: { to: "/societies/$societyId", params: { societyId: "photo" } } },
];

export const initialRequests: MembershipRequest[] = [
  { id: "req1", societyId: "compsoc", name: "Maya Patel", course: "BA Economics", message: "I'd love to learn to code — complete beginner!", requestedAt: "2026-10-11T10:00:00" },
  { id: "req2", societyId: "compsoc", name: "Ethan Clarke", course: "BSc Physics", message: "Interested in the hack nights and Python workshops.", requestedAt: "2026-10-10T16:20:00" },
  { id: "req3", societyId: "compsoc", name: "Zara Ahmed", course: "BSc Data Science", message: "", requestedAt: "2026-10-09T13:45:00" },
];

/** Member → committee requests. Alex's photo request shows a resolved one; CompSoc's fill Jordan's inbox. */
export const initialSupportRequests: SupportRequest[] = [
  { id: "sr1", societyId: "compsoc", title: "Borrow a Raspberry Pi kit for a side project", category: "equipment", priority: "normal", status: "in_progress",
    description: "Could I borrow one of the society Raspberry Pi kits for about two weeks? It's for a small home-automation project I'd like to demo at Hack Night.",
    submittedBy: "u-tom", submitterName: "Tom Becker", assignedTo: "Sam Okafor", createdAt: "2026-10-09T11:05:00", updatedAt: "2026-10-10T16:30:00",
    activity: [
      { id: "sr1-a1", at: "2026-10-09T11:05:00", actor: "Tom Becker", kind: "created", text: "Submitted the request" },
      { id: "sr1-a2", at: "2026-10-09T15:20:00", actor: "Jordan Lee", kind: "assigned", text: "Assigned to Sam Okafor" },
      { id: "sr1-a3", at: "2026-10-10T16:25:00", actor: "Sam Okafor", kind: "status", text: "Moved to In progress" },
      { id: "sr1-a4", at: "2026-10-10T16:30:00", actor: "Sam Okafor", kind: "comment", text: "We have two kits free. Can you collect one from the Engineering Building on Wednesday after 17:00?" },
    ] },
  { id: "sr2", societyId: "compsoc", title: "Is Hack Night step-free accessible?", category: "event", priority: "high", status: "open",
    description: "I use a wheelchair. Is Lab 3 step-free, and is there an accessible toilet on that floor? I'd like to know before Wednesday.",
    submittedBy: "u-aisha", submitterName: "Aisha Bello", createdAt: "2026-10-11T18:40:00", updatedAt: "2026-10-11T18:40:00",
    activity: [{ id: "sr2-a1", at: "2026-10-11T18:40:00", actor: "Aisha Bello", kind: "created", text: "Submitted the request" }] },
  { id: "sr3", societyId: "compsoc", title: "Recording of the Rust intro talk?", category: "question", priority: "low", status: "resolved",
    description: "I missed the Rust talk last week. Was it recorded?", resolution: "Yes. The slides and the recording are in Resources → \"Rust intro — slides & recording\".",
    submittedBy: "u-ethan", submitterName: "Ethan Clarke", assignedTo: "Priya Nair", createdAt: "2026-10-07T09:15:00", updatedAt: "2026-10-08T15:35:00",
    activity: [
      { id: "sr3-a1", at: "2026-10-07T09:15:00", actor: "Ethan Clarke", kind: "created", text: "Submitted the request" },
      { id: "sr3-a2", at: "2026-10-07T12:00:00", actor: "Jordan Lee", kind: "assigned", text: "Assigned to Priya Nair" },
      { id: "sr3-a3", at: "2026-10-08T15:35:00", actor: "Priya Nair", kind: "status", text: "Resolved" },
    ] },
  { id: "sr4", societyId: "photo", title: "Camera loan for the golden hour walk", category: "equipment", priority: "normal", status: "resolved",
    description: "I only have my phone. Is there a society camera I could borrow for the photo walk on the 17th?", resolution: "We've reserved a mirrorless kit for you. Collect it from Noah at the Main Gate 10 minutes before the walk.",
    submittedBy: "u-alex", submitterName: "Alex Morgan", assignedTo: "Noah Fitzgerald", createdAt: "2026-10-08T10:20:00", updatedAt: "2026-10-09T13:10:00",
    activity: [
      { id: "sr4-a1", at: "2026-10-08T10:20:00", actor: "Alex Morgan", kind: "created", text: "Submitted the request" },
      { id: "sr4-a2", at: "2026-10-08T17:45:00", actor: "Noah Fitzgerald", kind: "assigned", text: "Assigned to Noah Fitzgerald" },
      { id: "sr4-a3", at: "2026-10-09T13:10:00", actor: "Noah Fitzgerald", kind: "status", text: "Resolved" },
    ] },
];

export const proposals: CollaborationProposal[] = [
  { id: "p1", societyIds: ["compsoc", "music"], title: "Interactive Music Tech Workshop",
    summary: "Build live-coded instruments and audio visualisers, then perform with them.",
    sharedInterests: ["Creative", "Technology", "Learning"],
    rationale: "CompSoc members want creative project ideas; MusicSoc members are curious about production tools. Both run evening sessions in neighbouring buildings.",
    contributions: { compsoc: "Programming demos, Web Audio & MIDI tooling, laptops and mentors.", music: "Musicians, instruments, musical structure and a closing performance." },
    nextSteps: ["Committees meet to agree a date", "Book a room with a PA system", "Co-publish a joint event"] },
  { id: "p2", societyIds: ["photo", "hiking"], title: "Guided Photography Hike",
    summary: "A scenic day hike with composition and landscape-photography stops.",
    sharedInterests: ["Outdoors", "Creative"],
    rationale: "HikeSoc visits photogenic routes every weekend; PhotoSoc wants more locations beyond campus.",
    contributions: { photo: "Landscape tips, camera loans, a post-hike editing session.", hiking: "Route planning, safety leaders and transport." },
    nextSteps: ["Pick a route with good light stops", "Split transport costs", "Plan a joint exhibition"] },
  { id: "p3", societyIds: ["entre", "eng"], title: "Student Innovation Showcase",
    summary: "Engineering prototypes meet business pitches in one public showcase.",
    sharedInterests: ["Career", "Technology", "Learning"],
    rationale: "EngSoc has prototypes without a route to market; EntreSoc has founders looking for technical co-founders.",
    contributions: { entre: "Pitch coaching, judges and investor contacts.", eng: "Prototypes, demo stands and technical judges." },
    nextSteps: ["Agree showcase format", "Invite alumni judges", "Open project submissions"] },
  { id: "p4", societyIds: ["gaming", "compsoc"], title: "Beginner Game Jam",
    summary: "A friendly 24-hour game jam with tutorials on day one.",
    sharedInterests: ["Games", "Technology", "Social"],
    rationale: "GameSoc's members love games but few have made one; CompSoc runs workshops and can teach engines.",
    contributions: { gaming: "Playtesters, theme voting and a showcase night.", compsoc: "Engine tutorials, mentors and lab space." },
    nextSteps: ["Choose an engine to teach", "Book the lab for a weekend", "Recruit mentors"] },
  { id: "p5", societyIds: ["enviro", "volunteer"], title: "Community Repair Café",
    summary: "Fix bikes, clothes and electronics for local residents.",
    sharedInterests: ["Sustainability", "Volunteering"],
    rationale: "Both societies serve the local community and have overlapping volunteers.",
    contributions: { enviro: "Repair tools, sustainability messaging.", volunteer: "Volunteer rota and charity partners." },
    nextSteps: ["Find a community venue", "Recruit fixers"] },
  { id: "p6", societyIds: ["film", "art"], title: "Poster & Short-Film Night",
    summary: "ArtSoc designs posters for FilmSoc's student shorts premiere.",
    sharedInterests: ["Creative", "Culture"],
    rationale: "FilmSoc needs visual identity for its shorts; ArtSoc wants real briefs.",
    contributions: { film: "Films, screening venue.", art: "Printmaking and poster design." },
    nextSteps: ["Share film synopses", "Hold a poster workshop"] },
];
