import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CalendarPlus, Check, Clock, MapPin, Tag, Users } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/api/store";
import { useState } from "react";
import { formatDate, daysUntil } from "@/lib/format";
import { downloadIcs } from "@/lib/ics";
import { pageHead } from "@/lib/seo";
import { SocietyAvatar, accentClasses } from "@/components/society-avatar";
import { EventCard } from "@/components/cards";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  head: () => pageHead("Event", "Event details on SocConnect."),
  component: EventPage,
});

function EventPage() {
  const { eventId } = Route.useParams();
  const { getEvent, getSociety, isRegistered, registerForEvent, cancelRegistration, attendeeCount, eventAvailability, events, loaded } = useData();
  const [busy, setBusy] = useState(false);
  const e = getEvent(eventId);
  if (!e && !loaded) return <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!e) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-xl font-semibold">Event not found</h1>
        <Link to="/events" className="mt-4 inline-block text-primary">Back to events</Link>
      </div>
    );
  }
  const s = getSociety(e.societyId)!;
  const reg = isRegistered(e.id);
  const count = attendeeCount(e);
  const availability = eventAvailability(e);
  const until = daysUntil(e.date);
  const related = events.filter((x) => x.id !== e.id && (x.societyId === e.societyId || x.tags.some((t) => e.tags.includes(t)))).slice(0, 3);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const o = await (reg ? cancelRegistration(e.id) : registerForEvent(e.id));
    setBusy(false);
    if (!o.ok) toast.error(o.error);
    else if (reg) toast("Registration cancelled");
    else toast.success("You're registered! See you there.");
  };

  return (
    <div>
      <Link to="/events" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />All events</Link>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className={cn("rounded-2xl p-8", accentClasses[s.accent].soft)}>
            <Link to="/societies/$societyId" params={{ societyId: s.id }} className="inline-flex items-center gap-2 rounded-full bg-card py-1 pl-1 pr-3 text-sm font-medium">
              <SocietyAvatar society={s} size="xs" />{s.name}
            </Link>
            <h1 className="mt-5 text-3xl font-bold sm:text-4xl">{e.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{e.category}, {until === 0 ? "today" : until > 0 ? `in ${until} day${until === 1 ? "" : "s"}` : "already happened"}</p>
          </div>
          <div className="mt-6 rounded-xl border bg-card p-6">
            <h2 className="font-semibold">About this event</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{e.description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">{e.tags.map((t) => <span key={t} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs"><Tag className="size-3" />{t}</span>)}</div>
          </div>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border bg-card p-6">
            <ul className="flex flex-col gap-3 text-sm">
              <li className="flex gap-3"><Clock className="size-4 text-primary" /><span><span className="block font-medium">{formatDate(e.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span><span className="text-muted-foreground">{e.start}{e.end ? ` – ${e.end}` : ""}</span></span></li>
              <li className="flex gap-3"><MapPin className="size-4 text-primary" /><span className="font-medium">{e.venue}</span></li>
              <li className="flex gap-3"><Users className="size-4 text-primary" /><span className="font-medium">{count} going{e.capacity ? `, ${Math.max(e.capacity - count, 0)} spots left` : ""}</span></li>
            </ul>
            {e.capacity && <Progress value={Math.min((count / e.capacity) * 100, 100)} className="mt-4 h-1.5" />}
            <Button className="mt-5 w-full" size="lg" variant={reg ? "outline" : "default"} onClick={toggle} disabled={busy || availability === "past" || (!reg && availability === "full")}>
              {availability === "past" ? (reg ? "Ended. You were registered" : "This event has ended")
                : reg ? "Cancel registration" : availability === "full" ? "Event full" : "Register"}
            </Button>
            {reg && availability !== "past" && <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-medium"><Check className="size-4" />You're registered</p>}
            {availability === "full" && !reg && <p className="mt-2 text-center text-xs text-muted-foreground">No spots left, and there's no waitlist.</p>}
            {reg && availability !== "past" && (
              <Button variant="ghost" className="mt-2 w-full" onClick={() => downloadIcs(e, s.name)}><CalendarPlus />Add to calendar (.ics)</Button>
            )}
          </div>
        </aside>
      </div>
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">You might also like</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{related.map((x) => <EventCard key={x.id} event={x} compact />)}</div>
        </section>
      )}
    </div>
  );
}
