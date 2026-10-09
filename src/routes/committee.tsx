import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarPlus, Check, Megaphone, PencilLine, ShieldCheck, UserPlus, Users, X, CalendarDays, BookmarkCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDemo } from "@/lib/demo-store";
import { DEMO_TODAY, proposals } from "@/data/mock";
import { pageHead } from "@/lib/seo";
import { timeAgo } from "@/lib/format";
import { PageHeader, EmptyState, DemoBadge } from "@/components/cards";
import { SocietyAvatar } from "@/components/society-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { eventCategories, type EventInput } from "@/lib/demo-rules";

export const Route = createFileRoute("/committee")({
  head: () => pageHead("Committee Dashboard", "Manage your society: announcements, events, members and profile."),
  component: Committee,
});

function Committee() {
  const d = useDemo();
  const [modal, setModal] = useState<null | "ann" | "event" | "edit">(null);
  if (d.role !== "committee" || !d.user.committeeSocietyId) {
    return (
      <EmptyState icon={ShieldCheck} title="Committee access only" body="This area is for society committee members. In the demo you can switch to Jordan Lee, CompSoc President."
        action={<Button onClick={() => { d.setRole("committee"); toast.success("Now viewing as Jordan Lee (committee)"); }}>Switch to committee demo</Button>} />
    );
  }
  const s = d.getSociety(d.user.committeeSocietyId)!;
  const reqs = d.requests.filter((r) => r.societyId === s.id);
  const resolved = d.resolvedRequests.filter((r) => r.societyId === s.id);
  const upcoming = d.events.filter((e) => e.societyId === s.id && e.date >= DEMO_TODAY);
  const anns = d.announcements.filter((a) => a.societyId === s.id);
  const saved = proposals.filter((p) => d.savedProposals.includes(p.id));

  return (
    <div className="space-y-8">
      <PageHeader title={`${s.shortName} committee`} subtitle={`You're managing ${s.name} as ${s.committee[0]?.position ?? "committee member"}.`}
        actions={<Button variant="outline" asChild><Link to="/societies/$societyId" params={{ societyId: s.id }}>View public page</Link></Button>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Members", v: s.memberCount, icon: Users },
          { l: "Pending requests", v: reqs.length, icon: UserPlus },
          { l: "Upcoming events", v: upcoming.length, icon: CalendarDays },
          { l: "Announcements", v: anns.length, icon: Megaphone },
        ].map((x) => (
          <div key={x.l} className="rounded-xl border bg-card p-5 shadow-soft">
            <x.icon className="size-4 text-primary" />
            <p className="mt-3 font-display text-3xl font-semibold">{x.v}</p>
            <p className="text-xs text-muted-foreground">{x.l}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { k: "ann" as const, l: "Post announcement", d: "Members' feeds and notifications", icon: Megaphone },
          { k: "event" as const, l: "Create event", d: "Publish to the events page", icon: CalendarPlus },
          { k: "edit" as const, l: "Edit society profile", d: "Name, tagline and description", icon: PencilLine },
        ].map((q) => (
          <button key={q.k} onClick={() => setModal(q.k)} className="card-interactive flex items-center gap-4 rounded-xl border bg-card p-4 text-left shadow-soft">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary"><q.icon className="size-5" /></span>
            <span><span className="block font-semibold">{q.l}</span><span className="text-xs text-muted-foreground">{q.d}</span></span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 shadow-soft">
          <h2 className="font-semibold">Membership requests</h2>
          <div className="mt-4 space-y-3">
            {reqs.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">All caught up — no pending requests.</p>}
            {reqs.map((r) => (
              <div key={r.id} className="flex items-start gap-3 rounded-lg border p-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">{r.name.split(" ").map((p) => p[0]).join("")}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{r.name} <span className="font-normal text-muted-foreground">· {r.course}</span></p>
                  {r.message && <p className="text-sm text-muted-foreground">“{r.message}”</p>}
                  <p className="text-[11px] text-muted-foreground">{timeAgo(r.requestedAt)}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" aria-label={`Decline ${r.name}`} onClick={() => { const o = d.resolveRequest(r.id, "decline"); if (o.ok) toast(`Declined ${r.name} — they were not added as a member`); else toast.error(o.error); }}><X /></Button>
                  <Button size="icon" aria-label={`Approve ${r.name}`} onClick={() => { const o = d.resolveRequest(r.id, "approve"); if (o.ok) toast.success(`${r.name} is now a member of ${s.shortName}`); else toast.error(o.error); }}><Check /></Button>
                </div>
              </div>
            ))}
          </div>
          {resolved.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold">Recently reviewed</h3>
              <ul className="mt-2 space-y-1.5">
                {resolved.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{r.name} <span className="text-muted-foreground">· {r.course}</span></span>
                    <span className={r.outcome === "approved" ? "shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success" : "shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"}>
                      {r.outcome === "approved" ? "Approved" : "Declined"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        <section className="rounded-xl border bg-card p-5 shadow-soft">
          <h2 className="font-semibold">Upcoming events</h2>
          <div className="mt-4 space-y-2">
            {upcoming.map((e) => (
              <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }} className="flex items-center justify-between rounded-lg border p-3 hover:border-primary/30">
                <span><span className="block text-sm font-semibold">{e.title}</span><span className="text-xs text-muted-foreground">{e.date} · {e.start} · {e.venue}</span></span>
                <span className="text-xs text-muted-foreground">{d.attendeeCount(e)}{e.capacity ? `/${e.capacity}` : ""}</span>
              </Link>
            ))}
          </div>
          {saved.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold">Saved collaboration ideas</h3>
              <div className="mt-2 space-y-2">{saved.map((p) => <Link key={p.id} to="/society-pulse" className="flex items-center gap-2 rounded-lg bg-primary-soft/50 p-2.5 text-sm"><BookmarkCheck className="size-4 text-primary" />{p.title}</Link>)}</div>
            </>
          )}
        </section>
      </div>

      <AnnouncementDialog open={modal === "ann"} onClose={() => setModal(null)} societyId={s.id} />
      <EventDialog open={modal === "event"} onClose={() => setModal(null)} societyId={s.id} />
      <EditDialog open={modal === "edit"} onClose={() => setModal(null)} societyId={s.id} />
    </div>
  );
}

function AnnouncementDialog({ open, onClose, societyId }: { open: boolean; onClose: () => void; societyId: string }) {
  const { postAnnouncement } = useDemo();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>New announcement</DialogTitle><DialogDescription>Shown on the society page, members' feeds and their in-app notifications. <DemoBadge /> Saved in this browser only.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const o = postAnnouncement(societyId, { title, body, pinned });
          if (!o.ok) { setErr(o.error); return; }
          toast.success("Announcement published");
          setTitle(""); setBody(""); setPinned(false); setErr(""); onClose();
        }}>
          <div className="space-y-1.5"><Label htmlFor="at">Title</Label><Input id="at" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} /></div>
          <div className="space-y-1.5"><Label htmlFor="ab">Message</Label><Textarea id="ab" rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} /></div>
          <div className="flex items-center gap-2"><Switch id="ap" checked={pinned} onCheckedChange={setPinned} /><Label htmlFor="ap">Pin to top</Label></div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Publish</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EventDialog({ open, onClose, societyId }: { open: boolean; onClose: () => void; societyId: string }) {
  const { createEvent } = useDemo();
  const navigate = useNavigate();
  const [f, setF] = useState({ title: "", description: "", date: "2026-11-12", start: "18:00", end: "20:00", venue: "", category: "Workshop", capacity: "40" });
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create event</DialogTitle><DialogDescription>Published immediately to the events page. <DemoBadge /></DialogDescription></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault();
          const o = createEvent(societyId, {
            title: f.title, description: f.description, date: f.date, start: f.start, end: f.end || undefined, venue: f.venue,
            category: f.category as EventInput["category"],
            capacity: f.capacity.trim() === "" ? undefined : Number(f.capacity),
          });
          if (!o.ok) { setErr(o.error); return; }
          toast.success("Event published");
          setErr(""); onClose();
          if (o.id) navigate({ to: "/events/$eventId", params: { eventId: o.id } });
        }}>
          <div className="space-y-1.5"><Label>Title</Label><Input value={f.title} onChange={set("title")} maxLength={100} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} value={f.description} onChange={set("description")} maxLength={1000} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={f.date} onChange={set("date")} /></div>
            <div className="space-y-1.5"><Label>Start</Label><Input type="time" value={f.start} onChange={set("start")} /></div>
            <div className="space-y-1.5"><Label>End</Label><Input type="time" value={f.end} onChange={set("end")} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1.5"><Label>Venue</Label><Input value={f.venue} onChange={set("venue")} /></div>
            <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" min={1} step={1} value={f.capacity} onChange={set("capacity")} placeholder="No limit" /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{eventCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Publish event</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ open, onClose, societyId }: { open: boolean; onClose: () => void; societyId: string }) {
  const { getSociety, editSociety } = useDemo();
  const s = getSociety(societyId)!;
  const [f, setF] = useState({ tagline: s.tagline, description: s.description, meets: s.meets });
  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) setF({ tagline: s.tagline, description: s.description, meets: s.meets }); else onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><SocietyAvatar society={s} size="sm" />Edit {s.shortName}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const o = editSociety(societyId, f); if (!o.ok) { toast.error(o.error); return; } toast.success("Society profile updated"); onClose(); }}>
          <div className="space-y-1.5"><Label>Tagline</Label><Input value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} maxLength={80} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={5} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={800} /></div>
          <div className="space-y-1.5"><Label>When & where you meet</Label><Input value={f.meets} onChange={(e) => setF({ ...f, meets: e.target.value })} maxLength={80} /></div>
          <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Save changes</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
