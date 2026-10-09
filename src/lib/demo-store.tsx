import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
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
import type {
  Announcement,
  DiscussionMessage,
  Event,
  MembershipRequest,
  MembershipStatus,
  Notification,
  Role,
  Society,
} from "@/lib/types";
import { demoNowIso } from "@/lib/format";
import { callRooms, initialMeetings, initialRecaps } from "@/data/calls";
import type { CallRecap, CallRoom } from "@/lib/types";

/**
 * Central demo state. This is the single seam the backend phase replaces:
 * swap these actions for API calls and keep the hook surface the same.
 */
interface DemoState {
  role: Role;
  memberships: Record<string, MembershipStatus>;
  registrations: string[];
  announcements: Announcement[];
  messages: DiscussionMessage[];
  notifications: Notification[];
  requests: MembershipRequest[];
  createdEvents: Event[];
  societyEdits: Record<string, Partial<Society>>;
  savedProposals: string[];
  interests: string[];
  prefs: { announcements: boolean; events: boolean; discussions: boolean; email: boolean };
  meetings: CallRoom[];
  recaps: CallRecap[];
}

const initialState = (): DemoState => ({
  role: "student",
  memberships: { ...initialMemberships },
  registrations: [...initialRegistrations],
  announcements: [...initialAnnouncements],
  messages: [...initialMessages],
  notifications: [...initialNotifications],
  requests: [...initialRequests],
  createdEvents: [],
  societyEdits: {},
  savedProposals: [],
  interests: [...demoUsers.student.interests],
  prefs: { announcements: true, events: true, discussions: false, email: true },
  meetings: [...initialMeetings],
  recaps: [...initialRecaps],
});

const KEY = "socconnect-demo-v1";
let idCounter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

function useDemoValue() {
  const [state, setState] = useState<DemoState>(initialState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initialState(), ...JSON.parse(raw) });
    } catch {
      /* ignore corrupt demo state */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, loaded]);

  const user = state.role === "committee" ? demoUsers.committee : { ...demoUsers.student, interests: state.interests };

  const societies = useMemo(
    () => baseSocieties.map((s) => ({ ...s, ...state.societyEdits[s.id] })),
    [state.societyEdits],
  );
  const events = useMemo(
    () => [...baseEvents, ...state.createdEvents].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)),
    [state.createdEvents],
  );

  const notify = (s: DemoState, title: string, body: string, link?: Notification["link"]): Notification[] => [
    { id: uid("n"), title, body, createdAt: demoNowIso(), read: false, link },
    ...s.notifications,
  ];

  const getSociety = useCallback((id: string) => societies.find((s) => s.id === id), [societies]);
  const getEvent = useCallback((id: string) => events.find((e) => e.id === id), [events]);

  const membership = (id: string): MembershipStatus => state.memberships[id] ?? "none";

  const joinSociety = (id: string) =>
    setState((s) => {
      const soc = baseSocieties.find((x) => x.id === id);
      const status: MembershipStatus = soc?.requiresApproval ? "pending" : "member";
      return {
        ...s,
        memberships: { ...s.memberships, [id]: status },
        notifications: notify(
          s,
          status === "member" ? `Welcome to ${soc?.shortName}` : `Request sent to ${soc?.shortName}`,
          status === "member" ? "You can now see announcements and join discussions." : "The committee will review your request.",
          { to: "/societies/$societyId", params: { societyId: id } },
        ),
      };
    });

  const leaveSociety = (id: string) =>
    setState((s) => {
      const m = { ...s.memberships };
      delete m[id];
      return { ...s, memberships: m };
    });

  const attendeeDelta = (id: string) => (state.registrations.includes(id) && !initialRegistrations.includes(id) ? 1 : 0) - (!state.registrations.includes(id) && initialRegistrations.includes(id) ? 1 : 0);

  const toggleRegistration = (id: string) =>
    setState((s) => {
      const on = s.registrations.includes(id);
      const ev = events.find((e) => e.id === id);
      return {
        ...s,
        registrations: on ? s.registrations.filter((r) => r !== id) : [...s.registrations, id],
        notifications: on ? s.notifications : notify(s, "You're registered", ev?.title ?? "Event", { to: "/events/$eventId", params: { eventId: id } }),
      };
    });

  const postAnnouncement = (a: Omit<Announcement, "id" | "createdAt">) =>
    setState((s) => ({
      ...s,
      announcements: [{ ...a, id: uid("a"), createdAt: demoNowIso() }, ...s.announcements],
      notifications: notify(s, `New announcement in ${baseSocieties.find((x) => x.id === a.societyId)?.shortName}`, a.title, {
        to: "/societies/$societyId",
        params: { societyId: a.societyId },
      }),
    }));

  const createEvent = (e: Omit<Event, "id" | "attendees">) => {
    const id = uid("e");
    setState((s) => ({ ...s, createdEvents: [...s.createdEvents, { ...e, id, attendees: 0 }] }));
    return id;
  };

  const postMessage = (channelId: string, body: string) =>
    setState((s) => ({ ...s, messages: [...s.messages, { id: uid("m"), channelId, body, author: user.name, createdAt: demoNowIso() }] }));

  const resolveRequest = (id: string, approve: boolean) =>
    setState((s) => ({ ...s, requests: s.requests.filter((r) => r.id !== id) }));

  const editSociety = (id: string, patch: Partial<Society>) =>
    setState((s) => ({ ...s, societyEdits: { ...s.societyEdits, [id]: { ...s.societyEdits[id], ...patch } } }));

  const getRoom = (id: string) => callRooms.find((r) => r.id === id) ?? state.meetings.find((m) => m.id === id);

  const scheduleMeeting = (m: Omit<CallRoom, "id" | "kind">) => {
    const id = uid("mt");
    setState((s) => ({
      ...s,
      meetings: [...s.meetings, { ...m, id, kind: "meeting" }],
      notifications: notify(s, `Call scheduled: ${m.name}`, `${baseSocieties.find((x) => x.id === m.societyId)?.shortName} · ${m.date} at ${m.start}`, { to: "/call/$roomId", params: { roomId: id } }),
    }));
    return id;
  };

  const saveRecap = (r: Omit<CallRecap, "id" | "qa" | "shared">) => {
    const id = uid("rc");
    setState((s) => ({ ...s, recaps: [{ ...r, id, qa: [], shared: false }, ...s.recaps] }));
    return id;
  };

  const updateRecapQa = (id: string, qa: CallRecap["qa"]) =>
    setState((s) => ({ ...s, recaps: s.recaps.map((r) => (r.id === id ? { ...r, qa } : r)) }));

  const shareRecap = (id: string) =>
    setState((s) => {
      const r = s.recaps.find((x) => x.id === id);
      if (!r) return s;
      const soc = baseSocieties.find((x) => x.id === r.societyId);
      const body = `📋 Call recap — ${r.title}\n${r.summary.overview}${r.summary.actionItems.length ? `\nAction items: ${r.summary.actionItems.map((a) => `${a.owner}: ${a.task}`).join("; ")}` : ""}`;
      return {
        ...s,
        recaps: s.recaps.map((x) => (x.id === id ? { ...x, shared: true } : x)),
        messages: [...s.messages, { id: uid("m"), channelId: `${r.societyId}-general`, author: user.name, body, createdAt: demoNowIso() }],
        notifications: notify(s, `Call recap shared in ${soc?.shortName}`, r.title, { to: "/recaps/$recapId", params: { recapId: id } }),
      };
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
    notifications: state.notifications,
    unreadCount: state.notifications.filter((n) => !n.read).length,
    requests: state.requests,
    registrations: state.registrations,
    savedProposals: state.savedProposals,
    prefs: state.prefs,
    interests: state.interests,
    getSociety,
    getEvent,
    membership,
    attendeeCount: (e: Event) => e.attendees + attendeeDelta(e.id),
    isRegistered: (id: string) => state.registrations.includes(id),
    joinedSocieties: societies.filter((s) => state.memberships[s.id] === "member"),
    setRole: (role: Role) => setState((s) => ({ ...s, role })),
    joinSociety,
    leaveSociety,
    toggleRegistration,
    postAnnouncement,
    createEvent,
    postMessage,
    resolveRequest,
    editSociety,
    markRead: (id: string) => setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
    markAllRead: () => setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    toggleProposal: (id: string) =>
      setState((s) => ({ ...s, savedProposals: s.savedProposals.includes(id) ? s.savedProposals.filter((p) => p !== id) : [...s.savedProposals, id] })),
    toggleInterest: (i: string) =>
      setState((s) => ({ ...s, interests: s.interests.includes(i) ? s.interests.filter((x) => x !== i) : [...s.interests, i] })),
    setPref: (k: keyof DemoState["prefs"], v: boolean) => setState((s) => ({ ...s, prefs: { ...s.prefs, [k]: v } })),
    reset: () => setState(initialState()),
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
