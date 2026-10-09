import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, QrCode, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { CallExperience } from "@/components/call-experience";
import { EmptyState } from "@/components/cards";
import { Button } from "@/components/ui/button";
import { GUEST_NAME_KEY, cleanGuestName } from "@/lib/invite";
import type { CallRecap, Society } from "@/lib/types";
import { SocietyAvatar } from "@/components/society-avatar";

export const Route = createFileRoute("/join/$roomId")({
  head: () => ({
    meta: [
      { title: "Join the call · SocConnect" },
      { name: "description", content: "Open a SocConnect call straight from a shared link or QR code — no sign-in needed." },
      { property: "og:title", content: "Join the call · SocConnect" },
      { property: "og:description", content: "Open a SocConnect call straight from a shared link or QR code — no sign-in needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JoinPage,
});

/**
 * The page a QR code or shared call link opens: the call on its own, like Zoom's
 * "Join meeting" screen. No menu, no sign-in, no membership check — you type a
 * name and you're in. After leaving, the AI recap appears right here.
 */
function JoinPage() {
  const { roomId } = Route.useParams();
  const { getRoom, getSociety, recaps } = useDemo();
  const room = getRoom(roomId);
  const society = room ? getSociety(room.societyId) : undefined;

  const [defaultName, setDefaultName] = useState("Guest");
  const [recapId, setRecapId] = useState<string | null>(null);
  const recap = recapId ? recaps.find((r) => r.id === recapId) : undefined;

  // Read the remembered name only on the client, so the page never renders different text on the server.
  useEffect(() => {
    const saved = cleanGuestName(localStorage.getItem(GUEST_NAME_KEY) ?? "");
    if (saved) setDefaultName(saved);
  }, []);

  if (!room || !society) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <EmptyState title="This call link no longer works" body="The room may have been removed. Ask whoever sent it for a fresh link." />
        <div className="mt-4 text-center">
          <Button asChild variant="outline"><Link to="/welcome">Go to SocConnect</Link></Button>
        </div>
      </div>
    );
  }

  const remember = (name: string) => {
    const clean = cleanGuestName(name) || "Guest";
    localStorage.setItem(GUEST_NAME_KEY, clean);
    setDefaultName(clean);
  };

  if (recap) return <GuestRecap recap={recap} society={society} onJoinAgain={() => setRecapId(null)} />;

  return <CallExperience room={room} society={society} guest defaultName={defaultName} onName={remember} onEnded={setRecapId} />;
}

/** Recap shown to someone who joined from a link: the call's own page, not the full app. */
function GuestRecap({ recap, society, onJoinAgain }: { recap: CallRecap; society: Society; onJoinAgain: () => void }) {
  const mins = Math.max(1, Math.round(recap.durationSec / 60));
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="mb-6 text-center font-display text-sm font-semibold tracking-tight text-muted-foreground">
        SocConnect <span className="opacity-50">·</span> {society.shortName}
      </p>

      <div className="rounded-2xl border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex items-start gap-4">
          <SocietyAvatar society={society} size="md" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium text-success"><CheckCircle2 className="size-4" />AI recap ready</p>
            <h1 className="mt-1 font-display text-xl font-semibold sm:text-2xl">{recap.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mins} min · {recap.participants.join(", ")} · {recap.transcript.length} captioned lines
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <section>
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h2>
            <p className="mt-2 text-sm leading-relaxed">{recap.summary.overview}</p>
          </section>

          {recap.summary.topics.length > 0 && (
            <section>
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">Topics</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {recap.summary.topics.map((t) => <span key={t} className="rounded-full bg-surface px-3 py-1 text-xs">{t}</span>)}
              </div>
            </section>
          )}

          {recap.summary.decisions.length > 0 && (
            <section>
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">Decisions</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {recap.summary.decisions.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </section>
          )}

          {recap.summary.actionItems.length > 0 && (
            <section>
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">Action items</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {recap.summary.actionItems.map((a, i) => (
                  <li key={i}><span className="font-medium">{a.owner}</span> — {a.task}</li>
                ))}
              </ul>
            </section>
          )}

          <details className="rounded-xl border bg-surface p-4">
            <summary className="cursor-pointer text-sm font-medium">Full transcript ({recap.transcript.length})</summary>
            <div className="mt-3 space-y-2 text-sm">
              {recap.transcript.map((l, i) => (
                <p key={i}><span className="font-semibold">{l.speaker}</span> <span className="text-xs text-muted-foreground">{Math.floor(l.at / 60)}:{String(l.at % 60).padStart(2, "0")}</span><br />{l.text}</p>
              ))}
            </div>
          </details>
        </div>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={onJoinAgain}><Video />Join the call again</Button>
          <Button asChild variant="outline" className="flex-1"><Link to="/welcome"><QrCode />Find your societies</Link></Button>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">This recap is saved in this browser. To keep it, share the summary with your group before you close the tab.</p>
      </div>
    </div>
  );
}
