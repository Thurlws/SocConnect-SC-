import { Link } from "@tanstack/react-router";
import { CalendarClock, FileText, Headphones, Plus, QrCode, Radio, Share2, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDemo } from "@/lib/demo-store";
import { useCallMode } from "@/lib/use-call-mode";
import { roomPresence } from "@/data/calls";
import { DEMO_TODAY } from "@/data/mock";
import { formatDate } from "@/lib/format";
import type { CallRecap, CallRoom } from "@/lib/types";
import { SocietyAvatar, accentClasses } from "@/components/society-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { InviteDialog } from "@/components/invite-dialog";

const initials = (n: string) => n.split(" ").map((p) => p[0]).join("");

export function RoomCard({ room, showSociety }: { room: CallRoom; showSociety?: boolean }) {
  const { getSociety } = useDemo();
  const s = getSociety(room.societyId);
  const mode = useCallMode();
  // Scripted presence only makes sense in simulated mode; live rooms hold whoever actually joins.
  const people = mode === "simulated" ? roomPresence(room.id) : [];
  if (!s) return null;
  return (
    <div className="card-interactive flex items-center gap-3 rounded-xl border bg-card p-4 shadow-soft">
      {showSociety ? <SocietyAvatar society={s} size="sm" /> : (
        <span className={cn("flex size-9 items-center justify-center rounded-lg", accentClasses[s.accent].soft, accentClasses[s.accent].text)}><Headphones className="size-4" /></span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          <Link to="/call/$roomId" params={{ roomId: room.id }} className="hover:underline">{showSociety && <span className="text-muted-foreground">{s.shortName} · </span>}{room.name}</Link>
        </p>
        <p className="truncate text-xs text-muted-foreground">{room.description}</p>
      </div>
      {people.length > 0 ? (
        <div className="flex items-center gap-2" title="Simulated demo participants" aria-label={`${people.length} simulated demo participants`}>
          <div className="flex -space-x-2">
            {people.map((p) => <span key={p} title={p} className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-semibold">{initials(p)}</span>)}
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-success"><span className="size-1.5 animate-pulse rounded-full bg-success" />{people.length}</span>
        </div>
      ) : mode === "live" ? <span className="flex items-center gap-1 text-xs font-medium text-success"><Radio className="size-3.5" />Live</span>
        : mode === "simulated" ? <span className="text-xs text-muted-foreground">Empty</span> : null}
      <InviteDialog roomId={room.id} roomName={room.name} societyName={s.name}>
        <Button size="icon" variant="ghost" className="size-8 shrink-0" aria-label={`Share invite for ${room.name}`}><QrCode className="size-4" /></Button>
      </InviteDialog>
      <Button asChild size="sm" variant="outline" className="shrink-0"><Link to="/call/$roomId" params={{ roomId: room.id }}><Video />Join</Link></Button>
    </div>
  );
}

export function MeetingCard({ meeting }: { meeting: CallRoom }) {
  const { getSociety } = useDemo();
  const s = getSociety(meeting.societyId);
  if (!s) return null;
  const today = meeting.date === DEMO_TODAY;
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-soft">
      <SocietyAvatar society={s} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{meeting.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          <CalendarClock className="mr-1 inline size-3" />{today ? "Today" : formatDate(meeting.date ?? DEMO_TODAY)} · {meeting.start} · {s.shortName}{meeting.host ? ` · hosted by ${meeting.host}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <InviteDialog roomId={meeting.id} roomName={meeting.name} societyName={s.name}>
          <Button size="icon" variant="ghost" className="size-8" aria-label={`Share invite for ${meeting.name}`}><QrCode className="size-4" /></Button>
        </InviteDialog>
        <Button asChild size="sm" variant="outline"><Link to="/call/$roomId" params={{ roomId: meeting.id }}><Video />Join</Link></Button>
      </div>
    </div>
  );
}

export function RecapCard({ recap }: { recap: CallRecap }) {
  const { getSociety } = useDemo();
  const s = getSociety(recap.societyId);
  return (
    <Link to="/recaps/$recapId" params={{ recapId: recap.id }} className="card-interactive block rounded-xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="size-3.5 text-primary" />{s?.shortName} · {formatDate(recap.date)} · {Math.round(recap.durationSec / 60)} min
        {recap.shared && <span className="ml-auto flex items-center gap-1"><Share2 className="size-3" />Shared</span>}
      </div>
      <p className="mt-2 text-sm font-semibold">{recap.title}</p>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{recap.summary.overview}</p>
      <p className="mt-2 text-xs text-muted-foreground">{recap.summary.actionItems.length} action items · {recap.participants.length} people</p>
    </Link>
  );
}

export function ScheduleCallDialog({ defaultSocietyId }: { defaultSocietyId?: string }) {
  const { joinedSocieties, scheduleMeeting, user } = useDemo();
  const [open, setOpen] = useState(false);
  const [societyId, setSocietyId] = useState(defaultSocietyId ?? joinedSocieties[0]?.id ?? "");
  const [name, setName] = useState("");
  const [date, setDate] = useState(DEMO_TODAY);
  const [start, setStart] = useState("18:00");
  const [description, setDescription] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus />Schedule a call</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Schedule a call</DialogTitle></DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !societyId) return;
            scheduleMeeting({ societyId, name: name.trim(), date, start, description: description.trim() || "Society call", host: user.name });
            toast.success("Call scheduled — members have been notified");
            setOpen(false);
            setName(""); setDescription("");
          }}
        >
          <div className="space-y-1.5">
            <Label>Society</Label>
            <Select value={societyId} onValueChange={setSocietyId}>
              <SelectTrigger><SelectValue placeholder="Choose a society" /></SelectTrigger>
              <SelectContent>{joinedSocieties.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="call-name">Title</Label><Input id="call-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly committee catch-up" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="call-date">Date</Label><Input id="call-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="call-time">Time</Label><Input id="call-time" type="time" value={start} onChange={(e) => setStart(e.target.value)} required /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="call-desc">What's it about?</Label><Textarea id="call-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <DialogFooter><Button type="submit" disabled={!societyId}>Schedule</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
