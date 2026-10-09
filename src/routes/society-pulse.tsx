import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Bookmark, BookmarkCheck, Lightbulb, Sparkles, X, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useDemo } from "@/lib/demo-store";
import { proposals } from "@/data/mock";
import { pageHead } from "@/lib/seo";
import { PageHeader } from "@/components/cards";
import { SocietyAvatar, accentClasses, societyIcon } from "@/components/society-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { CollaborationProposal, Society } from "@/lib/types";

export const Route = createFileRoute("/society-pulse")({
  head: () => pageHead("Society Pulse", "Discover collaboration opportunities between societies through shared interests."),
  component: Pulse,
});

const W = 640, H = 520, CX = W / 2, CY = H / 2;

function findProposal(a: string, b: string) {
  return proposals.find((p) => p.societyIds.includes(a) && p.societyIds.includes(b));
}

function Pulse() {
  const { societies, role, savedProposals, toggleProposal } = useDemo();
  const [a, setA] = useState<string | null>("compsoc");
  const [b, setB] = useState<string | null>(null);
  const [open, setOpen] = useState<CollaborationProposal | null>(null);

  const pos = useMemo(() => {
    const m: Record<string, { x: number; y: number }> = {};
    societies.forEach((s, i) => {
      const ang = (i / societies.length) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 215 : 150;
      m[s.id] = { x: CX + Math.cos(ang) * r * 1.3, y: CY + Math.sin(ang) * r };
    });
    return m;
  }, [societies]);

  const shared = (x: Society, y: Society) => x.tags.filter((t) => y.tags.includes(t));
  const sa = societies.find((s) => s.id === a);
  const sb = societies.find((s) => s.id === b);
  const related = sa ? societies.filter((s) => s.id !== sa.id).map((s) => ({ s, t: shared(sa, s) })).filter((x) => x.t.length).sort((p, q) => q.t.length - p.t.length) : [];

  const click = (id: string) => {
    if (!a || (a && b)) { setA(id); setB(null); return; }
    if (id === a) { setA(null); return; }
    setB(id);
  };

  const pair = a && b ? findProposal(a, b) : undefined;

  return (
    <div>
      <PageHeader
        title="Society Pulse"
        subtitle="See where societies overlap and spot collaborations worth trying. Select one society, then a second to explore what they could do together."
      />
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-dashed bg-card px-4 py-2.5 text-xs text-muted-foreground">
        <Lightbulb className="size-4 text-warning" />
        Connections are drawn from shared interest tags. Highlighted links are curated demo ideas — <b className="text-foreground">proposals, not confirmed partnerships or scheduled events.</b>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="relative self-start overflow-hidden rounded-2xl bg-pulse shadow-lift">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Network of societies">
            <defs>
              <radialGradient id="glow"><stop offset="0%" stopColor="currentColor" stopOpacity="0.35" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></radialGradient>
            </defs>
            {/* faint background web of shared interests */}
            {societies.flatMap((x, i) => societies.slice(i + 1).map((y) => {
              const t = shared(x, y).length;
              if (!t) return null;
              const hi = sa && (x.id === sa.id || y.id === sa.id);
              return <line key={`${x.id}-${y.id}`} x1={pos[x.id]!.x} y1={pos[x.id]!.y} x2={pos[y.id]!.x} y2={pos[y.id]!.y} className="stroke-ink-foreground" strokeOpacity={hi ? 0.28 : 0.05 * t} strokeWidth={hi ? 1.2 : 0.8} />;
            }))}
            {proposals.map((p) => {
              const [x, y] = p.societyIds;
              const active = (a === x && b === y) || (a === y && b === x);
              const touches = a === x || a === y;
              return (
                <line key={p.id} x1={pos[x]!.x} y1={pos[x]!.y} x2={pos[y]!.x} y2={pos[y]!.y}
                  className={cn("stroke-teal cursor-pointer", (active || touches) && "animate-dash")}
                  strokeWidth={active ? 3 : 2} strokeDasharray="6 6" strokeOpacity={active ? 1 : touches ? 0.85 : 0.45}
                  onClick={() => { setA(x); setB(y); }} />
              );
            })}
            {societies.map((s) => {
              const p = pos[s.id]!;
              const sel = s.id === a || s.id === b;
              const dim = sa && !sel && !related.some((r) => r.s.id === s.id) && !(a && findProposal(a, s.id));
              const Icon = societyIcon(s.icon);
              return (
                <g key={s.id} transform={`translate(${p.x},${p.y})`} className={cn("cursor-pointer transition-opacity", accentClasses[s.accent].text, dim && "opacity-35")} onClick={() => click(s.id)} tabIndex={0} role="button" aria-label={s.name} onKeyDown={(e) => e.key === "Enter" && click(s.id)}>
                  <circle r={sel ? 46 : 34} fill="url(#glow)" />
                  {sel && <circle r={24} className={cn("animate-pulse-ring", accentClasses[s.accent].stroke)} fill="none" strokeWidth={2} />}
                  <circle r={sel ? 24 : 18} className={accentClasses[s.accent].fill} />
                  <circle r={sel ? 24 : 18} fill="none" className="stroke-ink-foreground" strokeOpacity={sel ? 0.9 : 0.25} strokeWidth={sel ? 2 : 1} />
                  <Icon x={sel ? -11 : -8} y={sel ? -11 : -8} width={sel ? 22 : 16} height={sel ? 22 : 16} className="text-ink-foreground" />
                  <text y={sel ? 42 : 34} textAnchor="middle" className={cn("fill-ink-foreground text-[11px] font-medium", !sel && "opacity-75")}>{s.shortName}</text>
                </g>
              );
            })}
          </svg>
          <div className="absolute bottom-3 left-4 flex items-center gap-4 text-[11px] text-ink-foreground/70">
            <span className="flex items-center gap-1.5"><span className="h-px w-5 bg-ink-foreground/40" />Shared interests</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t-2 border-dashed border-teal" />Curated idea</span>
          </div>
        </div>

        <div className="space-y-4">
          {sa && sb ? (
            <div className="rounded-xl border bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div className="flex items-center -space-x-2"><SocietyAvatar society={sa} className="ring-2 ring-card" /><SocietyAvatar society={sb} className="ring-2 ring-card" /></div>
                <button onClick={() => setB(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Clear selection"><X className="size-4" /></button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{sa.shortName} + {sb.shortName}</p>
              {pair ? (
                <>
                  <h3 className="mt-1 text-lg font-semibold">{pair.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{pair.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{pair.sharedInterests.map((t) => <Badge key={t} variant="teal">{t}</Badge>)}</div>
                  <Button className="mt-4 w-full" onClick={() => setOpen(pair)}>Explore collaboration <ArrowRight /></Button>
                </>
              ) : (
                <>
                  <h3 className="mt-1 text-lg font-semibold">No curated idea yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {shared(sa, sb).length ? `They share ${shared(sa, sb).join(", ").toLowerCase()} — a good starting point for a conversation.` : "These societies don't share interest tags — a joint event could reach brand-new audiences."}
                  </p>
                </>
              )}
            </div>
          ) : sa ? (
            <div className="rounded-xl border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-3"><SocietyAvatar society={sa} /><div><p className="font-semibold">{sa.name}</p><p className="text-xs text-muted-foreground">Select another society to pair</p></div></div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Most related</p>
              <ul className="mt-2 space-y-1">
                {related.slice(0, 5).map(({ s, t }) => (
                  <li key={s.id}>
                    <button onClick={() => setB(s.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted">
                      <SocietyAvatar society={s} size="xs" /><span className="flex-1 truncate">{s.shortName}</span>
                      {findProposal(sa.id, s.id) && <Sparkles className="size-3.5 text-teal" />}
                      <span className="text-[11px] text-muted-foreground">{t.length} shared</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-card p-5 text-sm text-muted-foreground">Select a society in the network to begin.</div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Curated ideas</p>
            <div className="space-y-2">
              {proposals.map((p) => {
                const [x, y] = p.societyIds.map((id) => societies.find((s) => s.id === id)!) as [Society, Society];
                return (
                  <button key={p.id} onClick={() => { setA(x.id); setB(y.id); }} className={cn("flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-soft transition-colors hover:border-primary/30", pair?.id === p.id && "border-primary/50 bg-primary-soft/40")}>
                    <div className="flex -space-x-2"><SocietyAvatar society={x} size="sm" className="ring-2 ring-card" /><SocietyAvatar society={y} size="sm" className="ring-2 ring-card" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.title}</p><p className="truncate text-xs text-muted-foreground">{x.shortName} + {y.shortName}</p></div>
                    {savedProposals.includes(p.id) && <BookmarkCheck className="size-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (() => {
            const [x, y] = open.societyIds.map((id) => societies.find((s) => s.id === id)!) as [Society, Society];
            return (
              <>
                <SheetHeader>
                  <Badge variant="warning" className="w-fit">Proposed idea · not scheduled</Badge>
                  <SheetTitle className="font-display text-2xl">{open.title}</SheetTitle>
                  <SheetDescription>{open.summary}</SheetDescription>
                </SheetHeader>
                <div className="space-y-6 px-4 pb-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shared interests</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">{open.sharedInterests.map((t) => <Badge key={t} variant="teal">{t}</Badge>)}</div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why it could work</p>
                    <p className="mt-2 text-sm leading-relaxed">{open.rationale}</p>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What each society brings</p>
                    {[x, y].map((s) => (
                      <div key={s.id} className="flex gap-3 rounded-xl border p-3">
                        <SocietyAvatar society={s} size="sm" />
                        <div><p className="text-sm font-semibold">{s.name}</p><p className="text-sm text-muted-foreground">{open.contributions[s.id]}</p></div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suggested next steps</p>
                    <ol className="mt-2 space-y-2">{open.nextSteps.map((n) => <li key={n} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal" />{n}</li>)}</ol>
                  </div>
                  {role === "committee" ? (
                    <Button className="w-full" variant={savedProposals.includes(open.id) ? "outline" : "default"} onClick={() => { toggleProposal(open.id); toast.success(savedProposals.includes(open.id) ? "Removed from ideas" : "Saved as an idea to discuss"); }}>
                      {savedProposals.includes(open.id) ? <><BookmarkCheck />Saved to discuss</> : <><Bookmark />Save as idea to discuss</>}
                    </Button>
                  ) : (
                    <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Committee members can save ideas to discuss. Switch to the committee demo account from your profile menu.</p>
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
