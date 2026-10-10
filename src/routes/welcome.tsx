import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { pageHead } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { emailAllowed, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/brand";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/welcome")({
  head: () => pageHead("Welcome", "Find TU Dublin societies, join the ones you like, and keep up with their events, posts and calls."),
  component: Welcome,
});

const features = [
  { t: "Find a society", d: "Browse societies at City, Tallaght and Blanchardstown, filter by what you're into, and join with your student email." },
  { t: "Keep up with it", d: "Each society you join has its events, announcements and chat channels here, so nothing gets lost in a group chat." },
  { t: "Go along", d: "Register for events in a tap and add them to your calendar." },
  { t: "Run one", d: "Committees post updates, schedule events, answer member requests and find other societies to team up with." },
];

/** Illustrative flyers for the welcome noticeboard. Decoration, not real events. */
const flyers = [
  { text: "Bring a board game. Or don't, we have loads.", foot: "Games and tabletop", tone: "bg-soc-indigo text-white", spot: "col-span-3 row-span-2 -rotate-2", tape: true },
  { text: "Learn to DJ. No decks needed.", foot: "Music", tone: "bg-highlight text-ink", spot: "col-span-3 rotate-1" },
  { text: "Tenors wanted for the winter show", foot: "Performing arts", tone: "bg-card text-ink", spot: "col-span-3 row-span-2 rotate-2", tabs: true },
  { text: "Christmas appeal: wrappers needed", foot: "Volunteering", tone: "bg-soc-emerald text-white", spot: "col-span-3 -rotate-1", tape: true },
  { text: "This house would ban group chats", foot: "Debating", tone: "bg-soc-coral text-white", spot: "col-span-4 rotate-1" },
  { text: "Cook-off night: bring a dish from home", foot: "Cultural societies", tone: "bg-soc-plum text-white", spot: "col-span-2 -rotate-2 hidden sm:flex" },
];

function Noticeboard() {
  return (
    <div aria-hidden className="grid grid-cols-6 gap-4 rounded-2xl bg-surface p-5 sm:p-7">
      {flyers.map((f) => (
        <div key={f.text} className={cn("relative flex flex-col justify-between gap-6 rounded-sm p-4 shadow-[0_1px_2px_rgb(27_28_26/0.15)]", f.tone, f.spot)}>
          {f.tape && <span className="absolute -top-2.5 left-1/2 h-5 w-14 -translate-x-1/2 rotate-[-4deg] bg-white/55" />}
          <p className="font-wide text-base font-bold leading-tight sm:text-xl">{f.text}</p>
          <p className="text-xs font-medium opacity-80">{f.foot}</p>
          {f.tabs && (
            <div className="-mx-4 -mb-4 mt-1 grid grid-cols-5 border-t border-dashed border-ink/30">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className="flex h-14 items-center justify-center border-r border-dashed border-ink/30 last:border-r-0">
                  <span className="-rotate-90 whitespace-nowrap text-[10px] font-medium">socconnect</span>
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
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
      <div className="rounded-xl border bg-card p-6">
        <Mail className="size-6" />
        <h2 className="mt-3 font-semibold">Check your inbox</h2>
        <p className="mt-1 text-sm text-muted-foreground">We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>. Open it on this device to continue.</p>
        <Button variant="ghost" className="mt-4 px-0" onClick={() => setSent(false)}>Use a different email</Button>
      </div>
    );

  return (
    <form onSubmit={sendLink} className="flex flex-col gap-3 rounded-xl border bg-card p-6">
      <h2 className="font-semibold">Sign in with your university email</h2>
      <div className="flex flex-col gap-1.5">
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
        <Link to="/welcome" aria-label="SocConnect"><Wordmark /></Link>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-6 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
        <div>
          <p className="text-sm font-medium text-muted-foreground">For students at TU Dublin</p>
          <h1 className="mt-4 max-w-xl text-5xl font-extrabold leading-[1.02] sm:text-6xl">Join a society without chasing a group chat.</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            SocConnect lists the societies in TU Dublin's official directory, from the Chess Society to the Horror Society. Join the ones you like, see what they're doing this week and talk to their committees.
          </p>
          <div className="mt-8 max-w-md"><SignInCard /></div>
        </div>
        <Noticeboard />
      </section>

      <section className="border-t">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.t}>
              <h2 className="text-lg font-bold">{f.t}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="mx-auto max-w-7xl px-6 pb-10 text-xs text-muted-foreground">SocConnect, for TU Dublin societies.</footer>
    </div>
  );
}
