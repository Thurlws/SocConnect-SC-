import type { Society } from "@/lib/types";

/**
 * Layout for the Society Pulse map. Pairwise "shared interest" links between every
 * society turn into a hairball once there are dozens of societies, so the map draws
 * interests as hubs instead: each society sits next to the interest it lists, and a
 * society with several interests sits between them. Positions are deterministic
 * (no randomness), so the map doesn't move between renders.
 */

export const MAP_W = 860;
export const MAP_H = 600;
export const NODE_R = 12;
/** Hub key for societies that haven't listed any interests yet. */
export const UNTAGGED = "";
/** Hub key that collects the rarest interests once there are too many to draw. */
export const OTHER = "Other interests";
const MAX_HUBS = 14;
const GAP = 6;

export interface PulseHub {
  key: string;
  label: string;
  count: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PulseNode {
  id: string;
  x: number;
  y: number;
  /** Hub keys this society is drawn against. */
  hubs: string[];
}

export interface PulseMap {
  hubs: PulseHub[];
  nodes: Record<string, PulseNode>;
}

const hubSize = (label: string, count: number) => ({ w: Math.round(30 + 8.6 * label.length + 8.5 * String(count).length), h: 30 });

export function layoutPulseMap(societies: Pick<Society, "id" | "tags">[]): PulseMap {
  const counts = new Map<string, number>();
  for (const s of societies) for (const t of new Set(s.tags)) counts.set(t, (counts.get(t) ?? 0) + 1);
  const ranked = [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b));
  const kept = new Set(ranked.length > MAX_HUBS ? ranked.slice(0, MAX_HUBS - 1) : ranked);
  const hubsOf = (s: Pick<Society, "tags">) => [...new Set(s.tags.map((t) => (kept.has(t) ? t : OTHER)))].sort();

  // Order the hubs around the ring so interests that share societies sit next to each
  // other (cheapest insertion, biggest interests first).
  const memberships = societies.map(hubsOf);
  const count = (k: string) => memberships.filter((m) => m.includes(k)).length;
  const keys = [...new Set(memberships.flat())].sort((a, b) => count(b) - count(a) || a.localeCompare(b));
  const together = (a: string, b: string) => memberships.filter((m) => m.includes(a) && m.includes(b)).length;
  const order: string[] = [];
  for (const k of keys) {
    let at = order.length, best = -Infinity;
    for (let i = 0; i < order.length && order.length > 1; i++) {
      const prev = order[i]!, next = order[(i + 1) % order.length]!;
      const gain = together(prev, k) + together(k, next) - together(prev, next);
      if (gain > best) { best = gain; at = i + 1; }
    }
    order.splice(at, 0, k);
  }

  // Bigger interests get a wider slice of the ring, and the ring is turned so the biggest
  // ones sit at the left and right, where there's the most room around them.
  const cx = MAP_W / 2, cy = MAP_H / 2, rx = 290, ry = 182;
  const weight = order.map((k) => 1 + Math.sqrt(count(k)));
  const total = weight.reduce((n, w) => n + w, 0);
  const mids = weight.map((w, i) => (weight.slice(0, i).reduce((n, x) => n + x, 0) + w / 2) / total * Math.PI * 2);
  let turn = 0, crowd = Infinity;
  for (let step = 0; step < 72; step++) {
    const t = (step / 72) * Math.PI * 2;
    const c = mids.reduce((n, m, i) => n + count(order[i]!) * Math.abs(Math.sin(m + t)), 0);
    if (c < crowd - 1e-9) { crowd = c; turn = t; }
  }
  const hubs: PulseHub[] = order.map((key, i) => {
    const a = mids[i]! + turn;
    const c = count(key);
    return { key, label: key, count: c, x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, ...hubSize(key, c) };
  });
  const untagged = memberships.filter((m) => m.length === 0).length;
  if (untagged) hubs.push({ key: UNTAGGED, label: "No interests listed", count: untagged, x: cx, y: cy, ...hubSize("No interests listed", untagged) });
  const hubAt = new Map(hubs.map((h) => [h.key, h]));

  // Start each society on a small sunflower spiral around its anchor: just outside its hub,
  // between its hubs, or around the centre when it lists no interests.
  const groups = new Map<string, number[]>();
  memberships.forEach((m, i) => {
    const k = m.join("|");
    groups.set(k, [...(groups.get(k) ?? []), i]);
  });
  const pos = societies.map(() => ({ x: cx, y: cy }));
  const home = societies.map(() => ({ x: cx, y: cy }));
  for (const [k, members] of groups) {
    const hs = k === "" ? [hubAt.get(UNTAGGED)!] : k.split("|").map((t) => hubAt.get(t)!);
    let ax = hs.reduce((n, h) => n + h.x, 0) / hs.length;
    let ay = hs.reduce((n, h) => n + h.y, 0) / hs.length;
    if (hs.length === 1 && k !== "") {
      const dx = ax - cx, dy = ay - cy, d = Math.hypot(dx, dy) || 1;
      ax += (dx / d) * 56;
      ay += (dy / d) * 56;
    }
    members.forEach((idx, j) => {
      const r = 17 * Math.sqrt(j + 0.5), t = j * 2.39996;
      pos[idx] = { x: ax + Math.cos(t) * r, y: ay + Math.sin(t) * r };
      home[idx] = { ...pos[idx]! };
    });
  }

  // Relax: push overlapping dots apart and out of the hub labels, with a weak pull home.
  const min = NODE_R * 2 + GAP;
  const pad = NODE_R + 8;
  for (let it = 0; it < 360; it++) {
    for (let i = 0; i < pos.length; i++) {
      const p = pos[i]!;
      for (let j = i + 1; j < pos.length; j++) {
        const q = pos[j]!;
        let dx = q.x - p.x, dy = q.y - p.y;
        let d = Math.hypot(dx, dy);
        if (d >= min) continue;
        if (d < 0.01) { dx = Math.cos(j * 2.39996); dy = Math.sin(j * 2.39996); d = 1; }
        const push = (min - d) / 2;
        p.x -= (dx / d) * push; p.y -= (dy / d) * push;
        q.x += (dx / d) * push; q.y += (dy / d) * push;
      }
      for (const h of hubs) {
        const ox = h.w / 2 + NODE_R + 4 - Math.abs(p.x - h.x);
        const oy = h.h / 2 + NODE_R + 4 - Math.abs(p.y - h.y);
        if (ox <= 0 || oy <= 0) continue;
        if (ox < oy) p.x += p.x >= h.x ? ox : -ox;
        else p.y += p.y >= h.y ? oy : -oy;
      }
      p.x += (home[i]!.x - p.x) * 0.012;
      p.y += (home[i]!.y - p.y) * 0.012;
      p.x = Math.min(MAP_W - pad, Math.max(pad, p.x));
      p.y = Math.min(MAP_H - pad, Math.max(pad, p.y));
    }
  }

  const nodes: Record<string, PulseNode> = {};
  societies.forEach((s, i) => {
    nodes[s.id] = { id: s.id, x: Math.round(pos[i]!.x * 10) / 10, y: Math.round(pos[i]!.y * 10) / 10, hubs: memberships[i]!.length ? memberships[i]! : [UNTAGGED] };
  });
  return { hubs, nodes };
}
