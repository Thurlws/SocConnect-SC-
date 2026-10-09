import type { CallRecap, CallRoom } from "@/lib/types";
import { societies } from "@/data/mock";

/** Always-open drop-in rooms (Discord-style) for every society. */
export const callRooms: CallRoom[] = societies.flatMap((s) => [
  { id: `${s.id}-lounge`, societyId: s.id, name: "Lounge", kind: "room" as const, description: "Drop in, say hi, hang out" },
  { id: `${s.id}-huddle`, societyId: s.id, name: "Planning huddle", kind: "room" as const, description: "Quick catch-ups about upcoming plans" },
]);

/** Deterministic "people in room right now" so the demo reads the same every time. */
export function roomPresence(roomId: string): string[] {
  const pool = ["Priya Nair", "Sam Okafor", "Aisha Bello", "Kevin Doherty", "Hana Sato", "Ella Byrne", "Lucas Brennan", "Ciara Walsh"];
  let h = 0;
  for (const c of roomId) h = (h * 31 + c.charCodeAt(0)) % 997;
  const n = h % 4;
  return Array.from({ length: n }, (_, i) => pool[(h + i * 3) % pool.length]!);
}

export const initialMeetings: CallRoom[] = [
  { id: "mt-hack-prep", societyId: "compsoc", name: "Hack Night final prep", kind: "meeting", description: "Run-through of the schedule, judging and food order.", date: "2026-10-13", start: "18:00", eventId: "e-hack", host: "Jordan Lee" },
  { id: "mt-music-setlist", societyId: "music", name: "Open mic setlist", kind: "meeting", description: "Agree the running order for Friday's open mic.", date: "2026-10-14", start: "17:30", host: "Ella Byrne" },
  { id: "mt-photo-walk", societyId: "photo", name: "Photo walk route check", kind: "meeting", description: "Pick the route and meeting point for the city walk.", date: "2026-10-15", start: "13:00", host: "Noah Fitzgerald" },
];

export const initialRecaps: CallRecap[] = [
  {
    id: "rc-compsoc-1",
    roomId: "compsoc-huddle",
    societyId: "compsoc",
    title: "Planning huddle — Hack Night themes",
    date: "2026-10-10T19:00:00",
    durationSec: 1260,
    participants: ["Jordan Lee", "Priya Nair", "Sam Okafor"],
    transcript: [
      { speaker: "Jordan Lee", text: "Okay let's lock in the Hack Night theme today, we've got about a week.", at: 4 },
      { speaker: "Priya Nair", text: "I still like 'tools for students', it's broad enough for first years.", at: 15 },
      { speaker: "Sam Okafor", text: "Agreed. Could we add a bonus prize for anything music related? MusicSoc said they'd judge.", at: 31 },
      { speaker: "Jordan Lee", text: "Love that. I'll message Ella about judging. Food — pizza again?", at: 52 },
      { speaker: "Priya Nair", text: "Pizza plus a vegan option, last time we ran out.", at: 66 },
      { speaker: "Sam Okafor", text: "I can sort the Discord-style team matching channel here on SocConnect.", at: 88 },
      { speaker: "Jordan Lee", text: "Perfect. Budget is 300 euro for food and prizes, let's not go over.", at: 104 },
    ],
    summary: {
      overview: "The committee settled the Autumn Hack Night theme and sorted food, judging and team matching.",
      topics: ["Hack Night theme", "Prizes", "Food", "Budget"],
      decisions: ["Theme is 'Tools for students'", "Bonus prize for music-related projects, judged by MusicSoc", "Pizza with a vegan option", "€300 budget for food and prizes"],
      actionItems: [
        { owner: "Jordan Lee", task: "Ask Ella Byrne (MusicSoc) to judge the bonus prize" },
        { owner: "Priya Nair", task: "Place the pizza order including vegan options" },
        { owner: "Sam Okafor", task: "Set up the team-matching channel" },
      ],
    },
    qa: [],
    shared: true,
  },
];

/** Scripted lines simulated participants say during a demo call. */
export function callScript(societyName: string, others: string[]): { speaker: string; text: string }[] {
  const [a = "Priya Nair", b = "Sam Okafor", c = a] = others;
  return [
    { speaker: a, text: `Hey everyone! Good to see the ${societyName} crew.` },
    { speaker: b, text: "Hi! Shall we go through the plan for next week?" },
    { speaker: a, text: "Yes — I think we need to confirm the room booking by Wednesday." },
    { speaker: c, text: "I can take that, I'll email the students' union tomorrow." },
    { speaker: b, text: "We should also post an announcement so members know about it." },
    { speaker: a, text: "Good shout. Let's keep the budget under 150 euro this time." },
    { speaker: b, text: "Agreed. Could we team up with another society to share costs?" },
    { speaker: c, text: "Society Pulse suggested a few — I'll reach out to one." },
    { speaker: a, text: "Great, so: room booking, announcement, and a collab outreach." },
  ];
}
