import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { DemoProvider, useDemo } from "@/lib/demo-store";

// Newer Node versions shadow jsdom's localStorage with an unusable global, so use an in-memory one.
const mem = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
  },
});

// End-to-end demo journey through the real store: student leaves and re-requests CompSoc,
// committee approves, student is notified. Exercises per-user state and role switching.
describe("demo store", () => {
  beforeEach(() => localStorage.clear());

  it("runs the request → approve → notify journey across both demo accounts", () => {
    const { result } = renderHook(() => useDemo(), { wrapper: DemoProvider });
    const compsoc = () => result.current.getSociety("compsoc")!;
    const start = compsoc().memberCount;

    act(() => void result.current.leaveSociety("compsoc"));
    expect(result.current.membership("compsoc")).toBe("none");
    expect(compsoc().memberCount).toBe(start - 1);

    let first, second;
    act(() => {
      first = result.current.joinSociety("compsoc");
      second = result.current.joinSociety("compsoc"); // double click
    });
    expect(first).toMatchObject({ ok: true });
    expect(second).toMatchObject({ ok: false });
    expect(result.current.membership("compsoc")).toBe("pending");
    const req = result.current.requests.find((r) => r.userId === "u-alex")!;
    expect(req).toBeDefined();

    // Students can't approve their own request.
    expect(result.current.resolveRequest(req.id, "approve")).toMatchObject({ ok: false });

    act(() => result.current.setRole("committee"));
    expect(result.current.user.name).toBe("Jordan Lee");
    expect(result.current.membership("compsoc")).toBe("member"); // Jordan's own membership
    act(() => void result.current.resolveRequest(req.id, "approve"));
    expect(result.current.resolvedRequests[0]).toMatchObject({ outcome: "approved" });
    expect(compsoc().memberCount).toBe(start);

    act(() => result.current.setRole("student"));
    expect(result.current.membership("compsoc")).toBe("member");
    expect(result.current.notifications[0]?.title).toMatch(/approved your request/);
  });

  it("enforces event capacity and persists across reloads", () => {
    const first = renderHook(() => useDemo(), { wrapper: DemoProvider });
    const lan = first.result.current.getEvent("e-lan")!;
    expect(first.result.current.eventAvailability(lan)).toBe("full");
    expect(first.result.current.registerForEvent("e-lan")).toMatchObject({ ok: false });
    act(() => void first.result.current.registerForEvent("e-jam"));
    expect(first.result.current.isRegistered("e-jam")).toBe(true);
    first.unmount();

    const second = renderHook(() => useDemo(), { wrapper: DemoProvider });
    expect(second.result.current.isRegistered("e-jam")).toBe(true);
  });
});
