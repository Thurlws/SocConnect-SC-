import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  channels,
  DEMO_TODAY,
  demoUsers,
  events as baseEvents,
  initialAnnouncements,
  initialMemberships,
  initialMessages,
  initialNotifications,
  initialRegistrations,
  initialRequests,
  societies as baseSocieties,
} from "@/data/mock";
import type { CallRecap, CallRoom, Event, MembershipStatus, Role } from "@/lib/types";
import { demoNowIso } from "@/lib/format";
import { callRooms, initialMeetings, initialRecaps } from "@/data/calls";
import * as rules from "@/lib/demo-rules";
import type { AnnouncementInput, DemoContext, DemoState, EventInput, NotificationPrefs, Outcome } from "@/lib/demo-rules";

/**
 * Central demo state. This is the single seam the backend phase replaces:
 * swap these actions for API calls and keep the hook surface the same.
 *
 * Every mutating action runs a pure rule from `demo-rules.ts` and returns an Outcome,
 * so invalid transitions (duplicate joins, full events, cross-society committee actions…)
 * are rejected with a message instead of silently corrupting the demo.
 */
const student = demoUsers.student;
const committee = demoUsers.committee;

const baseline: DemoContext["baseline"] = {
  memberships: { [student.id]: initialMemberships, [committee.id]: { compsoc: "member" } },
  registrations: { [student.id]: initialRegistrations, [committee.id]: [] },
};

const initialState = (): DemoState => ({
  role: "student",
  memberships: {
    [student.id]: { ...initialMemberships },
    [committee.id]: { ...baseline.memberships[committee.id] },
  },
  registrations: { [student.id]: [...initialRegistrations], [committee.id]: [] },
  approvedMembers: {},
  announcements: [...initialAnnouncements],
  messages: [...initialMessages],
  notifications: { [student.id]: [...initialNotifications], [committee.id]: [] },
  requests: [...initialRequests],
  resolvedRequests: [],
  createdEvents: [],
  societyEdits: {},
  savedProposals: [],
  interests: [...student.interests],
  prefs: { announcements: true, events: true, discussions: false, email: false },
  meetings: [...initialMeetings],
  recaps: [...initialRecaps],
});

// v2: per-user memberships, registrations and notifications (v1 data is ignored).
const KEY = "socconnect-demo-v2";
let idCounter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

const ctx: DemoContext = {
  today: DEMO_TODAY,
  now: demoNowIso(),
  newId: uid,
  users: [student, committee],
  societies: baseSocieties,
  baseEvents,
  channels,
  baseline,
};

const actorFor = (s: DemoState) => (s.role === "committee" ? committee : { ...student, interests: s.interests });

function useDemoValue() {
  const [state, setState] = useState<DemoState>(initialState);
  const [loaded, setLoaded] = useState(false);
  // Latest state, updated synchronously so rapid repeated clicks are checked against fresh data.
  const ref = useRef(state);

  const commit = useCallback((next: DemoState) => {
    ref.current = next;
    setState(next);
  }, []);
  const update = (fn: (s: DemoState) => DemoState) => commit(fn(ref.current));
  const run = (fn: (s: DemoState, actor: ReturnType<typeof actorFor>) => Outcome): Outcome => {
    const out = fn(ref.current, actorFor(ref.current));
    if (out.ok) commit(out.state);
    return out;
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<DemoState>) : null;
      if (parsed && typeof parsed === "object" && parsed.memberships && !Array.isArray(parsed.registrations))
        commit({ ...initialState(), ...parsed });
    } catch {
      /* ignore corrupt or unavailable demo storage */
    }
    setLoaded(true);
  }, [commit]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: the demo keeps working in memory */
    }
  }, [state, loaded]);

  const user = actorFor(state);

  const societies = useMemo(
    () => baseSocieties.map((s) => ({ ...s, ...state.societyEdits[s.id], memberCount: rules.memberCount(state, s, ctx) })),
    [state],
  );
  const events = useMemo(
    () => rules.allEvents(state, ctx).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.createdEvents],
  );

  const getSociety = useCallback((id: string) => societies.find((s) => s.id === id), [societies]);
  const getEvent = useCallback((id: string) => events.find((e) => e.id === id), [events]);

  const membership = (id: string): MembershipStatus => rules.membershipOf(state, user.id, id);
  const notifications = state.notifications[user.id] ?? [];

  const getRoom = (id: string) => callRooms.find((r) => r.id === id) ?? state.meetings.find((m) => m.id === id);

  const scheduleMeeting = (m: Omit<CallRoom, "id" | "kind">) => {
    const id = uid("mt");
    update((s) => {
      let next: DemoState = { ...s, meetings: [...s.meetings, { ...m, id, kind: "meeting" }] };
      const soc = baseSocieties.find((x) => x.id === m.societyId);
      for (const u of ctx.users)
        if (u.id !== actorFor(s).id && rules.membershipOf(next, u.id, m.societyId) === "member")
          next = rules.notify(next, u.id, "events", {
            title: `Call scheduled: ${m.name}`,
            body: `${soc?.shortName} · ${m.date} at ${m.start}`,
            link: { to: "/call/$roomId", params: { roomId: id } },
          }, ctx);
      return next;
    });
    return id;
  };

  const saveRecap = (r: Omit<CallRecap, "id" | "qa" | "shared">) => {
    const id = uid("rc");
    update((s) => ({ ...s, recaps: [{ ...r, id, qa: [], shared: false }, ...s.recaps] }));
    return id;
  };

  const updateRecapQa = (id: string, qa: CallRecap["qa"]) =>
    update((s) => ({ ...s, recaps: s.recaps.map((r) => (r.id === id ? { ...r, qa } : r)) }));

  const shareRecap = (id: string) =>
    update((s) => {
      const r = s.recaps.find((x) => x.id === id);
      if (!r || r.shared) return s;
      const actor = actorFor(s);
      const soc = baseSocieties.find((x) => x.id === r.societyId);
      const body = `📋 Call recap — ${r.title}\n${r.summary.overview}${r.summary.actionItems.length ? `\nAction items: ${r.summary.actionItems.map((a) => `${a.owner}: ${a.task}`).join("; ")}` : ""}`;
      let next: DemoState = {
        ...s,
        recaps: s.recaps.map((x) => (x.id === id ? { ...x, shared: true } : x)),
        messages: [...s.messages, { id: uid("m"), channelId: `${r.societyId}-general`, author: actor.name, body, createdAt: ctx.now }],
      };
      for (const u of ctx.users)
        if (u.id !== actor.id && rules.membershipOf(next, u.id, r.societyId) === "member")
          next = rules.notify(next, u.id, "discussions", {
            title: `Call recap shared in ${soc?.shortName}`,
            body: r.title,
            link: { to: "/recaps/$recapId", params: { recapId: id } },
          }, ctx);
      return next;
    });

  const setNotifications = (fn: (n: typeof notifications) => typeof notifications) =>
    update((s) => {
      const id = actorFor(s).id;
      return { ...s, notifications: { ...s.notifications, [id]: fn(s.notifications[id] ?? []) } };
    });

  return {
    loaded,
    meetings: state.meetings,
    recaps: state.recaps,
    getRoom,
    scheduleMeeting,
    saveRecap,
    updateRecapQa,
    shareRecap,
    user,
    role: state.role,
    societies,
    events,
    announcements: state.announcements,
    messages: state.messages,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    requests: state.requests,
    resolvedRequests: state.resolvedRequests,
    registrations: state.registrations[user.id] ?? [],
    savedProposals: state.savedProposals,
    prefs: state.prefs,
    interests: state.interests,
    getSociety,
    getEvent,
    membership,
    approvedMembers: (societyId: string) => state.approvedMembers[societyId] ?? [],
    attendeeCount: (e: Event) => rules.attendeeCount(state, e, ctx),
    eventAvailability: (e: Event) => rules.eventAvailability(state, user.id, e, ctx),
    isRegistered: (id: string) => rules.isRegisteredFor(state, user.id, id),
    canManage: (societyId: string) => rules.canManageSociety(user, societyId),
    joinedSocieties: societies.filter((s) => membership(s.id) === "member"),
    setRole: (role: Role) => update((s) => ({ ...s, role })),
    joinSociety: (id: string) => run((s, a) => rules.joinSociety(s, a, id, ctx)),
    cancelRequest: (id: string) => run((s, a) => rules.cancelRequest(s, a, id, ctx)),
    leaveSociety: (id: string) => run((s, a) => rules.leaveSociety(s, a, id, ctx)),
    registerForEvent: (id: string) => run((s, a) => rules.registerForEvent(s, a, id, ctx)),
    cancelRegistration: (id: string) => run((s, a) => rules.cancelRegistration(s, a, id, ctx)),
    postAnnouncement: (societyId: string, input: AnnouncementInput) =>
      run((s, a) => rules.postAnnouncement(s, a, societyId, input, ctx)),
    createEvent: (societyId: string, input: EventInput) => run((s, a) => rules.createEvent(s, a, societyId, input, ctx)),
    postMessage: (channelId: string, body: string) => run((s, a) => rules.postMessage(s, a, channelId, body, ctx)),
    resolveRequest: (id: string, decision: "approve" | "decline") =>
      run((s, a) => rules.resolveRequest(s, a, id, decision, ctx)),
    editSociety: (id: string, patch: { tagline: string; description: string; meets: string }) =>
      run((s, a) => rules.editSociety(s, a, id, patch, ctx)),
    markRead: (id: string) => setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n))),
    markAllRead: () => setNotifications((ns) => ns.map((n) => ({ ...n, read: true }))),
    toggleProposal: (id: string) =>
      update((s) => ({ ...s, savedProposals: s.savedProposals.includes(id) ? s.savedProposals.filter((p) => p !== id) : [...s.savedProposals, id] })),
    toggleInterest: (i: string) =>
      update((s) => ({ ...s, interests: s.interests.includes(i) ? s.interests.filter((x) => x !== i) : [...s.interests, i] })),
    setPref: (k: keyof NotificationPrefs, v: boolean) => update((s) => ({ ...s, prefs: { ...s.prefs, [k]: v } })),
    reset: () => commit(initialState()),
  };
}

type DemoCtx = ReturnType<typeof useDemoValue>;
const Ctx = createContext<DemoCtx | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const value = useDemoValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemo must be used inside DemoProvider");
  return v;
}
