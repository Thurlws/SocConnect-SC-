import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, FileText, Hash, Lock, Megaphone, Pin, Send, CalendarClock, Users, Link2, ClipboardList, BookOpen } from "lucide-react";
import { useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { societies as baseSocieties, channels, resources, DEMO_TODAY } from "@/data/mock";
import { timeAgo } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { SocietyAvatar, accentClasses } from "@/components/society-avatar";
import { EventCard, EmptyState } from "@/components/cards";
import { JoinButton } from "@/components/join-button";
import { MeetingCard, RecapCard, RoomCard, ScheduleCallDialog } from "@/components/calls";
import { callRooms } from "@/data/calls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/societies/$societyId")({
  loader: ({ params }) => {
    const s = baseSocieties.find((x) => x.id === params.societyId);
    if (!s) throw notFound();
    return { name: s.name, tagline: s.tagline };
  },
  head: ({ loaderData }) =>
    loaderData ? pageHead(loaderData.name, loaderData.tagline) : { meta: [{ title: "Society not found" }, { name: "robots", content: "noindex" }] },
  component: SocietyPage,
});

const resIcon = { Guide: BookOpen, Link: Link2, Document: FileText, Form: ClipboardList };

function SocietyPage() {
  const { societyId } = Route.useParams();
  const { getSociety, membership, announcements, events, messages, postMessage, user, meetings, recaps } = useDemo();
  const s = getSociety(societyId)!;
  const isMember = membership(s.id) === "member";
  const a = accentClasses[s.accent];
  const socAnn = announcements.filter((x) => x.societyId === s.id);
  const socEvents = events.filter((e) => e.societyId === s.id && e.date >= DEMO_TODAY);
  const socChannels = channels.filter((c) => c.societyId === s.id);
  const [channel, setChannel] = useState(socChannels[0]?.id);
  const [draft, setDraft] = useState("");
  const socRes = resources.filter((r) => r.societyId === s.id);

  const MembersOnly = ({ what }: { what: string }) => (
    <EmptyState icon={Lock} title={`${what} are for members`} body={`Join ${s.shortName} to take part.`} action={<JoinButton society={s} />} />
  );

  return (
    <div>
      <Link to="/societies" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />All societies</Link>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <div className={cn("h-28 sm:h-36", a.soft)}>
          <div className={cn("h-full w-full opacity-30 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:16px_16px]", a.text)} />
        </div>
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-10 flex items-end gap-4">
            <SocietyAvatar society={s} size="lg" className="border-4 border-card bg-card" />
            <div className="pb-1">
              <h1 className="text-2xl font-semibold">{s.name}</h1>
              <p className="text-sm text-muted-foreground">{s.category} · {s.memberCount + (isMember ? 0 : 0)} members · {s.meets}</p>
            </div>
          </div>
          <JoinButton society={s} size="default" />
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="h-auto flex-wrap justify-start bg-transparent p-0">
          {["overview", "announcements", "discussions", "calls", "events", "resources", "members"].map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-full capitalize data-[state=active]:bg-primary-soft data-[state=active]:text-primary data-[state=active]:shadow-none">{t}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border bg-card p-6 shadow-soft">
              <p className={cn("text-sm font-semibold", a.text)}>{s.tagline}</p>
              <p className="mt-3 leading-relaxed text-muted-foreground">{s.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">{s.tags.map((t) => <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{t}</span>)}</div>
            </div>
            {socEvents[0] && <div><p className="mb-3 text-sm font-semibold">Next up</p><div className="max-w-sm"><EventCard event={socEvents[0]} /></div></div>}
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-5 shadow-soft">
              <p className="text-sm font-semibold">Committee</p>
              <ul className="mt-3 space-y-3">
                {s.committee.map((c) => (
                  <li key={c.name} className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">{c.name.split(" ").map((p) => p[0]).join("")}</span>
                    <span><span className="block text-sm font-medium">{c.name}</span><span className="block text-xs text-muted-foreground">{c.position}</span></span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-card p-5 text-sm shadow-soft">
              <p className="font-semibold">Joining</p>
              <p className="mt-1 text-muted-foreground">{s.requiresApproval ? "Membership requests are reviewed by the committee." : "Open to all students — join instantly."}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="announcements" className="mt-6 space-y-3">
          {socAnn.length === 0 && <EmptyState icon={Megaphone} title="No announcements yet" body="The committee hasn't posted anything yet." />}
          {socAnn.map((x) => (
            <article key={x.id} className="rounded-xl border bg-card p-5 shadow-soft">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Megaphone className={cn("size-3.5", a.text)} />{x.author} · {timeAgo(x.createdAt)}
                {x.pinned && <span className="flex items-center gap-1 font-medium text-primary"><Pin className="size-3" />Pinned</span>}
              </p>
              <h3 className="mt-2 font-semibold">{x.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{x.body}</p>
            </article>
          ))}
        </TabsContent>

        <TabsContent value="discussions" className="mt-6">
          {!isMember ? <MembersOnly what="Discussions" /> : (
            <div className="grid overflow-hidden rounded-xl border bg-card shadow-soft md:grid-cols-[220px_1fr]">
              <div className="border-b bg-surface p-3 md:border-b-0 md:border-r">
                <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Channels</p>
                {socChannels.map((c) => (
                  <button key={c.id} onClick={() => setChannel(c.id)} className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm", channel === c.id ? "bg-card font-semibold text-primary shadow-soft" : "text-muted-foreground hover:bg-card")}>
                    <Hash className="size-3.5" />{c.name}
                  </button>
                ))}
              </div>
              <div className="flex h-[460px] flex-col">
                <div className="border-b px-5 py-3">
                  <p className="font-semibold">#{socChannels.find((c) => c.id === channel)?.name}</p>
                  <p className="text-xs text-muted-foreground">{socChannels.find((c) => c.id === channel)?.description}</p>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                  {messages.filter((m) => m.channelId === channel).length === 0 && <p className="text-center text-sm text-muted-foreground">No messages yet — start the conversation.</p>}
                  {messages.filter((m) => m.channelId === channel).map((m) => (
                    <div key={m.id} className="flex gap-3">
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", m.author === user.name ? "bg-ink text-ink-foreground" : "bg-muted")}>{m.author.split(" ").map((p) => p[0]).join("")}</span>
                      <div>
                        <p className="text-sm"><span className="font-semibold">{m.author}</span> <span className="text-xs text-muted-foreground">{timeAgo(m.createdAt)}</span></p>
                        <p className="whitespace-pre-line text-sm text-foreground/90">{m.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form
                  className="flex gap-2 border-t p-3"
                  onSubmit={(e) => { e.preventDefault(); if (draft.trim() && channel) { postMessage(channel, draft.trim()); setDraft(""); } }}
                >
                  <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message…" />
                  <Button type="submit" size="icon" aria-label="Send"><Send /></Button>
                </form>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calls" className="mt-6">
          {!isMember ? <MembersOnly what="Calls" /> : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Drop into a room any time, or schedule a call. Every call gets an AI recap.</p>
                <ScheduleCallDialog defaultSocietyId={s.id} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">{callRooms.filter((r) => r.societyId === s.id).map((r) => <RoomCard key={r.id} room={r} />)}</div>
              {meetings.some((m) => m.societyId === s.id && (m.date ?? "") >= DEMO_TODAY) && (
                <div><p className="mb-3 text-sm font-semibold">Upcoming calls</p><div className="grid gap-3 md:grid-cols-2">{meetings.filter((m) => m.societyId === s.id && (m.date ?? "") >= DEMO_TODAY).map((m) => <MeetingCard key={m.id} meeting={m} />)}</div></div>
              )}
              {recaps.some((r) => r.societyId === s.id) && (
                <div><p className="mb-3 text-sm font-semibold">Recaps</p><div className="grid gap-3 md:grid-cols-2">{recaps.filter((r) => r.societyId === s.id).map((r) => <RecapCard key={r.id} recap={r} />)}</div></div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          {socEvents.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{socEvents.map((e) => <EventCard key={e.id} event={e} />)}</div>
            : <EmptyState icon={CalendarClock} title="No upcoming events" body="Check back soon — new events are added regularly." />}
        </TabsContent>

        <TabsContent value="resources" className="mt-6">
          {!isMember ? <MembersOnly what="Resources" /> : socRes.length === 0 ? <EmptyState icon={FileText} title="No resources yet" body="Guides and links shared by the committee will appear here." /> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {socRes.map((r) => { const I = resIcon[r.kind]; return (
                <div key={r.id} className="flex gap-3 rounded-xl border bg-card p-4 shadow-soft">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><I className="size-4" /></span>
                  <div><p className="text-sm font-semibold">{r.title}</p><p className="text-xs text-muted-foreground">{r.kind} · {r.description}</p></div>
                </div>
              ); })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-3"><Users className="size-5 text-primary" /><p className="font-semibold">{s.memberCount} members <span className="text-xs font-normal text-muted-foreground">(demo figure)</span></p></div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[...s.committee.map((c) => c.name), ...(isMember ? [user.name] : []), "Aisha Bello", "Kevin Doherty", "Hana Sato", "Sam Okafor"].map((n, i) => (
                <span key={`${n}-${i}`} className="rounded-full border bg-surface px-3 py-1 text-xs">{n}</span>
              ))}
              <span className="rounded-full px-3 py-1 text-xs text-muted-foreground">+ {s.memberCount - 8} more</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
