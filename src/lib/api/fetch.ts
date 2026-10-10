import { supabase } from "@/integrations/supabase/client";
import type {
  CallRecap, CallRoom, CallSummary, TranscriptLine,
  Announcement, CollaborationProposal, DiscussionChannel, DiscussionMessage, Event, MembershipRequest,
  Notification, ResolvedRequest, Resource, Society, SocietyAccent, SocietyLink, SupportRequest,
} from "@/lib/types";
import type { NotificationPrefs } from "@/lib/validation";
import { toDublin } from "@/lib/format";

/** Everything the signed-in user can see, already mapped to the UI types in src/lib/types.ts. */
export type AppData = {
  societies: Society[];
  /** slug → uuid and back; the UI addresses societies by slug. */
  societyUuid: Record<string, string>;
  slugOf: Record<string, string>;
  committeeIds: Record<string, Record<string, string>>; // slug → name → user id
  events: Event[];
  registrations: string[];
  memberships: Record<string, "member" | "pending">;
  announcements: Announcement[];
  channels: DiscussionChannel[];
  messages: DiscussionMessage[];
  resources: (Resource & { url: string })[];
  notifications: Notification[];
  prefs: NotificationPrefs;
  allInterests: string[];
  requests: MembershipRequest[];
  resolvedRequests: ResolvedRequest[];
  supportRequests: SupportRequest[];
  proposals: CollaborationProposal[];
  savedProposals: string[];
  rooms: CallRoom[];
  recaps: CallRecap[];
  recommendations: { slug: string; score: number; matched_interests: string[] }[];
};

const must = <T,>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return (r.data ?? []) as T;
};

export async function loadAppData(uid: string, committeeSocietyIds: string[]): Promise<AppData> {
  const [soc, tags, roles, mem, counts, ev, att, regs, ann, ch, msg, res, notes, prefs, ints, sr, act, props, saved] = await Promise.all([
    supabase.from("societies").select("*").eq("status", "active").order("name"),
    supabase.from("society_tags").select("society_id, interests(name)"),
    supabase.from("society_roles").select("society_id, user_id, position, profiles(display_name)"),
    supabase.from("society_memberships").select("society_id, status").eq("user_id", uid),
    supabase.rpc("society_member_counts"),
    supabase.from("events").select("*").order("starts_at"),
    supabase.rpc("event_attendee_counts"),
    supabase.from("event_registrations").select("event_id").eq("user_id", uid),
    supabase.from("announcements").select("*, profiles(display_name)").order("created_at", { ascending: false }).limit(200),
    supabase.from("channels").select("*"),
    supabase.from("messages").select("*, profiles(display_name)").order("created_at", { ascending: false }).limit(500),
    supabase.from("resources").select("*"),
    supabase.from("notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
    supabase.from("notification_prefs").select("*").eq("user_id", uid).maybeSingle(),
    supabase.from("interests").select("name").order("name"),
    supabase.from("support_requests").select("*, submitter:profiles!support_requests_submitted_by_fkey(display_name), assignee:profiles!support_requests_assigned_to_fkey(display_name)").order("created_at", { ascending: false }),
    supabase.from("support_request_activity").select("*, profiles(display_name)").order("created_at"),
    supabase.from("collaboration_proposals").select("*").order("created_at", { ascending: false }),
    supabase.from("saved_proposals").select("proposal_id").eq("user_id", uid),
  ]);
  const [roomRes, recapRes, recommendationRes] = await Promise.all([
    supabase.from("call_rooms").select("*, profiles!call_rooms_host_id_fkey(display_name)").order("starts_at", { nullsFirst: true }),
    supabase.from("call_recaps").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.rpc("recommend_societies"),
  ]);

  const socRows = must(soc);
  const slugOf: Record<string, string> = {};
  const societyUuid: Record<string, string> = {};
  for (const s of socRows) { slugOf[s.id] = s.slug; societyUuid[s.slug] = s.id; }
  const memberCount = new Map(must(counts).map((c) => [c.society_id, c.members]));
  const tagMap = new Map<string, string[]>();
  for (const t of must(tags) as { society_id: string; interests: { name: string } | null }[])
    if (t.interests) tagMap.set(t.society_id, [...(tagMap.get(t.society_id) ?? []), t.interests.name]);
  const committee = new Map<string, { name: string; position: string; userId: string }[]>();
  const committeeIds: AppData["committeeIds"] = {};
  for (const r of must(roles) as { society_id: string; user_id: string; position: string; profiles: { display_name: string } | null }[]) {
    const name = r.profiles?.display_name || "Committee member";
    committee.set(r.society_id, [...(committee.get(r.society_id) ?? []), { name, position: r.position, userId: r.user_id }]);
    const slug = slugOf[r.society_id];
    if (slug) (committeeIds[slug] ??= {})[name] = r.user_id;
  }

  const societies: Society[] = socRows.map((s) => ({
    id: s.slug, name: s.name, shortName: s.short_name, category: s.category, tagline: s.tagline, description: s.description,
    icon: s.icon, accent: s.accent as SocietyAccent, memberCount: memberCount.get(s.id) ?? 0, tags: tagMap.get(s.id) ?? [],
    committee: committee.get(s.id) ?? [], requiresApproval: s.requires_approval, meets: s.meets,
    // Official TU Dublin fields; `??` keeps this working before the 0006 migration adds the columns.
    campus: s.campus ?? undefined, logoUrl: s.logo_url ?? undefined, bannerUrl: s.banner_url ?? undefined,
    joinUrl: s.join_url ?? undefined, officialUrl: s.official_url ?? undefined, contactEmail: s.contact_email ?? undefined,
    links: Array.isArray(s.links) ? (s.links as unknown as SocietyLink[]) : [],
    extraSections: Array.isArray(s.extra_sections) ? (s.extra_sections as unknown as { title: string; body: string }[]) : [],
  }));

  const attendees = new Map(must(att).map((a) => [a.event_id, a.attendees]));
  const events: Event[] = must(ev).filter((e) => slugOf[e.society_id]).map((e) => {
    const start = toDublin(e.starts_at);
    return {
      id: e.id, title: e.title, description: e.description, societyId: slugOf[e.society_id]!, date: start.date, start: start.time,
      end: e.ends_at ? toDublin(e.ends_at).time : undefined, venue: e.venue, category: e.category, capacity: e.capacity ?? undefined,
      attendees: attendees.get(e.id) ?? 0, tags: e.tags, featured: e.featured,
    };
  });

  const memberships: AppData["memberships"] = {};
  for (const m of must(mem)) if ((m.status === "member" || m.status === "pending") && slugOf[m.society_id]) memberships[slugOf[m.society_id]!] = m.status;

  const name = (p: { display_name: string } | null | undefined) => p?.display_name || "Someone";
  const channelRows = must(ch);
  const channels: DiscussionChannel[] = channelRows.filter((c) => slugOf[c.society_id]).map((c) => ({ id: c.id, societyId: slugOf[c.society_id]!, name: c.name, description: c.description }));

  // Membership requests: only committee members can read other people's rows, via society_members().
  const requests: MembershipRequest[] = [];
  const resolvedRequests: ResolvedRequest[] = [];
  await Promise.all(committeeSocietyIds.map(async (sid) => {
    const rows = must(await supabase.rpc("society_members", { _society_id: sid }));
    const slug = slugOf[sid];
    if (!slug) return;
    for (const r of rows) {
      const base = { id: r.membership_id, societyId: slug, userId: r.user_id, name: r.display_name || "Student", course: r.course, message: r.message, requestedAt: r.requested_at };
      if (r.status === "pending") requests.push(base);
      else if (r.decided_at) resolvedRequests.push({ ...base, outcome: r.status === "member" ? "approved" : "declined", resolvedAt: r.decided_at, resolvedBy: "" });
    }
  }));
  resolvedRequests.sort((a, b) => b.resolvedAt.localeCompare(a.resolvedAt));

  const activity = new Map<string, SupportRequest["activity"]>();
  for (const a of must(act) as { id: string; request_id: string; created_at: string; kind: SupportRequest["activity"][number]["kind"]; text: string; profiles: { display_name: string } | null }[])
    activity.set(a.request_id, [...(activity.get(a.request_id) ?? []), { id: a.id, at: a.created_at, actor: name(a.profiles), kind: a.kind, text: a.text }]);

  type SrRow = { id: string; society_id: string; title: string; description: string; category: string; priority: string; status: string; submitted_by: string; resolution: string | null; created_at: string; updated_at: string; submitter: { display_name: string } | null; assignee: { display_name: string } | null };
  const supportRequests: SupportRequest[] = (must(sr) as unknown as SrRow[]).filter((r) => slugOf[r.society_id]).map((r) => ({
    id: r.id, societyId: slugOf[r.society_id]!, title: r.title, description: r.description,
    category: r.category as SupportRequest["category"], priority: r.priority as SupportRequest["priority"], status: r.status as SupportRequest["status"],
    submittedBy: r.submitted_by, submitterName: name(r.submitter), assignedTo: r.assignee?.display_name ?? undefined,
    resolution: r.resolution ?? undefined, createdAt: r.created_at, updatedAt: r.updated_at, activity: activity.get(r.id) ?? [],
  }));

  const p = prefs.data;
  return {
    societies, societyUuid, slugOf, committeeIds, events, memberships, requests, resolvedRequests, supportRequests, channels,
    recommendations: must(recommendationRes),
    registrations: must(regs).map((r) => r.event_id),
    announcements: (must(ann) as { id: string; society_id: string; title: string; body: string; pinned: boolean; created_at: string; profiles: { display_name: string } | null }[])
      .filter((a) => slugOf[a.society_id])
      .map((a) => ({ id: a.id, societyId: slugOf[a.society_id]!, author: name(a.profiles), title: a.title, body: a.body, createdAt: a.created_at, pinned: a.pinned })),
    messages: (must(msg) as { id: string; channel_id: string; body: string; created_at: string; profiles: { display_name: string } | null }[])
      .map((m) => ({ id: m.id, channelId: m.channel_id, author: name(m.profiles), body: m.body, createdAt: m.created_at })).reverse(),
    resources: must(res).filter((r) => slugOf[r.society_id]).map((r) => ({ id: r.id, societyId: slugOf[r.society_id]!, title: r.title, kind: r.kind as Resource["kind"], description: r.description, url: r.url })),
    notifications: must(notes).map((n) => ({ id: n.id, title: n.title, body: n.body, createdAt: n.created_at, read: !!n.read_at, link: (n.link as Notification["link"]) ?? undefined })),
    prefs: p ? { announcements: p.announcements, events: p.events, discussions: p.discussions, email: p.email } : { announcements: true, events: true, discussions: false, email: false },
    allInterests: must(ints).map((i) => i.name),
    proposals: must(props).filter((x) => slugOf[x.society_a] && slugOf[x.society_b]).map((x) => ({
      id: x.id, societyIds: [slugOf[x.society_a]!, slugOf[x.society_b]!], title: x.title, summary: x.summary, sharedInterests: x.shared_interests,
      rationale: x.rationale, contributions: x.contributions as Record<string, string>, nextSteps: x.next_steps, source: x.source === "ai" ? "ai" : "committee",
    })),
    savedProposals: must(saved).map((s) => s.proposal_id),
    rooms: (must(roomRes) as unknown as { id: string; society_id: string; name: string; kind: "room" | "meeting"; description: string; starts_at: string | null; event_id: string | null; host_id: string | null; profiles: { display_name: string } | null }[])
      .filter((r) => slugOf[r.society_id])
      .map((r) => {
        const t = r.starts_at ? toDublin(r.starts_at) : null;
        return { id: r.id, societyId: slugOf[r.society_id]!, name: r.name, kind: r.kind, description: r.description, date: t?.date, start: t?.time, eventId: r.event_id ?? undefined, host: r.profiles?.display_name ?? undefined, hostId: r.host_id ?? undefined };
      }),
    recaps: must(recapRes).filter((r) => slugOf[r.society_id]).map((r) => ({
      id: r.id, roomId: r.room_id, societyId: slugOf[r.society_id]!, title: r.title, date: r.started_at, durationSec: r.duration_sec,
      participants: r.participants, transcript: (r.transcript ?? []) as unknown as TranscriptLine[], transcriptDeleted: r.transcript === null,
      summary: r.summary as unknown as CallSummary, qa: (r.qa ?? []) as unknown as CallRecap["qa"], shared: r.shared, createdBy: r.created_by ?? undefined,
    })),
  };
}
