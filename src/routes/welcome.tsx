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
import hero from "@/assets/welcome-hero.jpg";

export const Route = createFileRoute("/welcome")({
  head: () => pageHead("Welcome", "One university. Every society. Connected. Discover societies, events and your community."),
  component: Welcome,
});

const features = [
  { icon: Compass, t: "Discover your community", d: "Browse every society by interest, size and vibe — and join in one tap." },
  { icon: MessagesSquare, t: "Stay connected", d: "Announcements, event updates and discussions in a single calm feed." },
  { icon: CalendarDays, t: "Find your next event", d: "Workshops, socials and trips from across campus, with simple registration." },
  { icon: Waypoints, t: "Help societies collaborate", d: "Society Pulse surfaces shared interests and ideas for joint events." },
];

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
      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <Mail className="size-6 text-primary" />
        <h2 className="mt-3 font-semibold">Check your inbox</h2>
        <p className="mt-1 text-sm text-muted-foreground">We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>. Open it on this device to continue.</p>
        <Button variant="ghost" className="mt-4 px-0" onClick={() => setSent(false)}>Use a different email</Button>
      </div>
    );

  return (
    <form onSubmit={sendLink} className="space-y-3 rounded-2xl border bg-card p-6 shadow-soft">
      <h2 className="font-semibold">Sign in with your university email</h2>
      <div className="space-y-1.5">
        <Label htmlFor="email">TU Dublin email</Label>
        <Input id="email" type="email" autoComplete="email" placeholder="you@mytudublin.ie" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Mail />}Email me a sign-in link</Button>
      <div className="relative py-1 text-center text-xs text-muted-foreground"><span className="bg-card px-2">or</span></div>
      <Button type="button" variant="outline" className="w-full" onClick={microsoft}>
        <svg viewBox="0 0 21 21" className="size-4" aria-hidden><path className="fill-soc-coral" d="M0 0h10v10H0z" /><path className="fill-soc-emerald" d="M11 0h10v10H11z" /><path className="fill-soc-sky" d="M0 11h10v10H0z" /><path className="fill-soc-amber" d="M11 11h10v10H11z" /></svg>
        Sign in with Microsoft
      </Button>
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

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-8 lg:grid-cols-2 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <span className="size-1.5 rounded-full bg-teal" />For TU Dublin students
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] sm:text-6xl">
            One university.<br />Every society.<br /><span className="bg-brand bg-clip-text text-transparent">Connected.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Stop chasing group chats, spreadsheets and Instagram stories. SocConnect is the home for society life — discovery, membership, events and conversation in one place.
          </p>
          <div className="mt-8 max-w-md"><SignInCard /></div>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-hero" />
          <img src={hero} alt="Students enjoying society activities on campus" width={1536} height={1024} className="aspect-[3/2] w-full rounded-2xl border object-cover shadow-lift" />
        </div>
      </section>

      <section className="border-t bg-card/60">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.t}>
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><f.icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="mx-auto max-w-7xl px-6 py-8 text-xs text-muted-foreground">SocConnect · for TU Dublin societies.</footer>
    </div>
  );
}
