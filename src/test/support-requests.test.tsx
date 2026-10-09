import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("support requests", () => {
  beforeEach(() => mem.clear());

  it("runs the full member → committee → member workflow", () => {
    const { result } = setup();
    let id: string | null = null;

    act(() => {
      id = result.current.submitSupportRequest({
        societyId: "compsoc",
        title: "Laptop loan for Hack Night",
        description: "Mine is being repaired. Could I borrow one?",
        category: "equipment",
        priority: "normal",
      });
    });
    expect(id).not.toBeNull();
    expect(result.current.getSupportRequest(id!)?.status).toBe("open");

    // Members can't manage requests.
    let err: string | null = null;
    act(() => {
      err = result.current.setSupportRequestStatus(id!, "in_progress");
    });
    expect(err).toMatch(/committee/);

    act(() => result.current.setRole("committee"));
    act(() => {
      err = result.current.assignSupportRequest(id!, "Priya Nair");
    });
    expect(err).toBeNull();
    act(() => {
      err = result.current.setSupportRequestStatus(id!, "in_progress");
    });
    expect(err).toBeNull();

    // Resolving needs a note.
    act(() => {
      err = result.current.setSupportRequestStatus(id!, "resolved", "  ");
    });
    expect(err).toMatch(/resolution/);
    act(() => {
      err = result.current.setSupportRequestStatus(id!, "resolved", "Collect it from Priya.");
    });
    expect(err).toBeNull();

    act(() => result.current.setRole("student"));
    const r = result.current.getSupportRequest(id!)!;
    expect(r.status).toBe("resolved");
    expect(r.assignedTo).toBe("Priya Nair");
    expect(r.resolution).toBe("Collect it from Priya.");
    expect(r.activity.map((a) => a.kind)).toEqual(["created", "assigned", "status", "status"]);
    expect(result.current.notifications[0]?.title).toBe("Your request was resolved");
  });

  it("enforces visibility and society boundaries", () => {
    const { result } = setup();
    const tomsRequest = result.current.getSupportRequest("sr1")!; // CompSoc, someone else's
    const photoRequest = result.current.getSupportRequest("sr4")!; // PhotoSoc, Alex's own

    // The student sees only their own requests.
    expect(result.current.canViewRequest(tomsRequest)).toBe(false);
    expect(result.current.canViewRequest(photoRequest)).toBe(true);
    let err: string | null = null;
    act(() => {
      err = result.current.commentOnSupportRequest("sr1", "Can I see this?");
    });
    expect(err).not.toBeNull();

    // CompSoc committee can't manage PhotoSoc requests.
    act(() => result.current.setRole("committee"));
    expect(result.current.canManageRequest(tomsRequest)).toBe(true);
    expect(result.current.canManageRequest(photoRequest)).toBe(false);
    act(() => {
      err = result.current.assignSupportRequest("sr1", "Noah Fitzgerald"); // not on CompSoc committee
    });
    expect(err).toMatch(/committee/);
  });

  it("rejects requests to societies the member hasn't joined", () => {
    const { result } = setup();
    let id: string | null = "unset";
    act(() => {
      id = result.current.submitSupportRequest({
        societyId: "robotics",
        title: "Question",
        description: "Not a member here yet.",
        category: "question",
        priority: "low",
      });
    });
    expect(id).toBeNull();
  });
});
