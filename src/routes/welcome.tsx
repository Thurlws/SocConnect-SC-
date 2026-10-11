import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Compass, MessagesSquare, Waypoints, Mail, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { pageHead } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { emailAllowed, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SocietyAvatar, SocietyBanner } from "@/components/society-avatar";
import { cn } from "@/lib/utils";
import type { Society } from "@/lib/types";

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

/**
 * Real societies from the official TU Dublin import, shown to signed-out visitors
 * (who can't read the database). No made-up events or posts here.
 */
const showcase: Pick<Society, "name" | "shortName" | "category" | "campus" | "icon" | "accent" | "logoUrl" | "bannerUrl">[] = [
  { name: "Photo Society", shortName: "Photo Society", category: "Student Media", campus: "City", icon: "Camera", accent: "rose",
    logoUrl: "https://societies.tudublin.ie/admin/uploads/images/organisation/profile/logo1_1632311075_th.jpg",
    bannerUrl: "https://societies.tudublin.ie/admin/uploads/images/organisation/profile/banner1_1632311080_th.jpg" },
  { name: "Formula Student Society", shortName: "Formula Student", category: "Academic/Course Related", campus: "Tallaght", icon: "Cog", accent: "sky",
    logoUrl: "https://societies.tudublin.ie/admin/uploads/images/organisation/profile/Logo_1698531278_th.png",
    bannerUrl: "https://societies.tudublin.ie/admin/uploads/images/organisation/profile/fa9c22ea-22dd-4e20-b271-5e5af39ba6a4_1722360270_th.JPG" },
  { name: "Ethical Hackers Society", shortName: "Ethical Hackers", category: "Gaming/Technology", campus: "Blanchardstown", icon: "Code2", accent: "indigo",
    logoUrl: "https://societies.tudublin.ie/admin/uploads/images/organisation/profile/android-chrome-512x512_1733823656_th.png",
    bannerUrl: "https://societies.tudublin.ie/admin/uploads/images/organisation/profile/oldbanner_1733823715_th.png" },
  { name: "Korean Society", shortName: "Korean Society", category: "Arts/Cultural/Languages", campus: "City", icon: "Globe2", accent: "coral",
    logoUrl: "https://societies.tudublin.ie/admin/uploads/images/organisation/profile/bannerinsta_1696117352_th.jpg",
    bannerUrl: "https://societies.tudublin.ie/admin/uploads/images/organisation/profile/KSocJPG_1726690707_th.jpg" },
];

function SocietyPreview() {
  return (
    <div aria-label="Some of the societies on SocConnect" className="overflow-hidden rounded-2xl border bg-card shadow-lift">
      <div className="border-b px-5 py-4">
        <h2 className="font-display text-[15px] font-semibold">Societies across every campus</h2>
        <p className="text-xs text-muted-foreground">Sign in to join them and see what they have on</p>
      </div>
      <ul className="grid gap-4 p-5 sm:grid-cols-2">
        {showcase.map((s, i) => (
          <li key={s.name} className={cn("overflow-hidden rounded-xl border bg-card", i > 1 && "hidden sm:block")}>
            <SocietyBanner society={s} className="h-20" />
            <div className="px-4 pb-4">
              <SocietyAvatar society={s} size="md" className="-mt-6 border-4 border-card bg-card" />
              <p className="mt-2 font-display text-[15px] font-semibold leading-snug">{s.shortName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.category}, {s.campus} campus</p>
            </div>
          </li>
        ))}
      </ul>
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
        <SocietyPreview />
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
