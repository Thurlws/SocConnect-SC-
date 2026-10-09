import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Compass, MessagesSquare, Waypoints, GraduationCap, ShieldCheck } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { pageHead } from "@/lib/seo";
import { societies } from "@/data/mock";
import { SocietyAvatar } from "@/components/society-avatar";
import { Button } from "@/components/ui/button";
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

function Welcome() {
  const { setRole } = useDemo();
  const navigate = useNavigate();
  const enter = (r: "student" | "committee") => { setRole(r); navigate({ to: r === "committee" ? "/committee" : "/" }); };
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/welcome" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-primary-foreground"><Waypoints className="size-4" /></span>
          <span className="font-display text-lg font-semibold">SocConnect</span>
        </Link>
        <Button variant="ghost" onClick={() => enter("student")}>Enter demo <ArrowRight /></Button>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-8 lg:grid-cols-2 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <span className="size-1.5 rounded-full bg-teal" />Hackathon prototype · demo data
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] sm:text-6xl">
            One university.<br />Every society.<br /><span className="bg-brand bg-clip-text text-transparent">Connected.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Stop chasing group chats, spreadsheets and Instagram stories. SocConnect is the home for society life — discovery, membership, events and conversation in one place.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={() => enter("student")}><GraduationCap />Explore as a student</Button>
            <Button size="lg" variant="outline" onClick={() => enter("committee")}><ShieldCheck />Explore as a committee</Button>
          </div>
          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">{societies.slice(0, 6).map((s) => <SocietyAvatar key={s.id} society={s} size="sm" className="bg-card ring-2 ring-background" />)}</div>
            <p className="text-sm text-muted-foreground">{societies.length} demo societies to explore</p>
          </div>
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
      <footer className="mx-auto max-w-7xl px-6 py-8 text-xs text-muted-foreground">SocConnect prototype. All societies, people and events shown are fictional demo content.</footer>
    </div>
  );
}
