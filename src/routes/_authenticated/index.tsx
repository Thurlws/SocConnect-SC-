import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, Compass, Megaphone, Pin, Search, Waypoints } from "lucide-react";
import { useData } from "@/lib/api/store";
import { pageHead } from "@/lib/seo";
import { todayIso } from "@/lib/format";
import { daysUntil, greeting, timeAgo, formatDate } from "@/lib/format";
import { EventCard, SectionHeader, SocietyCard, EmptyState } from "@/components/cards";
import { SocietyAvatar, accentClasses } from "@/components/society-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AskSocConnect, useSocietyFits } from "@/components/society-ai";

export const Route = createFileRoute("/_authenticated/")({
  head: () => pageHead("Home", "Your societies, your next events and the latest announcements."),
  component: Home,
});

/** "today", "tomorrow", or "Thursday, 15 October". */
function whenLabel(date: string) {
  const d = daysUntil(date);
  return d === 0 ? "today" : d === 1 ? "tomorrow" : `on ${formatDate(date, { weekday: "long", day: "numeric", month: "long" })}`;
}

function Home() {
  const { user, events, joinedSocieties, announcements, societies, isRegistered, getSociety, recommendations } = useData();
  const fits = useSocietyFits();
  const upcoming = events.filter((e) => e.date >= todayIso());
  const next = upcoming.filter((e) => isRegistered(e.id)).sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`))[0];
  const nextSociety = next ? getSociety(next.societyId) : undefined;
  const mine = upcoming.filter((e) => isRegistered(e.id) || joinedSocieties.some((s) => s.id === e.societyId)).slice(0, 4);
  const joinedIds = new Set(joinedSocieties.map((s) => s.id));
  const recent = announcements.filter((a) => joinedIds.has(a.societyId)).slice(0, 4);
  const recs = recommendations.slice(0, 4).flatMap(r => {
    const s = societies.find(s => s.id === r.slug);
    return s ? [{ s, reason: fits.data?.reasons[r.slug] ?? (r.score ? `Matches your interests in ${r.matched_interests.join(", ")}.` : "Explore something new.") }] : [];
  });

  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-primary p-8 text-primary-foreground sm:p-10">
        <p className="text-sm text-primary-foreground/80">{formatDate(todayIso(), { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{greeting()}, {user.name.split(" ")[0]}.</h1>
        <p className="mt-3 max-w-xl text-primary-foreground/90">
          {next ? (
            <>Your next event is{" "}
              <Link to="/events/$eventId" params={{ eventId: next.id }} className="font-medium underline decoration-primary-foreground/50 underline-offset-4 hover:decoration-primary-foreground">{next.title}</Link>
              {nextSociety ? ` with ${nextSociety.shortName}` : ""}, {whenLabel(next.date)} at {next.start}.</>
          ) : "You haven't registered for any events yet. See what's on across campus this week."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="bg-card text-primary shadow-none hover:bg-card/90"><Link to="/societies"><Compass />Explore societies</Link></Button>
          <Button asChild variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground shadow-none hover:border-primary-foreground hover:bg-transparent hover:text-primary-foreground"><Link to="/events"><CalendarDays />Browse events</Link></Button>
        </div>
      </section>

      <AskSocConnect />
      <section>
        <SectionHeader title="Coming up for you" subtitle="From your societies and registrations" action={<Link to="/events" className="text-sm font-medium text-primary hover:underline hover:underline-offset-4">All events</Link>} />
        {mine.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{mine.map((e) => <EventCard key={e.id} event={e} compact />)}</div>
        ) : (
          <EmptyState title="Nothing scheduled yet" body="Join a society or register for an event and it'll show up here." action={<Button asChild size="sm"><Link to="/events">Browse events</Link></Button>} />
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <SectionHeader title="Recent announcements" action={<Link to="/communications" className="text-sm font-medium text-primary hover:underline hover:underline-offset-4">Open feed</Link>} />
          <div className="space-y-3">
            {recent.length === 0 && <EmptyState icon={Megaphone} title="No announcements" body="Announcements from your societies appear here." />}
            {recent.map((a) => {
               const s = getSociety(a.societyId);
               if (!s) return null;
              return (
                <Link key={a.id} to="/societies/$societyId" params={{ societyId: s.id }} className="card-interactive flex gap-4 rounded-xl border bg-card p-4">
                  <SocietyAvatar society={s} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn("font-semibold", accentClasses[s.accent].text)}>{s.shortName}</span><span>{a.author}</span><span>{timeAgo(a.createdAt)}</span>
                      {a.pinned && <Pin className="size-3 text-warning" aria-label="Pinned" />}
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
          <SectionHeader title="My societies" action={<Link to="/my-societies" className="text-sm font-medium text-primary hover:underline hover:underline-offset-4">Manage</Link>} />
          <div className="space-y-2">
            {joinedSocieties.map((s) => (
              <Link key={s.id} to="/societies/$societyId" params={{ societyId: s.id }} className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-input">
                <SocietyAvatar society={s} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.category}, {announcements.filter((a) => a.societyId === s.id).length} posts, {events.filter((e) => e.societyId === s.id && e.date >= todayIso()).length} upcoming</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/societies"><Search />Browse</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/events"><CalendarDays />Find an event</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/society-pulse"><Waypoints />Society Pulse</Link></Button>
          </div>
        </section>
      </div>

      <section>
        <SectionHeader title="You might enjoy" subtitle="Based on your interests" />
        {fits.data?.notice && <p className="mb-3 text-sm text-warning">{fits.data.notice}</p>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {recs.map(({ s, reason }) => <SocietyCard key={s.id} society={s} reason={reason} />)}
        </div>
      </section>
    </div>
  );
}
