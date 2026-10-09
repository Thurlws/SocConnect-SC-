import { describe, expect, it } from "vitest";

import { channels, demoUsers, events, initialRequests, societies } from "@/data/mock";
import * as rules from "@/lib/demo-rules";
import type { DemoContext, DemoState, Outcome } from "@/lib/demo-rules";
import { eventToIcs } from "@/lib/ics";

const alex = demoUsers.student;
const jordan = demoUsers.committee; // CompSoc committee

let n = 0;
const ctx: DemoContext = {
  today: "2026-10-12",
  now: "2026-10-12T12:00:00",
  newId: (p) => `${p}-${n++}`,
  users: [alex, jordan],
  societies,
  baseEvents: events,
  channels,
  baseline: {
    memberships: {
      [alex.id]: { music: "member", photo: "member" },
      [jordan.id]: { compsoc: "member" },
    },
    registrations: { [alex.id]: [], [jordan.id]: [] },
  },
};

const fresh = (): DemoState => ({
  role: "student",
  memberships: {
    [alex.id]: { music: "member", photo: "member" },
    [jordan.id]: { compsoc: "member" },
  },
  registrations: { [alex.id]: [], [jordan.id]: [] },
  approvedMembers: {},
  announcements: [],
  messages: [],
  notifications: { [alex.id]: [], [jordan.id]: [] },
  requests: [...initialRequests],
  resolvedRequests: [],
  createdEvents: [],
  societyEdits: {},
  savedProposals: [],
  interests: [],
  prefs: { announcements: true, events: true, discussions: true, email: false },
  meetings: [],
  recaps: [],
});

const ok = (o: Outcome) => {
  if (!o.ok) throw new Error(`Expected success, got: ${o.error}`);
  return o.state;
};
const err = (o: Outcome) => (o.ok ? "(succeeded)" : o.error);
const compsoc = societies.find((s) => s.id === "compsoc")!;
const gaming = societies.find((s) => s.id === "gaming")!;

describe("membership lifecycle", () => {
  it("joins an open society instantly and rejects a duplicate join", () => {
    const s = ok(rules.joinSociety(fresh(), alex, "gaming", ctx));
    expect(rules.membershipOf(s, alex.id, "gaming")).toBe("member");
    expect(rules.memberCount(s, gaming, ctx)).toBe(gaming.memberCount + 1);
    expect(err(rules.joinSociety(s, alex, "gaming", ctx))).toMatch(/already a member/);
  });

  it("creates one pending request for approval-only societies", () => {
    const s = ok(rules.joinSociety(fresh(), alex, "compsoc", ctx));
    expect(rules.membershipOf(s, alex.id, "compsoc")).toBe("pending");
    expect(s.requests.filter((r) => r.userId === alex.id)).toHaveLength(1);
    expect(err(rules.joinSociety(s, alex, "compsoc", ctx))).toMatch(/already pending/);
  });

  it("cancels a pending request and removes it from the committee inbox", () => {
    const pending = ok(rules.joinSociety(fresh(), alex, "compsoc", ctx));
    const s = ok(rules.cancelRequest(pending, alex, "compsoc", ctx));
    expect(rules.membershipOf(s, alex.id, "compsoc")).toBe("none");
    expect(s.requests.some((r) => r.userId === alex.id)).toBe(false);
    expect(err(rules.cancelRequest(s, alex, "compsoc", ctx))).toMatch(
      /don't have a pending request/,
    );
  });

  it("only lets members leave, and keeps committee members in their own society", () => {
    expect(err(rules.leaveSociety(fresh(), alex, "gaming", ctx))).toMatch(/not a member/);
    expect(
      rules.membershipOf(ok(rules.leaveSociety(fresh(), alex, "music", ctx)), alex.id, "music"),
    ).toBe("none");
    expect(err(rules.leaveSociety(fresh(), jordan, "compsoc", ctx))).toMatch(/committee/);
  });
});

describe("membership request review", () => {
  it("approving a demo user's request makes them a member and notifies them", () => {
    const pending = ok(rules.joinSociety(fresh(), alex, "compsoc", ctx));
    const req = pending.requests.find((r) => r.userId === alex.id)!;
    const s = ok(rules.resolveRequest(pending, jordan, req.id, "approve", ctx));
    expect(rules.membershipOf(s, alex.id, "compsoc")).toBe("member");
    expect(s.requests.find((r) => r.id === req.id)).toBeUndefined();
    expect(s.resolvedRequests[0]).toMatchObject({
      id: req.id,
      outcome: "approved",
      resolvedBy: jordan.name,
    });
    expect(s.notifications[alex.id]?.[0]?.title).toMatch(/approved your request/);
  });

  it("declining does not create a membership", () => {
    const pending = ok(rules.joinSociety(fresh(), alex, "compsoc", ctx));
    const req = pending.requests.find((r) => r.userId === alex.id)!;
    const s = ok(rules.resolveRequest(pending, jordan, req.id, "decline", ctx));
    expect(rules.membershipOf(s, alex.id, "compsoc")).toBe("none");
    expect(s.resolvedRequests[0]?.outcome).toBe("declined");
    expect(rules.memberCount(s, compsoc, ctx)).toBe(compsoc.memberCount);
  });

  it("approve and decline have different effects on seeded requests", () => {
    const approved = ok(rules.resolveRequest(fresh(), jordan, "req1", "approve", ctx));
    const declined = ok(rules.resolveRequest(fresh(), jordan, "req1", "decline", ctx));
    expect(approved.approvedMembers["compsoc"]).toEqual(["Maya Patel"]);
    expect(rules.memberCount(approved, compsoc, ctx)).toBe(compsoc.memberCount + 1);
    expect(declined.approvedMembers["compsoc"]).toBeUndefined();
    expect(rules.memberCount(declined, compsoc, ctx)).toBe(compsoc.memberCount);
  });

  it("rejects reviews by students, other committees, and repeat reviews", () => {
    expect(err(rules.resolveRequest(fresh(), alex, "req1", "approve", ctx))).toMatch(
      /Only the CompSoc committee/,
    );
    const otherCommittee = { ...jordan, committeeSocietyId: "music" };
    expect(err(rules.resolveRequest(fresh(), otherCommittee, "req1", "approve", ctx))).toMatch(
      /Only the CompSoc committee/,
    );
    const once = ok(rules.resolveRequest(fresh(), jordan, "req1", "approve", ctx));
    expect(err(rules.resolveRequest(once, jordan, "req1", "decline", ctx))).toMatch(
      /already been handled/,
    );
  });
});

describe("event registration", () => {
  const hack = events.find((e) => e.id === "e-hack")!; // 62 / 80
  const lan = events.find((e) => e.id === "e-lan")!; // 120 / 120, full

  it("registers once and counts the attendee", () => {
    const s = ok(rules.registerForEvent(fresh(), alex, hack.id, ctx));
    expect(rules.attendeeCount(s, hack, ctx)).toBe(hack.attendees + 1);
    expect(err(rules.registerForEvent(s, alex, hack.id, ctx))).toMatch(/already registered/);
  });

  it("refuses full events instead of over-booking", () => {
    expect(rules.eventAvailability(fresh(), alex.id, lan, ctx)).toBe("full");
    expect(err(rules.registerForEvent(fresh(), alex, lan.id, ctx))).toMatch(/full/);
  });

  it("enforces capacity across demo users", () => {
    const tiny = { ...hack, id: "e-tiny", capacity: 1, attendees: 0 };
    const c = { ...ctx, baseEvents: [...ctx.baseEvents, tiny] };
    const s = ok(rules.registerForEvent(fresh(), alex, "e-tiny", c));
    expect(err(rules.registerForEvent(s, jordan, "e-tiny", c))).toMatch(/full/);
  });

  it("refuses past events and cancelling when not registered", () => {
    const past = { ...hack, id: "e-past", date: "2026-10-01" };
    const c = { ...ctx, baseEvents: [...ctx.baseEvents, past] };
    expect(err(rules.registerForEvent(fresh(), alex, "e-past", c))).toMatch(/already taken place/);
    expect(err(rules.cancelRegistration(fresh(), alex, hack.id, ctx))).toMatch(/not registered/);
  });

  it("cancelling frees the spot", () => {
    const s = ok(
      rules.cancelRegistration(
        ok(rules.registerForEvent(fresh(), alex, hack.id, ctx)),
        alex,
        hack.id,
        ctx,
      ),
    );
    expect(rules.attendeeCount(s, hack, ctx)).toBe(hack.attendees);
  });
});

describe("committee actions and validation", () => {
  const validEvent: rules.EventInput = {
    title: "Rust Workshop",
    description: "",
    date: "2026-11-12",
    start: "18:00",
    end: "20:00",
    venue: "Lab 2",
    category: "Workshop",
    capacity: 30,
  };

  it("only the society's committee can post announcements and create events", () => {
    const ann = { title: "Hello members", body: "Welcome back to the new term!", pinned: false };
    expect(err(rules.postAnnouncement(fresh(), alex, "compsoc", ann, ctx))).toMatch(
      /Only the CompSoc committee/,
    );
    expect(err(rules.postAnnouncement(fresh(), jordan, "music", ann, ctx))).toMatch(
      /Only the MusicSoc committee/,
    );
    expect(
      ok(rules.postAnnouncement(fresh(), jordan, "compsoc", ann, ctx)).announcements,
    ).toHaveLength(1);
    expect(err(rules.createEvent(fresh(), alex, "compsoc", validEvent, ctx))).toMatch(
      /Only the CompSoc committee/,
    );
  });

  it("created events use the society's tags, not a hardcoded one", () => {
    const s = ok(rules.createEvent(fresh(), jordan, "compsoc", validEvent, ctx));
    expect(s.createdEvents[0]).toMatchObject({
      title: "Rust Workshop",
      attendees: 0,
      tags: compsoc.tags,
    });
  });

  it("validates event times, dates and capacity", () => {
    const bad = (patch: Partial<rules.EventInput>) =>
      err(rules.createEvent(fresh(), jordan, "compsoc", { ...validEvent, ...patch }, ctx));
    expect(bad({ end: "17:00" })).toMatch(/End time must be after/);
    expect(bad({ date: "2026-10-01" })).toMatch(/today or a later date/);
    expect(bad({ capacity: 0 })).toMatch(/at least 1/);
    expect(bad({ capacity: 2.5 })).toMatch(/whole number/);
    expect(bad({ capacity: Number.NaN })).toMatch(/number/);
    expect(bad({ title: "  " })).toMatch(/title/);
    expect(bad({ venue: "" })).toMatch(/venue/);
  });

  it("validates announcements", () => {
    expect(
      err(
        rules.postAnnouncement(
          fresh(),
          jordan,
          "compsoc",
          { title: "Hi", body: "Too short", pinned: false },
          ctx,
        ),
      ),
    ).toMatch(/title/);
  });
});

describe("discussions", () => {
  it("only members can post, and empty or oversized messages are rejected", () => {
    expect(err(rules.postMessage(fresh(), alex, "compsoc-general", "hello", ctx))).toMatch(
      /Only members/,
    );
    expect(err(rules.postMessage(fresh(), alex, "music-general", "   ", ctx))).toMatch(
      /Write a message/,
    );
    expect(err(rules.postMessage(fresh(), alex, "music-general", "x".repeat(1001), ctx))).toMatch(
      /1,000/,
    );
    const s = ok(rules.postMessage(fresh(), alex, "music-general", "  Need a drummer!  ", ctx));
    expect(s.messages[0]).toMatchObject({ author: alex.name, body: "Need a drummer!" });
  });
});

describe("notifications", () => {
  const withAlexInCompsoc = (): DemoState => {
    const s = fresh();
    return {
      ...s,
      memberships: {
        ...s.memberships,
        [alex.id]: { ...s.memberships[alex.id], compsoc: "member" },
      },
    };
  };
  const ann = { title: "Hack Night moved", body: "Now on Thursday, same place.", pinned: false };

  it("notifies members of new announcements", () => {
    const s = ok(rules.postAnnouncement(withAlexInCompsoc(), jordan, "compsoc", ann, ctx));
    expect(s.notifications[alex.id]?.[0]?.title).toBe("New announcement in CompSoc");
    expect(s.notifications[jordan.id]).toHaveLength(0); // the author isn't notified
  });

  it("respects the recipient's preference", () => {
    const base = withAlexInCompsoc();
    const s = ok(
      rules.postAnnouncement(
        { ...base, prefs: { ...base.prefs, announcements: false } },
        jordan,
        "compsoc",
        ann,
        ctx,
      ),
    );
    expect(s.notifications[alex.id]).toHaveLength(0);
  });

  it("does not duplicate an identical unread notification", () => {
    const hack = "e-hack";
    let s = ok(rules.registerForEvent(fresh(), alex, hack, ctx));
    s = ok(rules.cancelRegistration(s, alex, hack, ctx));
    s = ok(rules.registerForEvent(s, alex, hack, ctx));
    expect(s.notifications[alex.id]?.filter((x) => x.title === "You're registered")).toHaveLength(
      1,
    );
  });
});

describe("calendar export", () => {
  it("builds an iCalendar event and handles events past midnight", () => {
    const lan = events.find((e) => e.id === "e-lan")!; // 18:00–02:00
    const ics = eventToIcs(lan, "Gaming Society");
    expect(ics).toContain("DTSTART:20261030T180000");
    expect(ics).toContain("DTEND:20261031T020000");
    expect(ics).toContain("SUMMARY:Halloween LAN Party");
  });
});
