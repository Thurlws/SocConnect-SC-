import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Check, Clock, Compass, MapPin, MessagesSquare, Users, Waypoints, Mail, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { pageHead } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { emailAllowed, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SocietyAvatar, accentClasses } from "@/components/society-avatar";
import { dayParts, formatDate, todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SocietyAccent } from "@/lib/types";

export const Route = createFileRoute("/welcome")({
  head: () => pageHead("Welcome", "Every TU Dublin society in one place. Join societies, register for events and get their announcements."),
  component: Welcome,
});

const features = [
  { icon: Compass, t: "Find a society", d: "Search every society by campus or interest and join from its page." },
  { icon: CalendarDays, t: "Go to events", d: "Register in one tap and see how many places are left." },
  { icon: MessagesSquare, t: "Hear from your societies", d: "Announcements and event changes from the societies you've joined, in one feed." },
  { icon: Waypoints, t: "For committees", d: "Manage members, post updates, and use Society Pulse to find societies to run joint events with." },
];

/** The first `weekday` (0 = Sunday) at least `minDays` after `fromIso`, so the preview never shows past dates. */
function upcomingWeekday(fromIso: string, weekday: number, minDays: number) {
  const d = new Date(`${fromIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + minDays);
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

type PreviewEvent = { society: string; icon: string; accent: SocietyAccent; title: string; date: string; time: string; venue: string; going: string; registered: boolean };

function PreviewEventCard({ e }: { e: PreviewEvent }) {
  const { day, month } = dayParts(e.date);
  const a = accentClasses[e.accent];
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className={cn("flex items-start justify-between p-4", a.soft)}>
        <div className="flex min-w-11 flex-col items-center rounded-lg bg-card px-2.5 py-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground">{month}</span>
          <span className="font-display text-xl font-semibold leading-none">{day}</span>
        </div>
        <SocietyAvatar society={{ name: e.society, icon: e.icon, accent: e.accent }} size="sm" className="bg-card" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className={cn("text-xs font-medium", a.text)}>{e.society}</p>
        <h3 className="font-display text-base font-semibold leading-snug">{e.title}</h3>
        <div className="mt-auto space-y-1 pt-2 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5"><Clock className="size-3.5" />{formatDate(e.date)}, {e.time}</p>
          <p className="flex items-center gap-1.5"><MapPin className="size-3.5" />{e.venue}</p>
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3.5" />{e.going}</span>
          {e.registered ? <Badge variant="soft"><Check className="size-3" />Registered</Badge> : <Badge variant="secondary">Open</Badge>}
        </div>
      </div>
    </div>
  );
}

/** A static example of the home page, in place of a picture. */
function HomePreview() {
  const today = todayIso();
  const walk = upcomingWeekday(today, 4, 2);
  const chess = upcomingWeekday(walk, 3, 1);
  const preview: PreviewEvent[] = [
    { society: "Photo Society", icon: "Camera", accent: "rose", title: "Night walk along the Liffey", date: walk, time: "19:00–21:00", venue: "Ha'penny Bridge, north side", going: "18 of 30", registered: true },
    { society: "Chess Society", icon: "Dices", accent: "emerald", title: "Rapid tournament", date: chess, time: "18:00–21:00", venue: "Grangegorman, Central Quad", going: "24 of 40", registered: false },
  ];
  return (
    <div aria-label="Example of the SocConnect home page" className="overflow-hidden rounded-2xl border bg-card shadow-lift">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="font-display text-[15px] font-semibold">Coming up for you</h2>
          <p className="text-xs text-muted-foreground">From your societies and registrations</p>
        </div>
        <span className="text-sm font-medium text-primary">All events</span>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {preview.map((e, i) => <div key={e.title} className={cn(i === 1 && "hidden sm:block")}><PreviewEventCard e={e} /></div>)}
        </div>
        <div className="flex gap-4 rounded-xl border bg-card p-4">
          <SocietyAvatar society={{ name: "Drama Society", icon: "Clapperboard", accent: "plum" }} size="sm" />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span className={cn("font-semibold", accentClasses.plum.text)}>Drama Society</span><span>Niamh, committee</span><span>2h ago</span>
            </p>
            <p className="mt-1 font-semibold">Auditions for the winter show</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Sign up for a slot by Friday. No experience needed, just bring a one-minute piece.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function friendly(msg: string) {
  return /database error|tu dublin/i.test(msg) ? "Please use your TU Dublin email (@mytudublin.ie)." : msg;
}

function SignInCard() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!emailAllowed(email)) return setError("Please use your TU Dublin email (@mytudublin.ie).");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) setError(friendly(error.message));
    else setSent(true);
  };

  const microsoft = async () => {
    setError("");
    const r = await lovable.auth.signInWithOAuth("microsoft", { redirect_uri: window.location.origin });
    if (r.error) setError(friendly(r.error.message ?? "Microsoft sign-in failed. Try your email instead."));
  };

  if (sent)
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-lift">
        <Mail className="size-6 text-primary" />
        <h2 className="mt-3 font-semibold">Check your inbox</h2>
        <p className="mt-1 text-sm text-muted-foreground">We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>. Open it on this device to continue.</p>
        <Button variant="ghost" className="mt-4 px-0" onClick={() => setSent(false)}>Use a different email</Button>
      </div>
    );

  return (
    <form onSubmit={sendLink} className="space-y-3 rounded-2xl border bg-card p-6 shadow-lift">
      <h2 className="font-semibold">Sign in with your university email</h2>
      <div className="space-y-1.5">
        <Label htmlFor="email">TU Dublin email</Label>
        <Input id="email" type="email" autoComplete="email" placeholder="you@mytudublin.ie" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Mail />}Email me a sign-in link</Button>
      <div className="relative py-1 text-center text-xs text-muted-foreground"><span className="bg-card px-2">or</span></div>
      <Button type="button" variant="outline" className="w-full" onClick={microsoft}>
        <svg viewBox="0 0 21 21" className="size-4" aria-hidden><path fill="#f25022" d="M0 0h10v10H0z" /><path fill="#7fba00" d="M11 0h10v10H11z" /><path fill="#00a4ef" d="M0 11h10v10H0z" /><path fill="#ffb900" d="M11 11h10v10H11z" /></svg>
        Sign in with Microsoft
      </Button>
      <p className="text-xs text-muted-foreground">Use your @mytudublin.ie or @tudublin.ie address.</p>
    </form>
  );
}

function Welcome() {
  const { ready, session } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && session) navigate({ to: "/" });
  }, [ready, session, navigate]);
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/welcome" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-primary-foreground"><Waypoints className="size-4" /></span>
          <span className="font-display text-lg font-semibold">SocConnect</span>
        </Link>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-8 lg:grid-cols-2 lg:pt-14">
        <div>
          <h1 className="max-w-[11ch] text-4xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl">Every TU Dublin society in one place</h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Browse the societies, join the ones you like and register for their events. Announcements come to you here instead of being spread across group chats and Instagram stories.
          </p>
          <div className="mt-8 max-w-md"><SignInCard /></div>
        </div>
        <HomePreview />
      </section>

      <section className="border-t bg-card">
        <ul className="mx-auto grid max-w-7xl gap-x-10 gap-y-7 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <li key={f.t} className="grid grid-cols-[1.25rem_1fr] gap-x-3 gap-y-1">
              <f.icon className="mt-0.5 size-5 text-primary" aria-hidden />
              <h3 className="font-sans text-[15px] font-semibold tracking-normal">{f.t}</h3>
              <p className="col-start-2 text-sm text-muted-foreground">{f.d}</p>
            </li>
          ))}
        </ul>
      </section>
      <footer className="mx-auto max-w-7xl px-6 py-8 text-xs text-muted-foreground">SocConnect, for TU Dublin societies.</footer>
    </div>
  );
}
