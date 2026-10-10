import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, CheckCircle2, Lightbulb, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useData } from "@/lib/api/store";
import { pageHead } from "@/lib/seo";
import { PageHeader } from "@/components/cards";
import { SocietyAvatar, societyIcon } from "@/components/society-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { MAP_H, MAP_W, NODE_R, UNTAGGED, layoutPulseMap, type PulseHub } from "@/lib/pulse-layout";
import type { CollaborationProposal, Society } from "@/lib/types";
import { ProposalComposer } from "@/components/society-ai";

export const Route = createFileRoute("/_authenticated/society-pulse")({
  head: () => pageHead("Society Pulse", "See which societies share interests and find pairs worth teaming up."),
  component: Pulse,
});

function findIn(proposals: CollaborationProposal[], a: string, b: string) {
  return proposals.find((p) => p.societyIds.includes(a) && p.societyIds.includes(b));
}

const shared = (x: Society, y: Society) => x.tags.filter((t) => y.tags.includes(t));

type Box = { x: number; y: number; w: number; h: number };
const overlaps = (p: Box, q: Box) => Math.abs(p.x - q.x) * 2 < p.w + q.w && Math.abs(p.y - q.y) * 2 < p.h + q.h;

/**
 * Places name labels for the picked and hovered societies: below the dot, else above,
 * right or left, whichever first stays clear of interest labels and earlier names.
 */
function placeLabels(items: { id: string; text: string; x: number; y: number; r: number }[], hubs: PulseHub[]) {
  const taken: Box[] = hubs.map((h) => ({ x: h.x, y: h.y, w: h.w, h: h.h }));
  return items.map(({ id, text, x, y, r }) => {
    const w = text.length * 8 + 8, h = 20;
    const spots: { box: Box; anchor: "middle" | "start" | "end" }[] = [
      { box: { x, y: y + r + 13, w, h }, anchor: "middle" },
      { box: { x, y: y - r - 13, w, h }, anchor: "middle" },
      { box: { x: x + r + 6 + w / 2, y, w, h }, anchor: "start" },
      { box: { x: x - r - 6 - w / 2, y, w, h }, anchor: "end" },
    ];
    const inside = (b: Box) => b.x - b.w / 2 >= 2 && b.x + b.w / 2 <= MAP_W - 2 && b.y - b.h / 2 >= 2 && b.y + b.h / 2 <= MAP_H - 2;
    const spot = spots.find((s) => inside(s.box) && !taken.some((t) => overlaps(s.box, t))) ?? spots.find((s) => inside(s.box)) ?? spots[0]!;
    taken.push(spot.box);
    const tx = spot.anchor === "middle" ? Math.min(MAP_W - w / 2, Math.max(w / 2, spot.box.x)) : spot.anchor === "start" ? spot.box.x - w / 2 + 4 : spot.box.x + w / 2 - 4;
    return { id, text, x: tx, y: spot.box.y + 5, anchor: spot.anchor };
  });
}

function Pulse() {
  const { societies, role, savedProposals, toggleProposal, proposals, joinedSocieties } = useData();
  const findProposal = (a: string, b: string) => findIn(proposals, a, b);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [hub, setHub] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<CollaborationProposal | null>(null);

  const map = useMemo(() => layoutPulseMap(societies), [societies]);
  const byId = useMemo(() => new Map(societies.map((s) => [s.id, s])), [societies]);
  // Ideas whose societies are both still listed.
  const ideas = proposals.flatMap((p) => {
    const x = byId.get(p.societyIds[0]), y = byId.get(p.societyIds[1]);
    return x && y ? [{ p, x, y }] : [];
  });

  const sa = a ? byId.get(a) : undefined;
  const sb = b ? byId.get(b) : undefined;
  const related = sa
    ? societies
        .filter((s) => s.id !== sa.id)
        .map((s) => ({ s, t: shared(sa, s), idea: !!findProposal(sa.id, s.id) }))
        .filter((x) => x.t.length || x.idea)
        .sort((p, q) => Number(q.idea) - Number(p.idea) || q.t.length - p.t.length || p.s.name.localeCompare(q.s.name))
    : [];
  const lit = sa
    ? new Set([sa.id, ...(sb ? [sb.id] : []), ...related.map((r) => r.s.id)])
    : hub !== null
      ? new Set(Object.values(map.nodes).filter((n) => n.hubs.includes(hub)).map((n) => n.id))
      : null;
  const hubsOfA = sa ? new Set(map.nodes[sa.id]?.hubs) : null;

  const pick = (id: string) => {
    setQuery("");
    if (!a || (a && b)) { setA(id); setB(null); setHub(null); return; }
    if (id === a) { setA(null); return; }
    setB(id);
  };
  const pickPair = (x: string, y: string) => { setA(x); setB(y); setHub(null); setQuery(""); };
  const clear = () => { setA(null); setB(null); setHub(null); };

  const pair = a && b ? findProposal(a, b) : undefined;
  const q = query.trim().toLowerCase();
  const matches = q
    ? societies.filter((s) => s.id !== a && `${s.name} ${s.shortName} ${s.tags.join(" ")}`.toLowerCase().includes(q)).slice(0, 8)
    : [];
  const hubLabel = (key: string) => map.hubs.find((h) => h.key === key)?.label ?? key;
  const labelled = [a, b, hover].filter((id, i, all): id is string => !!id && all.indexOf(id) === i);

  return (
    <div>
      <PageHeader
        title="Society Pulse"
        subtitle="Every society sits next to the interests it lists, so you can see who overlaps. Pick a society, then a second one, to see what they could do together."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="self-start">
          <div className="overflow-hidden rounded-xl border bg-card">
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="h-auto w-full select-none" role="img" aria-label={`Map of ${societies.length} societies grouped by the interests they list. Use the panel beside it to pick societies.`}>
              {/* Society to interest */}
              {Object.values(map.nodes).flatMap((n) => n.hubs.map((k) => {
                const h = map.hubs.find((x) => x.key === k);
                if (!h) return null;
                const on = n.id === a || n.id === b || n.id === hover || (!sa && hub === k);
                return <line key={`${n.id}-${k}`} x1={n.x} y1={n.y} x2={h.x} y2={h.y} stroke="var(--ink)" strokeOpacity={on ? 0.55 : lit && !lit.has(n.id) ? 0.04 : 0.12} strokeWidth={on ? 1.5 : 1} />;
              }))}

              {/* Collaboration ideas */}
              {ideas.map(({ p }) => {
                const [x, y] = p.societyIds;
                const nx = map.nodes[x], ny = map.nodes[y];
                if (!nx || !ny) return null;
                const active = (a === x && b === y) || (a === y && b === x);
                const touches = a === x || a === y;
                return (
                  <line key={p.id} x1={nx.x} y1={nx.y} x2={ny.x} y2={ny.y} stroke="var(--teal)" strokeDasharray="7 6" strokeLinecap="round"
                    strokeWidth={active ? 3 : 2} strokeOpacity={active ? 1 : touches ? 0.85 : sa ? 0.15 : 0.6}
                    className="cursor-pointer" onClick={() => pickPair(x, y)}>
                    <title>{p.title}</title>
                  </line>
                );
              })}

              {/* The pair you're looking at */}
              {sa && sb && map.nodes[sa.id] && map.nodes[sb.id] && (
                <g>
                  <line x1={map.nodes[sa.id]!.x} y1={map.nodes[sa.id]!.y} x2={map.nodes[sb.id]!.x} y2={map.nodes[sb.id]!.y} stroke="var(--primary)" strokeOpacity={0.22} strokeWidth={9} strokeLinecap="round" />
                  <line x1={map.nodes[sa.id]!.x} y1={map.nodes[sa.id]!.y} x2={map.nodes[sb.id]!.x} y2={map.nodes[sb.id]!.y} stroke="var(--ink)" strokeWidth={1.5} />
                </g>
              )}

              {map.hubs.map((h) => (
                <HubPlate key={h.key} hub={h} on={hub === h.key || !!hubsOfA?.has(h.key)} dim={!!lit && !hub && !hubsOfA?.has(h.key)}
                  onClick={() => { setA(null); setB(null); setHub(hub === h.key ? null : h.key); }} />
              ))}

              {societies.map((s) => {
                const n = map.nodes[s.id];
                if (!n) return null;
                const sel = s.id === a || s.id === b;
                const Icon = societyIcon(s.icon);
                const r = sel ? NODE_R + 3 : NODE_R;
                return (
                  <g key={s.id} transform={`translate(${n.x},${n.y})`} className={cn("cursor-pointer transition-opacity", lit && !lit.has(s.id) && "opacity-20")}
                    onClick={() => pick(s.id)} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover((h) => (h === s.id ? null : h))}>
                    <title>{s.name}</title>
                    {sel && <circle r={r + 7} fill="var(--primary-soft)" stroke="var(--primary)" strokeOpacity={0.35} />}
                    <circle r={r} fill={`var(--soc-${s.accent})`} stroke={sel || hover === s.id ? "var(--ink)" : "#fff"} strokeWidth={sel ? 2.5 : 2} />
                    <Icon x={-(r - 4)} y={-(r - 4)} width={(r - 4) * 2} height={(r - 4) * 2} color="#fff" strokeWidth={2.25} aria-hidden />
                  </g>
                );
              })}

              {placeLabels(labelled.flatMap((id) => {
                const s = byId.get(id), n = map.nodes[id];
                return s && n ? [{ id, text: s.shortName, x: n.x, y: n.y, r: id === a || id === b ? NODE_R + 7 : NODE_R }] : [];
              }), map.hubs).map((l) => (
                <text key={`label-${l.id}`} x={l.x} y={l.y} textAnchor={l.anchor}
                  className="pointer-events-none fill-ink text-[14px] font-semibold" stroke="#fff" strokeWidth={5} strokeLinejoin="round" paintOrder="stroke">
                  {l.text}
                </text>
              ))}
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-2"><span className="h-px w-6 bg-ink/40" />Society to interest</span>
            <span className="flex items-center gap-2"><span className="w-6 border-t-2 border-dashed border-teal" />Collaboration idea</span>
            <span>Ideas are suggestions to talk about, not confirmed plans.</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {sa && sb ? (
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center -space-x-2"><SocietyAvatar society={sa} className="ring-2 ring-card" /><SocietyAvatar society={sb} className="ring-2 ring-card" /></div>
                <button onClick={() => setB(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Clear second society"><X className="size-4" /></button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{sa.shortName} and {sb.shortName}</p>
              {pair ? (
                <>
                  <h3 className="mt-1 text-lg font-semibold">{pair.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{pair.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{pair.sharedInterests.map((t) => <Badge key={t} variant="teal">{t}</Badge>)}</div>
                  <Button className="mt-4 w-full" onClick={() => setOpen(pair)}>Read the idea</Button>
                </>
              ) : (
                <>
                  <h3 className="mt-1 text-lg font-semibold">No idea written yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {shared(sa, sb).length ? `Both list ${shared(sa, sb).join(" and ").toLowerCase()}, which is a good place to start a conversation.` : "They don't list any interests in common, so a joint event could reach people neither society usually meets."}
                  </p>
                </>
              )}
              <ProposalComposer key={`${sa.id}-${sb.id}`} a={sa.id} b={sb.id} />
            </div>
          ) : sa ? (
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-start gap-3">
                <SocietyAvatar society={sa} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{sa.name}</p>
                  <p className="text-xs text-muted-foreground">{sa.tags.length ? sa.tags.join(", ") : "No interests listed yet"}</p>
                </div>
                <button onClick={clear} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Clear selection"><X className="size-4" /></button>
              </div>
              <h3 className="mt-5 text-sm font-semibold">Pair it with</h3>
              {related.length === 0 && <p className="mt-1 text-sm text-muted-foreground">No society shares its interests yet. Search for any society below.</p>}
              <ul className="mt-2 flex flex-col gap-0.5">
                {related.slice(0, 8).map(({ s, t, idea }) => (
                  <li key={s.id}>
                    <button onClick={() => setB(s.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted">
                      <SocietyAvatar society={s} size="xs" />
                      <span className="flex-1 truncate">{s.shortName}</span>
                      {idea ? <span className="flex items-center gap-1 text-[11px] font-medium text-teal"><Lightbulb className="size-3.5" />Idea</span>
                        : <span className="text-[11px] text-muted-foreground">{t.length === 1 ? t[0] : `${t.length} interests`}</span>}
                    </button>
                  </li>
                ))}
              </ul>
              {related.length > 8 && <p className="mt-1 px-2 text-xs text-muted-foreground">{related.length - 8} more share an interest. Search to find one.</p>}
              <SocietySearch value={query} onChange={setQuery} matches={matches} onPick={(id) => { setB(id); setQuery(""); }} placeholder="Search for any society" />
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold">{hub !== null ? hubLabel(hub) : "Start with a society"}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hub !== null ? "Pick one of these to see who it could team up with." : "Search, pick one of yours, or click a dot on the map. Click an interest to see everyone who lists it."}
              </p>
              <SocietySearch value={query} onChange={setQuery} matches={matches} onPick={pick} placeholder="Search societies" />
              {!q && (
                <ul className="mt-3 flex max-h-80 flex-col gap-0.5 overflow-y-auto">
                  {(hub !== null ? societies.filter((s) => map.nodes[s.id]?.hubs.includes(hub)) : joinedSocieties).map((s) => (
                    <li key={s.id}>
                      <button onClick={() => pick(s.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted">
                        <SocietyAvatar society={s} size="xs" /><span className="flex-1 truncate">{s.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {hub !== null && <Button variant="ghost" size="sm" className="mt-2 px-2" onClick={() => setHub(null)}>Show every interest</Button>}
            </div>
          )}

          {ideas.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Collaboration ideas</h3>
              <div className="flex flex-col gap-2">
                {ideas.map(({ p, x, y }) => (
                  <button key={p.id} onClick={() => pickPair(x.id, y.id)} className={cn("flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-ink/40", pair?.id === p.id && "border-ink")}>
                    <div className="flex -space-x-2"><SocietyAvatar society={x} size="sm" className="ring-2 ring-card" /><SocietyAvatar society={y} size="sm" className="ring-2 ring-card" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.title}</p><p className="truncate text-xs text-muted-foreground">{x.shortName} and {y.shortName}</p></div>
                    {savedProposals.includes(p.id) && <BookmarkCheck className="size-4" aria-label="Saved" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (() => {
            const pairOf = open.societyIds.map((id) => byId.get(id)).filter((s): s is Society => !!s);
            return (
              <>
                <SheetHeader>
                  <Badge variant="warning" className="w-fit">{open.source === "ai" ? "Written by AI, not a confirmed event" : "An idea, not scheduled"}</Badge>
                  <SheetTitle className="text-2xl">{open.title}</SheetTitle>
                  <SheetDescription>{open.summary}</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-6 px-4 pb-8">
                  <div>
                    <h4 className="text-sm font-semibold">Shared interests</h4>
                    <div className="mt-2 flex flex-wrap gap-1.5">{open.sharedInterests.map((t) => <Badge key={t} variant="teal">{t}</Badge>)}</div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Why it could work</h4>
                    <p className="mt-2 text-sm leading-relaxed">{open.rationale}</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <h4 className="text-sm font-semibold">What each society brings</h4>
                    {pairOf.map((s) => (
                      <div key={s.id} className="flex gap-3 rounded-xl border p-3">
                        <SocietyAvatar society={s} size="sm" />
                        <div><p className="text-sm font-semibold">{s.name}</p><p className="text-sm text-muted-foreground">{open.contributions[s.id]}</p></div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Next steps</h4>
                    <ol className="mt-2 flex flex-col gap-2">{open.nextSteps.map((n) => <li key={n} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal" />{n}</li>)}</ol>
                  </div>
                  {role === "committee" ? (
                    <Button className="w-full" variant={savedProposals.includes(open.id) ? "outline" : "default"} onClick={() => { toggleProposal(open.id); toast.success(savedProposals.includes(open.id) ? "Removed from your ideas" : "Saved to discuss with your committee"); }}>
                      {savedProposals.includes(open.id) ? <><BookmarkCheck />Saved to discuss</> : <><Bookmark />Save to discuss</>}
                    </Button>
                  ) : (
                    <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Only committee members can save ideas to discuss.</p>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function HubPlate({ hub, on, dim, onClick }: { hub: PulseHub; on: boolean; dim: boolean; onClick: () => void }) {
  const untagged = hub.key === UNTAGGED;
  return (
    <g transform={`translate(${hub.x},${hub.y})`} className={cn("cursor-pointer transition-opacity", dim && "opacity-40")} onClick={onClick}>
      <title>{`${hub.label}: ${hub.count} ${hub.count === 1 ? "society" : "societies"}`}</title>
      <rect x={-hub.w / 2} y={-hub.h / 2} width={hub.w} height={hub.h} rx={6}
        fill={on ? "var(--primary-soft)" : "#fff"} stroke={on ? "var(--primary)" : "var(--ink)"} strokeWidth={on ? 1.5 : 1} strokeDasharray={untagged ? "4 3" : undefined} />
      <text y={5} textAnchor="middle" className="fill-ink font-display text-[14px] font-semibold">
        {hub.label}
        <tspan dx={7} className="fill-muted-foreground font-medium">{hub.count}</tspan>
      </text>
    </g>
  );
}

function SocietySearch({ value, onChange, matches, onPick, placeholder }: { value: string; onChange: (v: string) => void; matches: Society[]; onPick: (id: string) => void; placeholder: string }) {
  return (
    <div className="mt-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="pl-9" />
      </div>
      {value.trim() && (
        <ul className="mt-2 flex flex-col gap-0.5">
          {matches.length === 0 && <li className="px-2 py-1.5 text-sm text-muted-foreground">No society matches “{value.trim()}”.</li>}
          {matches.map((s) => (
            <li key={s.id}>
              <button onClick={() => onPick(s.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted">
                <SocietyAvatar society={s} size="xs" /><span className="flex-1 truncate">{s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
