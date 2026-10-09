/**
 * Demo-mode business rules: membership lifecycle, request review, event registration,
 * committee permissions, input validation and notification preferences.
 *
 * Every function is pure (state in, new state or an error out) so the rules are unit-tested
 * and the backend phase can port them to server/database checks unchanged.
 *
 * IMPORTANT: in demo mode anyone can switch demo accounts, so these checks keep the demo
 * consistent — they are NOT a security boundary. Real enforcement needs a trusted backend.
 */
import { z } from "zod";
import type {
  Announcement,
  CallRecap,
  CallRoom,
  DiscussionChannel,
  DiscussionMessage,
  Event,
  MembershipRequest,
  MembershipStatus,
  Notification,
  ResolvedRequest,
  Role,
  Society,
  User,
} from "@/lib/types";

export interface NotificationPrefs {
  announcements: boolean;
  events: boolean;
  discussions: boolean;
  email: boolean;
}

/** Persisted demo state. Per-user maps are keyed by demo user id. */
export interface DemoState {
  role: Role;
  memberships: Record<string, Record<string, MembershipStatus>>;
  registrations: Record<string, string[]>;
  /** Fictional people approved from the committee inbox, by society id. */
  approvedMembers: Record<string, string[]>;
  announcements: Announcement[];
  messages: DiscussionMessage[];
  notifications: Record<string, Notification[]>;
  requests: MembershipRequest[];
  resolvedRequests: ResolvedRequest[];
  createdEvents: Event[];
  societyEdits: Record<string, Partial<Society>>;
  savedProposals: string[];
  interests: string[];
  prefs: NotificationPrefs;
  meetings: CallRoom[];
  recaps: CallRecap[];
}

export interface DemoContext {
  today: string; // YYYY-MM-DD
  now: string; // ISO datetime
  newId: (prefix: string) => string;
  users: User[];
  societies: Society[];
  baseEvents: Event[];
  channels: DiscussionChannel[];
  /** Seed state, used to derive member and attendee counts from the seeded figures. */
  baseline: Pick<DemoState, "memberships" | "registrations">;
}

export type Outcome = { ok: true; state: DemoState; id?: string } | { ok: false; error: string };

const fail = (error: string): Outcome => ({ ok: false, error });

// ---------- Queries ----------

export const membershipOf = (s: DemoState, userId: string, societyId: string): MembershipStatus =>
  s.memberships[userId]?.[societyId] ?? "none";

export const isRegisteredFor = (s: DemoState, userId: string, eventId: string) =>
  (s.registrations[userId] ?? []).includes(eventId);

export const canManageSociety = (actor: User, societyId: string) =>
  actor.role === "committee" && actor.committeeSocietyId === societyId;

export const allEvents = (s: DemoState, ctx: DemoContext) => [
  ...ctx.baseEvents,
  ...s.createdEvents,
];

const delta = (now: boolean, before: boolean) => (now ? 1 : 0) - (before ? 1 : 0);

/** Seeded attendee figure, adjusted by every demo user's registration changes. */
export function attendeeCount(s: DemoState, event: Event, ctx: DemoContext) {
  return ctx.users.reduce(
    (n, u) =>
      n +
      delta(
        isRegisteredFor(s, u.id, event.id),
        (ctx.baseline.registrations[u.id] ?? []).includes(event.id),
      ),
    event.attendees,
  );
}

/** Seeded member figure, adjusted by demo users joining/leaving and approved requests. */
export function memberCount(s: DemoState, society: Society, ctx: DemoContext) {
  const approved = s.approvedMembers[society.id]?.length ?? 0;
  return ctx.users.reduce(
    (n, u) =>
      n +
      delta(
        membershipOf(s, u.id, society.id) === "member",
        ctx.baseline.memberships[u.id]?.[society.id] === "member",
      ),
    society.memberCount + approved,
  );
}

export type EventAvailability = "open" | "registered" | "full" | "past";

export function eventAvailability(
  s: DemoState,
  userId: string,
  event: Event,
  ctx: DemoContext,
): EventAvailability {
  if (event.date < ctx.today) return "past";
  if (isRegisteredFor(s, userId, event.id)) return "registered";
  if (event.capacity !== undefined && attendeeCount(s, event, ctx) >= event.capacity) return "full";
  return "open";
}

// ---------- Validation ----------

export const eventCategories = [
  "Workshop",
  "Social",
  "Talk",
  "Outdoors",
  "Performance",
  "Volunteering",
] as const;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid time.");

export const announcementInput = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Add a title of at least 3 characters.")
    .max(100, "Keep the title under 100 characters."),
  body: z
    .string()
    .trim()
    .min(10, "Add a message of at least 10 characters.")
    .max(1000, "Keep the message under 1,000 characters."),
  pinned: z.boolean(),
});
export type AnnouncementInput = z.infer<typeof announcementInput>;

export const messageInput = z
  .string()
  .trim()
  .min(1, "Write a message first.")
  .max(1000, "Messages can be up to 1,000 characters.");

export const societyEditInput = z.object({
  tagline: z.string().trim().min(3, "Add a tagline.").max(80),
  description: z.string().trim().min(10, "Add a description of at least 10 characters.").max(800),
  meets: z.string().trim().min(2, "Say when and where you meet.").max(80),
});

export const eventInput = (today: string) =>
  z
    .object({
      title: z
        .string()
        .trim()
        .min(3, "Add a title of at least 3 characters.")
        .max(100, "Keep the title under 100 characters."),
      description: z.string().trim().max(1000, "Keep the description under 1,000 characters."),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")
        .refine((d) => d >= today, "Pick today or a later date."),
      start: hhmm,
      end: hhmm.optional(),
      venue: z.string().trim().min(2, "Add a venue.").max(120),
      category: z.enum(eventCategories),
      capacity: z
        .number({ invalid_type_error: "Capacity must be a number." })
        .int("Capacity must be a whole number.")
        .min(1, "Capacity must be at least 1.")
        .max(5000, "Capacity can be at most 5,000.")
        .optional(),
    })
    .refine((e) => e.end === undefined || e.end > e.start, {
      message: "End time must be after the start time.",
      path: ["end"],
    });
export type EventInput = z.infer<ReturnType<typeof eventInput>>;

const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form and try again.";

// ---------- Notifications ----------

export type NotificationKind = "announcements" | "events" | "discussions" | "membership";

/**
 * Adds an in-app notification unless the recipient turned that kind off (membership updates are
 * always delivered) or an identical unread notification already exists (avoids repeat noise).
 */
export function notify(
  s: DemoState,
  userId: string,
  kind: NotificationKind,
  n: Pick<Notification, "title" | "body" | "link">,
  ctx: DemoContext,
): DemoState {
  if (kind !== "membership" && !s.prefs[kind]) return s;
  const list = s.notifications[userId] ?? [];
  const key = JSON.stringify([n.title, n.body, n.link ?? null]);
  if (list.some((x) => !x.read && JSON.stringify([x.title, x.body, x.link ?? null]) === key))
    return s;
  const item: Notification = { id: ctx.newId("n"), createdAt: ctx.now, read: false, ...n };
  return { ...s, notifications: { ...s.notifications, [userId]: [item, ...list] } };
}

const societyLink = (societyId: string) => ({
  to: "/societies/$societyId",
  params: { societyId },
});
const eventLink = (eventId: string) => ({ to: "/events/$eventId", params: { eventId } });

const setMembership = (
  s: DemoState,
  userId: string,
  societyId: string,
  status: MembershipStatus,
): DemoState => {
  const mine = { ...s.memberships[userId] };
  if (status === "none") delete mine[societyId];
  else mine[societyId] = status;
  return { ...s, memberships: { ...s.memberships, [userId]: mine } };
};

const findSociety = (ctx: DemoContext, id: string) => ctx.societies.find((x) => x.id === id);

// ---------- Membership lifecycle ----------

export function joinSociety(
  s: DemoState,
  actor: User,
  societyId: string,
  ctx: DemoContext,
): Outcome {
  const soc = findSociety(ctx, societyId);
  if (!soc) return fail("That society doesn't exist.");
  const status = membershipOf(s, actor.id, societyId);
  if (status === "member") return fail(`You're already a member of ${soc.shortName}.`);
  if (status === "pending")
    return fail(`Your request to join ${soc.shortName} is already pending.`);

  if (!soc.requiresApproval) {
    const next = setMembership(s, actor.id, societyId, "member");
    return {
      ok: true,
      state: notify(
        next,
        actor.id,
        "membership",
        {
          title: `Welcome to ${soc.shortName}`,
          body: "You can now see announcements and join discussions.",
          link: societyLink(societyId),
        },
        ctx,
      ),
    };
  }

  const request: MembershipRequest = {
    id: ctx.newId("req"),
    societyId,
    userId: actor.id,
    name: actor.name,
    course: actor.course,
    message: "",
    requestedAt: ctx.now,
  };
  const next = setMembership(
    {
      ...s,
      requests: [
        request,
        ...s.requests.filter((r) => !(r.userId === actor.id && r.societyId === societyId)),
      ],
    },
    actor.id,
    societyId,
    "pending",
  );
  return {
    ok: true,
    id: request.id,
    state: notify(
      next,
      actor.id,
      "membership",
      {
        title: `Request sent to ${soc.shortName}`,
        body: "The committee will review your request.",
        link: societyLink(societyId),
      },
      ctx,
    ),
  };
}

export function cancelRequest(
  s: DemoState,
  actor: User,
  societyId: string,
  ctx: DemoContext,
): Outcome {
  const soc = findSociety(ctx, societyId);
  if (!soc) return fail("That society doesn't exist.");
  if (membershipOf(s, actor.id, societyId) !== "pending")
    return fail(`You don't have a pending request for ${soc.shortName}.`);
  const next = {
    ...s,
    requests: s.requests.filter((r) => !(r.userId === actor.id && r.societyId === societyId)),
  };
  return { ok: true, state: setMembership(next, actor.id, societyId, "none") };
}

export function leaveSociety(
  s: DemoState,
  actor: User,
  societyId: string,
  ctx: DemoContext,
): Outcome {
  const soc = findSociety(ctx, societyId);
  if (!soc) return fail("That society doesn't exist.");
  if (membershipOf(s, actor.id, societyId) !== "member")
    return fail(`You're not a member of ${soc.shortName}.`);
  if (canManageSociety(actor, societyId))
    return fail(`You're on the ${soc.shortName} committee, so you can't leave it here.`);
  return { ok: true, state: setMembership(s, actor.id, societyId, "none") };
}

export function resolveRequest(
  s: DemoState,
  actor: User,
  requestId: string,
  decision: "approve" | "decline",
  ctx: DemoContext,
): Outcome {
  const req = s.requests.find((r) => r.id === requestId);
  if (!req) return fail("This request has already been handled.");
  const soc = findSociety(ctx, req.societyId);
  if (!soc) return fail("That society doesn't exist.");
  if (!canManageSociety(actor, req.societyId))
    return fail(`Only the ${soc.shortName} committee can review this request.`);

  const resolved: ResolvedRequest = {
    ...req,
    outcome: decision === "approve" ? "approved" : "declined",
    resolvedAt: ctx.now,
    resolvedBy: actor.name,
  };
  let next: DemoState = {
    ...s,
    requests: s.requests.filter((r) => r.id !== requestId),
    resolvedRequests: [resolved, ...s.resolvedRequests],
  };

  if (decision === "approve") {
    if (req.userId) {
      next = setMembership(next, req.userId, req.societyId, "member");
      next = notify(
        next,
        req.userId,
        "membership",
        {
          title: `You're in! ${soc.shortName} approved your request`,
          body: "You can now see announcements and join discussions.",
          link: societyLink(req.societyId),
        },
        ctx,
      );
    } else {
      const names = next.approvedMembers[req.societyId] ?? [];
      if (!names.includes(req.name))
        next = {
          ...next,
          approvedMembers: { ...next.approvedMembers, [req.societyId]: [...names, req.name] },
        };
    }
  } else if (req.userId) {
    next = setMembership(next, req.userId, req.societyId, "none");
    next = notify(
      next,
      req.userId,
      "membership",
      {
        title: `${soc.shortName} didn't approve your request`,
        body: "You can contact the committee or request again later.",
        link: societyLink(req.societyId),
      },
      ctx,
    );
  }
  return { ok: true, state: next };
}

// ---------- Events ----------

export function registerForEvent(
  s: DemoState,
  actor: User,
  eventId: string,
  ctx: DemoContext,
): Outcome {
  const ev = allEvents(s, ctx).find((e) => e.id === eventId);
  if (!ev) return fail("That event doesn't exist.");
  const availability = eventAvailability(s, actor.id, ev, ctx);
  if (availability === "past") return fail("This event has already taken place.");
  if (availability === "registered") return fail("You're already registered for this event.");
  if (availability === "full") return fail("This event is full.");
  const next = {
    ...s,
    registrations: {
      ...s.registrations,
      [actor.id]: [...(s.registrations[actor.id] ?? []), eventId],
    },
  };
  return {
    ok: true,
    state: notify(
      next,
      actor.id,
      "events",
      { title: "You're registered", body: ev.title, link: eventLink(eventId) },
      ctx,
    ),
  };
}

export function cancelRegistration(
  s: DemoState,
  actor: User,
  eventId: string,
  ctx: DemoContext,
): Outcome {
  const ev = allEvents(s, ctx).find((e) => e.id === eventId);
  if (!ev) return fail("That event doesn't exist.");
  if (!isRegisteredFor(s, actor.id, eventId)) return fail("You're not registered for this event.");
  if (ev.date < ctx.today) return fail("This event has already taken place.");
  return {
    ok: true,
    state: {
      ...s,
      registrations: {
        ...s.registrations,
        [actor.id]: (s.registrations[actor.id] ?? []).filter((id) => id !== eventId),
      },
    },
  };
}

// ---------- Committee actions ----------

const membersOf = (s: DemoState, ctx: DemoContext, societyId: string, except: string) =>
  ctx.users.filter((u) => u.id !== except && membershipOf(s, u.id, societyId) === "member");

export function postAnnouncement(
  s: DemoState,
  actor: User,
  societyId: string,
  input: AnnouncementInput,
  ctx: DemoContext,
): Outcome {
  const soc = findSociety(ctx, societyId);
  if (!soc) return fail("That society doesn't exist.");
  if (!canManageSociety(actor, societyId))
    return fail(`Only the ${soc.shortName} committee can post announcements.`);
  const parsed = announcementInput.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const a: Announcement = {
    id: ctx.newId("a"),
    societyId,
    author: actor.name,
    createdAt: ctx.now,
    ...parsed.data,
  };
  let next: DemoState = { ...s, announcements: [a, ...s.announcements] };
  for (const u of membersOf(next, ctx, societyId, actor.id))
    next = notify(
      next,
      u.id,
      "announcements",
      {
        title: `New announcement in ${soc.shortName}`,
        body: a.title,
        link: societyLink(societyId),
      },
      ctx,
    );
  return { ok: true, id: a.id, state: next };
}

export function createEvent(
  s: DemoState,
  actor: User,
  societyId: string,
  input: EventInput,
  ctx: DemoContext,
): Outcome {
  const soc = findSociety(ctx, societyId);
  if (!soc) return fail("That society doesn't exist.");
  if (!canManageSociety(actor, societyId))
    return fail(`Only the ${soc.shortName} committee can create events.`);
  const parsed = eventInput(ctx.today).safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;
  const ev: Event = {
    id: ctx.newId("e"),
    societyId,
    title: d.title,
    description: d.description || "Details coming soon.",
    date: d.date,
    start: d.start,
    end: d.end,
    venue: d.venue,
    category: d.category,
    capacity: d.capacity,
    attendees: 0,
    tags: soc.tags,
  };
  let next: DemoState = { ...s, createdEvents: [...s.createdEvents, ev] };
  for (const u of membersOf(next, ctx, societyId, actor.id))
    next = notify(
      next,
      u.id,
      "events",
      { title: `New event from ${soc.shortName}`, body: ev.title, link: eventLink(ev.id) },
      ctx,
    );
  return { ok: true, id: ev.id, state: next };
}

export function editSociety(
  s: DemoState,
  actor: User,
  societyId: string,
  patch: z.infer<typeof societyEditInput>,
  ctx: DemoContext,
): Outcome {
  const soc = findSociety(ctx, societyId);
  if (!soc) return fail("That society doesn't exist.");
  if (!canManageSociety(actor, societyId))
    return fail(`Only the ${soc.shortName} committee can edit this profile.`);
  const parsed = societyEditInput.safeParse(patch);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  return {
    ok: true,
    state: {
      ...s,
      societyEdits: {
        ...s.societyEdits,
        [societyId]: { ...s.societyEdits[societyId], ...parsed.data },
      },
    },
  };
}

// ---------- Discussions ----------

export function postMessage(
  s: DemoState,
  actor: User,
  channelId: string,
  body: string,
  ctx: DemoContext,
): Outcome {
  const channel = ctx.channels.find((c) => c.id === channelId);
  if (!channel) return fail("That channel doesn't exist.");
  if (membershipOf(s, actor.id, channel.societyId) !== "member")
    return fail("Only members can post in this channel.");
  const parsed = messageInput.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const m: DiscussionMessage = {
    id: ctx.newId("m"),
    channelId,
    author: actor.name,
    body: parsed.data,
    createdAt: ctx.now,
  };
  return { ok: true, id: m.id, state: { ...s, messages: [...s.messages, m] } };
}
