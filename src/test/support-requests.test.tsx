import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Outcome } from "@/lib/demo-rules";
import { DemoProvider, useDemo } from "@/lib/demo-store";

const wrapper = ({ children }: { children: ReactNode }) => <DemoProvider>{children}</DemoProvider>;

function setup() {
  return renderHook(() => useDemo(), { wrapper });
}

// In-memory storage: Node 25+ ships its own (disabled) localStorage global that shadows jsdom's.
const mem = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
});

const laptopLoan = {
  societyId: "compsoc",
  title: "Laptop loan for Hack Night",
  description: "Mine is being repaired. Could I borrow one?",
  category: "equipment",
  priority: "normal",
} as const;

describe("support requests", () => {
  beforeEach(() => mem.clear());

  it("runs the full member → committee → member workflow", () => {
    const { result } = setup();
    let o!: Outcome;

    act(() => {
      o = result.current.submitSupportRequest(laptopLoan);
    });
    expect(o).toMatchObject({ ok: true });
    const id = (o as { id: string }).id;
    expect(result.current.getSupportRequest(id)?.status).toBe("open");

    // Members can't manage requests.
    act(() => {
      o = result.current.setSupportRequestStatus(id, "in_progress");
    });
    expect(o).toMatchObject({ ok: false, error: expect.stringMatching(/committee/) });

    act(() => result.current.setRole("committee"));
    act(() => {
      o = result.current.assignSupportRequest(id, "Priya Nair");
    });
    expect(o).toMatchObject({ ok: true });
    act(() => {
      o = result.current.setSupportRequestStatus(id, "in_progress");
    });
    expect(o).toMatchObject({ ok: true });

    // Resolving needs a note.
    act(() => {
      o = result.current.setSupportRequestStatus(id, "resolved", "  ");
    });
    expect(o).toMatchObject({ ok: false, error: expect.stringMatching(/resolution/) });
    act(() => {
      o = result.current.setSupportRequestStatus(id, "resolved", "Collect it from Priya.");
    });
    expect(o).toMatchObject({ ok: true });
    // Notifications are per account: the committee doesn't get the member's update.
    expect(result.current.notifications.some((n) => n.title === "Your request was resolved")).toBe(
      false,
    );

    act(() => result.current.setRole("student"));
    const r = result.current.getSupportRequest(id)!;
    expect(r.status).toBe("resolved");
    expect(r.assignedTo).toBe("Priya Nair");
    expect(r.resolution).toBe("Collect it from Priya.");
    expect(r.activity.map((a) => a.kind)).toEqual(["created", "assigned", "status", "status"]);
    expect(result.current.notifications[0]?.title).toBe("Your request was resolved");
  });

  it("validates input and enforces visibility and society boundaries", () => {
    const { result } = setup();
    let o!: Outcome;

    act(() => {
      o = result.current.submitSupportRequest({ ...laptopLoan, title: "Hi" });
    });
    expect(o).toMatchObject({ ok: false, error: expect.stringMatching(/title/) });

    const tomsRequest = result.current.getSupportRequest("sr1")!; // CompSoc, someone else's
    const photoRequest = result.current.getSupportRequest("sr4")!; // PhotoSoc, Alex's own

    // The student sees only their own requests.
    expect(result.current.canViewRequest(tomsRequest)).toBe(false);
    expect(result.current.canViewRequest(photoRequest)).toBe(true);
    act(() => {
      o = result.current.commentOnSupportRequest("sr1", "Can I see this?");
    });
    expect(o).toMatchObject({ ok: false });

    // CompSoc committee can't manage PhotoSoc requests.
    act(() => result.current.setRole("committee"));
    expect(result.current.canManageRequest(tomsRequest)).toBe(true);
    expect(result.current.canManageRequest(photoRequest)).toBe(false);
    act(() => {
      o = result.current.assignSupportRequest("sr1", "Noah Fitzgerald"); // not on CompSoc committee
    });
    expect(o).toMatchObject({ ok: false, error: expect.stringMatching(/committee/) });
  });

  it("rejects requests to societies the member hasn't joined", () => {
    const { result } = setup();
    let o!: Outcome;
    act(() => {
      o = result.current.submitSupportRequest({ ...laptopLoan, societyId: "robotics" });
    });
    expect(o).toMatchObject({ ok: false, error: expect.stringMatching(/Join RoboSoc/) });
  });
});
