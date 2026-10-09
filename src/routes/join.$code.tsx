import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CallExperience } from "@/components/call-experience";
import { EmptyState } from "@/components/cards";
import { Button } from "@/components/ui/button";
import { GUEST_NAME_KEY, cleanGuestName } from "@/lib/invite";
import { lookupGuestInvite } from "@/lib/livekit.functions";
import type { CallRoom, Society, SocietyAccent } from "@/lib/types";

export const Route = createFileRoute("/join/$code")({
  head: () => ({
    meta: [
      { title: "Join the call · SocConnect" },
      { name: "description", content: "Join a SocConnect society call from a guest link or QR code." },
      { property: "og:title", content: "Join the call · SocConnect" },
      { property: "og:description", content: "Join a SocConnect society call from a guest link or QR code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JoinPage,
});

type Lookup = Awaited<ReturnType<typeof lookupGuestInvite>>;

/** A committee-made guest link: checked on the server (hashed code, expiry, use limit). */
function JoinPage() {
  const { code } = Route.useParams();
  const lookup = useServerFn(lookupGuestInvite);
  const [info, setInfo] = useState<Lookup | null>(null);
  const [defaultName, setDefaultName] = useState("Guest");
  const [left, setLeft] = useState(false);

  useEffect(() => {
    const saved = cleanGuestName(localStorage.getItem(GUEST_NAME_KEY) ?? "");
    if (saved) setDefaultName(saved);
    const clean = code.trim().toLowerCase();
    if (!/^[a-z0-9]{8,32}$/.test(clean)) { setInfo({ ok: false, reason: "This call link isn't valid. Ask whoever sent it for a new one." }); return; }
    lookup({ data: { code: clean } }).then(setInfo, () => setInfo({ ok: false, reason: "Couldn't check this link. Try again in a moment." }));
  }, [code, lookup]);

  if (!info) return <div className="flex min-h-dvh items-center justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>;
  if (!info.ok) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <EmptyState title="This call link doesn't work" body={info.reason} />
        <div className="mt-4 text-center"><Button asChild variant="outline"><Link to="/welcome">Go to SocConnect</Link></Button></div>
      </div>
    );
  }

  const society: Society = {
    id: "guest", name: info.societyName, shortName: info.societyShort, category: "", tagline: "", description: "", icon: info.icon,
    accent: info.accent as SocietyAccent, memberCount: 0, tags: [], committee: [], requiresApproval: false, meets: "",
  };
  const room: CallRoom = { id: "guest", societyId: "guest", name: info.roomName, kind: "room", description: "Guest call" };

  if (left) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Thanks for joining</h1>
        <p className="mt-2 text-sm text-muted-foreground">The {info.societyShort} committee can share the call's recap with you.</p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => setLeft(false)}><Video />Join the call again</Button>
          <Button asChild variant="outline"><Link to="/welcome">Find your societies</Link></Button>
        </div>
      </div>
    );
  }

  const remember = (name: string) => {
    const clean = cleanGuestName(name) || "Guest";
    localStorage.setItem(GUEST_NAME_KEY, clean);
    setDefaultName(clean);
  };

  return <CallExperience room={room} society={society} guest inviteCode={code.trim().toLowerCase()} defaultName={defaultName} onName={remember} onEnded={() => setLeft(true)} />;
}
