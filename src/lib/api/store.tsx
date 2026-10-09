import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { initialsOf, useAuth } from "@/lib/auth";
import { loadAppData, type AppData } from "@/lib/api/fetch";
import { todayIso } from "@/lib/format";
import {
  announcementInput, eventInput, firstIssue, messageInput, societyEditInput, supportRequestInput,
  type AnnouncementInput, type EventAvailability, type EventInput, type NotificationPrefs, type Outcome, type SupportRequestInput,
} from "@/lib/validation";
import type { CallRecap, Event, MembershipStatus, SupportRequest, SupportRequestStatus, User } from "@/lib/types";

/**
 * The app's data layer. Reads come from the database through one TanStack Query
 * (refreshed every 15s and on focus until realtime lands in Phase 5); every write is a
 * database function or an RLS-checked insert, so the browser is never trusted.
 */
const EMPTY: AppData = {
  societies: [], societyUuid: {}, slugOf: {}, committeeIds: {}, events: [], registrations: [], memberships: {}, announcements: [],
  channels: [], messages: [], resources: [], notifications: [], prefs: { announcements: true, events: true, discussions: false, email: false },
  allInterests: [], requests: [], resolvedRequests: [], supportRequests: [], proposals: [], savedProposals: [], rooms: [], recaps: [], recommendations: [],
};

const fail = (error: string): Outcome => ({ ok: false, error });
const errText = (e: unknown) => {
  const m = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong. Try again.";
  return m.replace(/^.*?ERROR:\s*/, "");
};

function useDataValue() {
  const auth = useAuth();
  const qc = useQueryClient();
  const uidAuth = auth.session?.user.id;
  const committeeUuids = auth.access.committee.map((c) => c.society_id);
  const key = ["app-data", uidAuth, committeeUuids.join(",")];
  const q = useQuery({
    queryKey: key,
    queryFn: () => loadAppData(uidAuth!, committeeUuids),
    enabled: !!uidAuth,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const data = q.data ?? EMPTY;
  const loaded = !!q.data || !!q.error;

  const committeeSlugs = auth.access.committee.map((c) => c.slug);
  const name = auth.profile?.display_name || auth.email.split("@")[0] || "You";
  const user: User = {
    id: uidAuth ?? "signed-out", name, initials: initialsOf(name), course: auth.profile?.course ?? "", year: auth.profile?.year ?? "",
    interests: auth.interests, role: committeeSlugs.length ? "committee" : "student", committeeSocietyIds: committeeSlugs,
  };

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["app-data"] }), [qc]);

  /** Runs a database call, maps errors to readable text and refreshes the data. */
  const act = async (fn: () => PromiseLike<{ data?: unknown; error: { message: string } | null }>): Promise<Outcome> => {
    try {
      const { data: out, error } = await fn();
      if (error) return fail(errText(error));
      await refresh();
      return typeof out === "string" ? { ok: true, id: out } : { ok: true };
    } catch (e) {
      return fail(errText(e));
    }
  };
  const sid = (slug: string) => data.societyUuid[slug];

  const getSociety = useCallback((id: string) => data.societies.find((s) => s.id === id), [data.societies]);
  const getEvent = useCallback((id: string) => data.events.find((e) => e.id === id), [data.events]);
  const canManage = (slug: string) => committeeSlugs.includes(slug);
  const membership = (slug: string): MembershipStatus => (canManage(slug) ? "member" : data.memberships[slug] ?? "none");
  const isRegistered = (id: string) => data.registrations.includes(id);
  const eventAvailability = (e: Event): EventAvailability => {
    if (e.date < todayIso()) return "past";
    if (isRegistered(e.id)) return "registered";
    if (e.capacity !== undefined && e.attendees >= e.capacity) return "full";
    return "open";
  };

  const rooms = data.rooms.filter((r) => r.kind === "room");
  const meetings = data.rooms.filter((r) => r.kind === "meeting");

  const notifications = data.notifications;
  const joinedSocieties = data.societies.filter((s) => membership(s.id) === "member");

  return {
    loaded,
    error: q.error ? errText(q.error) : null,
    user,
    role: user.role,
    isAdmin: auth.access.is_admin,
    committeeSeats: auth.access.committee,
    societies: data.societies,
    recommendations: data.recommendations,
    societyUuid: data.societyUuid,
    events: data.events,
    announcements: data.announcements,
    channels: data.channels,
    messages: data.messages,
    resources: data.resources,
    allInterests: data.allInterests,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    requests: data.requests,
    resolvedRequests: data.resolvedRequests,
    registrations: data.registrations,
    proposals: data.proposals,
    savedProposals: data.savedProposals,
    prefs: data.prefs,
    interests: auth.interests,
    joinedSocieties,
    getSociety,
    getEvent,
    membership,
    canManage,
    isRegistered,
    attendeeCount: (e: Event) => data.events.find((x) => x.id === e.id)?.attendees ?? e.attendees,
    eventAvailability,

    joinSociety: (slug: string) => act(() => supabase.rpc("join_society", { _society_id: sid(slug)! })),
    cancelRequest: (slug: string) => act(() => supabase.rpc("cancel_membership_request", { _society_id: sid(slug)! })),
    leaveSociety: (slug: string) => act(() => supabase.rpc("leave_society", { _society_id: sid(slug)! })),
    resolveRequest: (membershipId: string, decision: "approve" | "decline") =>
      act(() => supabase.rpc("decide_membership", { _membership_id: membershipId, _decision: decision })),
    registerForEvent: (id: string) => act(() => supabase.rpc("register_for_event", { _event_id: id })),
    cancelRegistration: (id: string) => act(() => supabase.rpc("cancel_registration", { _event_id: id })),

    postAnnouncement: async (slug: string, input: AnnouncementInput) => {
      const p = announcementInput.safeParse(input);
      if (!p.success) return fail(firstIssue(p.error));
      return act(() => supabase.from("announcements").insert({ society_id: sid(slug)!, author_id: user.id, ...p.data }));
    },
    createEvent: async (slug: string, input: EventInput) => {
      const p = eventInput(todayIso()).safeParse(input);
      if (!p.success) return fail(firstIssue(p.error));
      const e = p.data;
      return act(() => supabase.rpc("create_event", {
        _society_id: sid(slug)!, _title: e.title, _description: e.description, _date: e.date, _start: e.start,
        _end: e.end ?? (null as unknown as string), _venue: e.venue, _category: e.category, _capacity: e.capacity ?? (null as unknown as number),
      }));
    },
    editSociety: async (slug: string, patch: { tagline: string; description: string; meets: string }) => {
      const p = societyEditInput.safeParse(patch);
      if (!p.success) return fail(firstIssue(p.error));
      return act(() => supabase.from("societies").update(p.data).eq("id", sid(slug)!));
    },
    postMessage: async (channelId: string, body: string) => {
      const p = messageInput.safeParse(body);
      if (!p.success) return fail(firstIssue(p.error));
      return act(() => supabase.from("messages").insert({ channel_id: channelId, author_id: user.id, body: p.data }));
    },

    supportRequests: data.supportRequests,
    getSupportRequest: (id: string) => data.supportRequests.find((r) => r.id === id),
    canManageRequest: (r: Pick<SupportRequest, "societyId">) => canManage(r.societyId),
    canViewRequest: (r: SupportRequest) => r.submittedBy === user.id || canManage(r.societyId),
    submitSupportRequest: async (input: SupportRequestInput) => {
      const p = supportRequestInput.safeParse(input);
      if (!p.success) return fail(firstIssue(p.error));
      return act(() => supabase.rpc("submit_support_request", {
        _society_id: sid(p.data.societyId)!, _title: p.data.title, _description: p.data.description, _category: p.data.category, _priority: p.data.priority,
      }));
    },
    assignSupportRequest: (id: string, assigneeName: string | undefined) => {
      const r = data.supportRequests.find((x) => x.id === id);
      const uidA = assigneeName && r ? data.committeeIds[r.societyId]?.[assigneeName] : undefined;
      if (assigneeName && !uidA) return Promise.resolve(fail("Pick someone on this society's committee."));
      return act(() => supabase.rpc("assign_support_request", { _id: id, _assignee: uidA ?? (null as unknown as string) }));
    },
    setSupportRequestStatus: (id: string, to: SupportRequestStatus, resolution?: string) =>
      act(() => supabase.rpc("set_support_request_status", { _id: id, _to: to, _resolution: resolution ?? "" })),
    commentOnSupportRequest: (id: string, text: string) => act(() => supabase.rpc("comment_on_support_request", { _id: id, _text: text })),

    markRead: (id: string) => act(() => supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id)),
    markAllRead: () => act(() => supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null)),
    toggleProposal: (id: string) =>
      act(() => data.savedProposals.includes(id)
        ? supabase.from("saved_proposals").delete().eq("user_id", user.id).eq("proposal_id", id)
        : supabase.from("saved_proposals").insert({ user_id: user.id, proposal_id: id })),
    toggleInterest: async (i: string) => {
      if (!uidAuth) return;
      const { data: row } = await supabase.from("interests").select("id").eq("name", i).maybeSingle();
      if (!row) return;
      if (auth.interests.includes(i)) await supabase.from("profile_interests").delete().eq("profile_id", uidAuth).eq("interest_id", row.id);
      else await supabase.from("profile_interests").insert({ profile_id: uidAuth, interest_id: row.id });
      await auth.refresh();
    },
    setPref: (k: keyof NotificationPrefs, v: boolean) => act(() => supabase.from("notification_prefs").update({ [k]: v } as Partial<NotificationPrefs>).eq("user_id", user.id)),

    // ---- Calls ----
    rooms,
    meetings,
    recaps: data.recaps,
    refresh,
    getRoom: (id: string) => data.rooms.find((r) => r.id === id),
    canShareRecap: (r: CallRecap) => canManage(r.societyId) || data.rooms.find((x) => x.id === r.roomId)?.hostId === user.id,
    scheduleMeeting: (m: { societyId: string; name: string; description: string; date: string; start: string }) =>
      act(() => supabase.rpc("schedule_meeting", { _society_id: sid(m.societyId)!, _name: m.name, _description: m.description, _date: m.date, _start: m.start })),
    shareRecap: (id: string) => act(() => supabase.rpc("share_recap", { _recap_id: id })),
  };
}

type DataCtx = ReturnType<typeof useDataValue>;
const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const value = useDataValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData must be used inside DataProvider");
  return v;
}
