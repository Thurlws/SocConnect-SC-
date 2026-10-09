import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, LayoutGrid, MapPin, Search, SearchX, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { pageHead } from "@/lib/seo";
import { DEMO_TODAY } from "@/data/mock";
import { formatDate, monthLabel } from "@/lib/format";
import { PageHeader, EventCard, EmptyState, DemoBadge } from "@/components/cards";
import { SocietyAvatar, accentClasses } from "@/components/society-avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/events/")({
  head: () => pageHead("Events", "Workshops, socials, talks and trips from every society on campus."),
  component: EventsPage,
});

function EventsPage() {
  const { events, getSociety, isRegistered, joinedSocieties } = useDemo();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [scope, setScope] = useState<"all" | "mine" | "registered">("all");
  const [view, setView] = useState<"grid" | "calendar">("grid");
  const upcoming = events.filter((e) => e.date >= DEMO_TODAY);
  const featured = upcoming.find((e) => e.featured) ?? upcoming[0];
  const cats = ["All", ...Array.from(new Set(upcoming.map((e) => e.category)))];
  const joined = new Set(joinedSocieties.map((s) => s.id));

  const list = useMemo(() => upcoming
    .filter((e) => !q || `${e.title} ${e.tags.join(" ")} ${getSociety(e.societyId)?.name}`.toLowerCase().includes(q.toLowerCase()))
    .filter((e) => cat === "All" || e.category === cat)
    .filter((e) => scope === "all" || (scope === "registered" ? isRegistered(e.id) : joined.has(e.societyId))), [upcoming, q, cat, scope, isRegistered, joined, getSociety]);

  const fs = featured && getSociety(featured.societyId)!;

  return (
    <div className="space-y-8">
      <PageHeader title="Events" subtitle="What's happening across campus. Dates follow the fixed demo schedule." actions={
        <div className="flex rounded-lg border bg-card p-0.5">
          <Button size="sm" variant={view === "grid" ? "secondary" : "ghost"} onClick={() => setView("grid")}><LayoutGrid />Grid</Button>
          <Button size="sm" variant={view === "calendar" ? "secondary" : "ghost"} onClick={() => setView("calendar")}><CalendarDays />Calendar</Button>
        </div>
      } />

      {featured && fs && (
        <Link to="/events/$eventId" params={{ eventId: featured.id }} className="card-interactive group grid overflow-hidden rounded-2xl border bg-card shadow-soft md:grid-cols-5">
          <div className={cn("relative flex items-center justify-center p-10 md:col-span-2", accentClasses[fs.accent].soft)}>
            <SocietyAvatar society={fs} size="lg" className="bg-card shadow-soft" />
            <span className="absolute left-4 top-4 rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-primary shadow-soft">Featured</span>
          </div>
          <div className="p-6 md:col-span-3 md:p-8">
            <p className={cn("text-sm font-semibold", accentClasses[fs.accent].text)}>{fs.name}</p>
            <h2 className="mt-1 text-2xl font-semibold group-hover:text-primary">{featured.title}</h2>
            <p className="mt-2 text-muted-foreground">{featured.description}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Clock className="size-4" />{formatDate(featured.date, { weekday: "long", day: "numeric", month: "long" })} · {featured.start}</span>
              <span className="flex items-center gap-1.5"><MapPin className="size-4" />{featured.venue}</span>
            </div>
          </div>
        </Link>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events" className="bg-card pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "mine", "registered"] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", scope === s ? "border-ink bg-ink text-ink-foreground" : "bg-card")}>
              {s === "all" ? "All" : s === "mine" ? "My societies" : "Registered"}
            </button>
          ))}
          <span className="mx-1 w-px bg-border" />
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", cat === c ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{c}</button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={SearchX} title="No events found" body="Try another category or clear your search." />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{list.map((e) => <EventCard key={e.id} event={e} />)}</div>
      ) : (
        <CalendarView ids={new Set(list.map((e) => e.id))} />
      )}
    </div>
  );
}

function CalendarView({ ids }: { ids: Set<string> }) {
  const { events, getSociety, isRegistered } = useDemo();
  const [month, setMonth] = useState(9); // October (0-indexed)
  const first = new Date(2026, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(2026, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => i - offset + 1);
  const iso = (d: number) => `2026-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return (
    <div className="rounded-xl border bg-card p-4 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <p className="flex items-center gap-2 font-display font-semibold">{monthLabel(2026, month)} <DemoBadge /></p>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={month === 9} onClick={() => setMonth(9)}>Oct</Button>
          <Button size="sm" variant="outline" disabled={month === 10} onClick={() => setMonth(10)}>Nov</Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="bg-surface p-2 font-semibold text-muted-foreground">{d}</div>)}
        {cells.map((d, i) => {
          const valid = d > 0 && d <= days;
          const dayEvents = valid ? events.filter((e) => e.date === iso(d) && ids.has(e.id)) : [];
          return (
            <div key={i} className={cn("min-h-24 bg-card p-1.5", !valid && "bg-surface/60", valid && iso(d) === DEMO_TODAY && "bg-primary-soft/60")}>
              {valid && <p className={cn("mb-1 text-[11px]", iso(d) === DEMO_TODAY ? "font-bold text-primary" : "text-muted-foreground")}>{d}</p>}
              {dayEvents.map((e) => {
                const s = getSociety(e.societyId)!;
                return (
                  <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }} className={cn("mb-1 block truncate rounded px-1.5 py-0.5 text-[11px] font-medium", accentClasses[s.accent].soft, accentClasses[s.accent].text, isRegistered(e.id) && "ring-1 ring-current")}>
                    {e.start} {e.title}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
