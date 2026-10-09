import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Compass, Megaphone, Pin, Search, Sparkles } from "lucide-react";
import { useData } from "@/lib/api/store";
import { pageHead } from "@/lib/seo";
import { todayIso } from "@/lib/format";
import { greeting, timeAgo, formatDate } from "@/lib/format";
import { EventCard, SectionHeader, SocietyCard, EmptyState, DemoBadge } from "@/components/cards";
import { SocietyAvatar, accentClasses } from "@/components/society-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Society } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/")({
  head: () => pageHead("Home", "Your societies, upcoming plans and new opportunities — all in one place."),
  component: Home,
});

function recommend(societies: Society[], interests: string[], member: (id: string) => string) {
  const candidates = societies.filter((s) => member(s.id) === "none");
  const scored = candidates
    .map((s) => ({ s, overlap: s.tags.filter((t) => interests.includes(t)) }))
    .sort((a, b) => b.overlap.length - a.overlap.length || b.s.memberCount - a.s.memberCount);
  const top = scored.filter((x) => x.overlap.length > 0).slice(0, 3);
  const wildcard = scored.find((x) => x.overlap.length === 0);
  const picks = top.map((x) => ({ s: x.s, reason: `Matches your interest in ${x.overlap.slice(0, 2).join(" & ").toLowerCase()}.` }));
  if (wildcard) picks.push({ s: wildcard.s, reason: "Something outside your usual interests — worth a look." });
  return picks;
}

function Home() {
  const { user, events, joinedSocieties, announcements, membership, societies, isRegistered, getSociety, interests } = useData();
  const upcoming = events.filter((e) => e.date >= todayIso());
  const mine = upcoming.filter((e) => isRegistered(e.id) || joinedSocieties.some((s) => s.id === e.societyId)).slice(0, 4);
  const joinedIds = new Set(joinedSocieties.map((s) => s.id));
  const recent = announcements.filter((a) => joinedIds.has(a.societyId)).slice(0, 4);
  const recs = recommend(societies, interests, membership);

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-2xl border bg-hero p-8 shadow-soft sm:p-10">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDate(todayIso(), { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{greeting()}, {user.name.split(" ")[0]}.</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">Your communities, upcoming plans, and new opportunities — all in one place.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild><Link to="/societies"><Compass />Explore Societies</Link></Button>
          <Button asChild variant="outline"><Link to="/events"><CalendarDays />Discover Events</Link></Button>
        </div>
        <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
          {[
            { k: joinedSocieties.length, l: "Societies" },
            { k: upcoming.filter((e) => isRegistered(e.id)).length, l: "Registered events" },
            { k: recent.length, l: "New announcements" },
          ].map((x) => (
            <div key={x.l} className="rounded-xl border bg-card/80 px-4 py-3">
              <p className="font-display text-2xl font-semibold">{x.k}</p>
              <p className="text-xs text-muted-foreground">{x.l}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Coming up for you" subtitle="From your societies and registrations" action={<Link to="/events" className="flex items-center gap-1 text-sm font-medium text-primary">All events <ArrowRight className="size-4" /></Link>} />
        {mine.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{mine.map((e) => <EventCard key={e.id} event={e} compact />)}</div>
        ) : (
          <EmptyState title="Nothing scheduled yet" body="Join a society or register for an event and it'll show up here." action={<Button asChild size="sm"><Link to="/events">Browse events</Link></Button>} />
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <SectionHeader title="Recent announcements" action={<Link to="/communications" className="text-sm font-medium text-primary">Open feed</Link>} />
          <div className="space-y-3">
            {recent.length === 0 && <EmptyState icon={Megaphone} title="No announcements" body="Announcements from your societies appear here." />}
            {recent.map((a) => {
              const s = getSociety(a.societyId)!;
              return (
                <Link key={a.id} to="/societies/$societyId" params={{ societyId: s.id }} className="card-interactive flex gap-4 rounded-xl border bg-card p-4 shadow-soft">
                  <SocietyAvatar society={s} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn("font-semibold", accentClasses[s.accent].text)}>{s.shortName}</span>· {a.author} · {timeAgo(a.createdAt)}
                      {a.pinned && <Pin className="size-3 text-primary" />}
                    </p>
                    <p className="mt-1 font-semibold">{a.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="lg:col-span-2">
          <SectionHeader title="My societies" action={<Link to="/my-societies" className="text-sm font-medium text-primary">Manage</Link>} />
          <div className="space-y-2">
            {joinedSocieties.map((s) => (
              <Link key={s.id} to="/societies/$societyId" params={{ societyId: s.id }} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-soft transition-colors hover:border-primary/30">
                <SocietyAvatar society={s} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.category} · {announcements.filter((a) => a.societyId === s.id).length} posts · {events.filter((e) => e.societyId === s.id && e.date >= todayIso()).length} upcoming</p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              { to: "/societies", icon: Search, l: "Browse" },
              { to: "/events", icon: CalendarDays, l: "Find event" },
              { to: "/society-pulse", icon: Sparkles, l: "Pulse" },
            ].map((q) => (
              <Link key={q.l} to={q.to} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-xs font-medium shadow-soft hover:border-primary/30 hover:text-primary">
                <q.icon className="size-4" />{q.l}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section>
        <SectionHeader title="You might enjoy" subtitle="Based on your interests in Settings — simple tag matching, nothing more." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {recs.map(({ s, reason }) => <SocietyCard key={s.id} society={s} reason={reason} />)}
        </div>
      </section>
    </div>
  );
}
