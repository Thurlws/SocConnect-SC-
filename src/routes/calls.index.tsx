import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, FileText, Headphones } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { callRooms } from "@/data/calls";
import { DEMO_TODAY } from "@/data/mock";
import { pageHead } from "@/lib/seo";
import { EmptyState } from "@/components/cards";
import { MeetingCard, RecapCard, RoomCard, ScheduleCallDialog } from "@/components/calls";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/calls/")({
  head: () => pageHead("Calls", "Drop-in voice and video rooms, scheduled society calls and AI call recaps — all in one place."),
  component: CallsPage,
});

function CallsPage() {
  const { joinedSocieties, meetings, recaps } = useDemo();
  const joined = new Set(joinedSocieties.map((s) => s.id));
  const rooms = callRooms.filter((r) => joined.has(r.societyId));
  const upcoming = meetings.filter((m) => joined.has(m.societyId) && (m.date ?? "") >= DEMO_TODAY).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  const myRecaps = recaps.filter((r) => joined.has(r.societyId));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Calls</h1>
          <p className="mt-1 text-muted-foreground">Hop into a room, join a scheduled call, and catch up with AI recaps — no Zoom links needed.</p>
        </div>
        {joinedSocieties.length > 0 && <ScheduleCallDialog />}
      </div>

      {joinedSocieties.length === 0 ? (
        <EmptyState icon={Headphones} title="Join a society to start calling" body="Each society gets its own drop-in rooms and scheduled calls." action={<Button asChild><Link to="/societies">Discover societies</Link></Button>} />
      ) : (
        <>
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarClock className="size-4 text-primary" />Upcoming calls</h2>
            {upcoming.length ? <div className="grid gap-3 lg:grid-cols-2">{upcoming.map((m) => <MeetingCard key={m.id} meeting={m} />)}</div>
              : <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>}
          </section>
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Headphones className="size-4 text-primary" />Drop-in rooms</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rooms.map((r) => <RoomCard key={r.id} room={r} showSociety />)}</div>
          </section>
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><FileText className="size-4 text-primary" />Recent recaps</h2>
            {myRecaps.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{myRecaps.map((r) => <RecapCard key={r.id} recap={r} />)}</div>
              : <p className="text-sm text-muted-foreground">AI recaps appear here after a call ends.</p>}
          </section>
        </>
      )}
    </div>
  );
}
