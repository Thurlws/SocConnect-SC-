import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Hash, Inbox, Megaphone, Bookmark } from "lucide-react";
import { useMemo, useState } from "react";
import { useData } from "@/lib/api/store";
import { todayIso } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { formatDate, timeAgo } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/cards";
import { SocietyAvatar, accentClasses } from "@/components/society-avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/communications")({
  head: () => pageHead("Communications", "Every announcement, event update and discussion from your societies in one feed."),
  component: Comms,
});

type Kind = "announcement" | "event" | "discussion";
type Item = { id: string; kind: Kind; societyId: string; title: string; body: string; at: string; to: { to: string; params: Record<string, string> } };

function Comms() {
  const { announcements, events, messages, joinedSocieties, getSociety, channels } = useData();
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [soc, setSoc] = useState("all");
  const [saved, setSaved] = useState<string[]>([]);
  const joined = new Set(joinedSocieties.map((s) => s.id));

  const items = useMemo<Item[]>(() => {
    const ann: Item[] = announcements.filter((a) => joined.has(a.societyId)).map((a) => ({ id: a.id, kind: "announcement", societyId: a.societyId, title: a.title, body: a.body, at: a.createdAt, to: { to: "/societies/$societyId", params: { societyId: a.societyId } } }));
    const ev: Item[] = events.filter((e) => joined.has(e.societyId) && e.date >= todayIso()).map((e) => ({ id: e.id, kind: "event", societyId: e.societyId, title: e.title, body: `${formatDate(e.date)} · ${e.start} · ${e.venue}`, at: `${e.date}T${e.start}:00`, to: { to: "/events/$eventId", params: { eventId: e.id } } }));
    const dis: Item[] = messages.map((m) => ({ m, c: channels.find((c) => c.id === m.channelId)! })).filter(({ c }) => c && joined.has(c.societyId)).map(({ m, c }) => ({ id: m.id, kind: "discussion", societyId: c.societyId, title: `${m.author} in #${c.name}`, body: m.body, at: m.createdAt, to: { to: "/societies/$societyId", params: { societyId: c.societyId } } }));
    return [...ann, ...ev, ...dis].sort((a, b) => b.at.localeCompare(a.at));
  }, [announcements, events, messages, joined]);

  const filtered = items.filter((i) => (kind === "all" || i.kind === kind) && (soc === "all" || i.societyId === soc));
  const kinds = [
    { k: "all", l: "All", icon: Inbox },
    { k: "announcement", l: "Announcements", icon: Megaphone },
    { k: "event", l: "Event updates", icon: CalendarDays },
    { k: "discussion", l: "Discussions", icon: Hash },
  ] as const;

  return (
    <div>
      <PageHeader title="Communications" subtitle="One feed instead of five group chats. Everything from your societies, newest first." />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {kinds.map(({ k, l, icon: I }) => (
            <button key={k} onClick={() => setKind(k)} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium", kind === k ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
              <I className="size-3.5" />{l} <span className="opacity-70">{k === "all" ? items.length : items.filter((i) => i.kind === k).length}</span>
            </button>
          ))}
        </div>
        <Select value={soc} onValueChange={setSoc}>
          <SelectTrigger className="bg-card sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All my societies</SelectItem>
            {joinedSocieties.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="mx-auto max-w-3xl space-y-3">
        {filtered.length === 0 && <EmptyState icon={Inbox} title="Nothing here yet" body="Join societies to fill your feed, or try a different filter." />}
        {filtered.map((i) => {
          const s = getSociety(i.societyId)!;
          return (
            <div key={`${i.kind}-${i.id}`} className={cn("relative flex gap-4 rounded-xl border bg-card p-4 shadow-soft", i.kind === "announcement" && "border-l-4 border-l-primary")}>
              <SocietyAvatar society={s} size="sm" />
              <Link to={i.to.to} params={i.to.params as never} className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn("font-semibold", accentClasses[s.accent].text)}>{s.shortName}</span>
                  <Badge variant={i.kind === "announcement" ? "soft" : i.kind === "event" ? "teal" : "outline"}>{i.kind === "event" ? "Event" : i.kind === "announcement" ? "Announcement" : "Discussion"}</Badge>
                  <span>{i.kind === "event" ? "Upcoming" : timeAgo(i.at)}</span>
                </div>
                <p className="mt-1.5 font-semibold">{i.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{i.body}</p>
              </Link>
              <button aria-label="Save" onClick={() => setSaved((x) => (x.includes(i.id) ? x.filter((y) => y !== i.id) : [...x, i.id]))} className={cn("self-start rounded-md p-1.5 text-muted-foreground hover:bg-muted", saved.includes(i.id) && "text-primary")}>
                <Bookmark className={cn("size-4", saved.includes(i.id) && "fill-current")} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
