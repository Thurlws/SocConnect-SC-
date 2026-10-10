import { describe, expect, it } from "vitest";
import { MAP_H, MAP_W, NODE_R, UNTAGGED, layoutPulseMap } from "@/lib/pulse-layout";

// Interest tags of the 67 official TU Dublin societies (migration 0006), one letter per interest.
const REAL = "VW VW C CM - F A G C CV V T CV C AM A M A C BV ST VO C G T A A A C ST V TG G VO A B C CV CV C C - V AM VW A G W CVA A FSW AM S A V - A V B VO C V - V G - V";
const NAMES: Record<string, string> = { A: "Arts", B: "Business", C: "Culture", F: "Food", G: "Gaming", M: "Music", O: "Outdoors", S: "Science", T: "Technology", V: "Volunteering", W: "Wellbeing" };
const societies = REAL.split(" ").map((code, i) => ({ id: `s${i}`, tags: code === "-" ? [] : [...code].map((c) => NAMES[c]!) }));

describe("Society Pulse layout", () => {
  const map = layoutPulseMap(societies);
  const nodes = Object.values(map.nodes);

  it("places every society inside the map without overlapping another", () => {
    expect(nodes).toHaveLength(societies.length);
    for (const n of nodes) {
      expect(n.x).toBeGreaterThanOrEqual(NODE_R);
      expect(n.x).toBeLessThanOrEqual(MAP_W - NODE_R);
      expect(n.y).toBeGreaterThanOrEqual(NODE_R);
      expect(n.y).toBeLessThanOrEqual(MAP_H - NODE_R);
    }
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++)
        expect(Math.hypot(nodes[i]!.x - nodes[j]!.x, nodes[i]!.y - nodes[j]!.y)).toBeGreaterThan(NODE_R * 2);
  });

  it("keeps dots off the interest labels", () => {
    for (const n of nodes)
      for (const h of map.hubs)
        expect(Math.abs(n.x - h.x) > h.w / 2 + NODE_R || Math.abs(n.y - h.y) > h.h / 2 + NODE_R).toBe(true);
  });

  it("draws one hub per interest, plus one for societies without interests", () => {
    expect(map.hubs.map((h) => h.key).sort()).toEqual([...Object.values(NAMES), UNTAGGED].sort());
    expect(map.hubs.find((h) => h.key === "Volunteering")?.count).toBe(20);
    expect(map.nodes["s4"]?.hubs).toEqual([UNTAGGED]);
  });

  it("puts a society nearer its own interest than the others", () => {
    const games = map.hubs.find((h) => h.key === "Gaming")!;
    const d = (h: { x: number; y: number }) => Math.hypot(map.nodes["s7"]!.x - h.x, map.nodes["s7"]!.y - h.y);
    for (const h of map.hubs) if (h !== games) expect(d(games)).toBeLessThan(d(h));
  });

  it("is deterministic", () => {
    expect(layoutPulseMap(societies)).toEqual(map);
  });
});
