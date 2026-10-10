import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Compass, Megaphone, Pin } from "lucide-react";
import { useData } from "@/lib/api/store";
import { pageHead } from "@/lib/seo";
import { todayIso } from "@/lib/format";
import { greeting, timeAgo, formatDate } from "@/lib/format";
import { EventCard, SectionHeader, SocietyCard, EmptyState } from "@/components/cards";
import { SocietyAvatar, accentClasses } from "@/components/society-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AskSocConnect, useSocietyFits } from "@/components/society-ai";

export const Route = createFileRoute("/_authenticated/")({
  head: () => pageHead("Home", "Your societies, upcoming plans and new opportunities — all in one place."),
  component: Home,
});

function Home() {
  const { user, events, joinedSocieties, announcements, societies, isRegistered, getSociety, recommendations } = useData();
  const fits = useSocietyFits();
  const upcoming = events.filter((e) => e.date >= todayIso()).sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  const next = upcoming.find((e) => isRegistered(e.id));
  const nextSociety = next && getSociety(next.societyId);
  const mine = upcoming.filter((e) => isRegistered(e.id) || joinedSocieties.some((s) => s.id === e.societyId)).slice(0, 4);
  const joinedIds = new Set(joinedSocieties.map((s) => s.id));
  const recent = announcements.filter((a) => joinedIds.has(a.societyId)).slice(0, 4);
  const recs = recommendations.slice(0, 4).flatMap(r => {
    const s = societies.find(s => s.id === r.slug);
    return s ? [{ s, reason: fits.data?.reasons[r.slug] ?? (r.score ? `Matches your interests in ${r.matched_interests.join(", ")}.` : "Explore something new.") }] : [];
  });

  return (
    <div className="space-y-12">
      <section>
        <p className="text-sm text-muted-foreground">{formatDate(todayIso(), { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{greeting()}, {user.name.split(" ")[0]}.</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {next && nextSociety
            ? `Next up is ${next.title} with ${nextSociety.shortName}, ${formatDate(next.date, { weekday: "long", day: "numeric", month: "long" })} at ${next.start}.`
            : joinedSocieties.length
              ? `Nothing booked yet. Your societies have ${mine.length} event${mine.length === 1 ? "" : "s"} coming up.`
              : "Join a society and its events and posts will show up here."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild><Link to="/societies"><Compass />Find societies</Link></Button>
          <Button asChild variant="outline"><Link to="/events"><CalendarDays />See what's on</Link></Button>
        </div>
      </section>

      <AskSocConnect />
      <section>
        <SectionHeader title="Coming up for you" subtitle="From your societies and registrations" action={<Link to="/events" className="link-ink text-sm">All events</Link>} />
        {mine.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{mine.map((e) => <EventCard key={e.id} event={e} compact />)}</div>
        ) : (
          <EmptyState title="Nothing scheduled yet" body="Join a society or register for an event and it'll show up here." action={<Button asChild size="sm"><Link to="/events">Browse events</Link></Button>} />
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <SectionHeader title="Recent announcements" action={<Link to="/communications" className="link-ink text-sm">Open feed</Link>} />
          <div className="flex flex-col gap-3">
            {recent.length === 0 && <EmptyState icon={Megaphone} title="No announcements" body="Announcements from your societies appear here." />}
            {recent.map((a) => {
               const s = getSociety(a.societyId);
               if (!s) return null;
              return (
                <Link key={a.id} to="/societies/$societyId" params={{ societyId: s.id }} className="card-interactive flex gap-4 rounded-xl border bg-card p-4">
                  <SocietyAvatar society={s} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className={cn("font-semibold", accentClasses[s.accent].text)}>{s.shortName}</span>
                      <span>{a.author}, {timeAgo(a.createdAt)}</span>
                      {a.pinned && <span className="flex items-center gap-1 font-medium text-foreground"><Pin className="size-3" />Pinned</span>}
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
          <SectionHeader title="My societies" action={<Link to="/my-societies" className="link-ink text-sm">Manage</Link>} />
          <div className="flex flex-col gap-2">
            {joinedSocieties.length === 0 && <p className="text-sm text-muted-foreground">You haven't joined a society yet. <Link to="/societies" className="link-ink">Find one</Link></p>}
            {joinedSocieties.map((s) => {
              const soon = events.filter((e) => e.societyId === s.id && e.date >= todayIso()).length;
              return (
              <Link key={s.id} to="/societies/$societyId" params={{ societyId: s.id }} className="card-interactive flex items-center gap-3 rounded-xl border bg-card p-3">
                <SocietyAvatar society={s} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{soon ? `${soon} upcoming event${soon === 1 ? "" : "s"}` : "No upcoming events"}</p>
                </div>
              </Link>
              );
            })}
          </div>
        </section>
      </div>

      <section>
        <SectionHeader title="Societies you might like" subtitle="Picked from the interests on your profile" />
        {fits.data?.notice && <p className="mb-3 text-sm text-warning">{fits.data.notice}</p>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {recs.map(({ s, reason }) => <SocietyCard key={s.id} society={s} reason={reason} />)}
        </div>
      </section>
    </div>
  );
}
