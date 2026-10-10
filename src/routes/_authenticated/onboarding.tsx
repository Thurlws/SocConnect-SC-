import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Waypoints } from "lucide-react";
import { pageHead } from "@/lib/seo";
import { useData } from "@/lib/api/store";
import { ProfileForm } from "@/components/profile-form";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => pageHead("Get started", "Tell SocConnect a little about you."),
  component: Onboarding,
});

function Onboarding() {
  const { interests, toggleInterest, allInterests } = useData();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-12">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-primary-foreground"><Waypoints className="size-4" /></span>
        <span className="font-display text-lg font-semibold">SocConnect</span>
      </div>
      <div>
        <h1 className="text-3xl font-semibold">Welcome! Let's set you up.</h1>
        <p className="mt-2 text-muted-foreground">Pick a few interests so we can suggest societies, then tell us who you are.</p>
      </div>
      <section className="rounded-xl border bg-card p-6 shadow-soft">
        <h2 className="font-semibold">Your interests</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {allInterests.map((i) => {
            const on = interests.includes(i);
            return (
              <button key={i} type="button" onClick={() => void toggleInterest(i)} className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", on ? "border-primary bg-primary-soft text-primary" : "bg-card hover:border-primary/40")}>{i}</button>
            );
          })}
        </div>
      </section>
      <section className="rounded-xl border bg-card p-6 shadow-soft">
        <h2 className="mb-4 font-semibold">About you</h2>
        <ProfileForm submitLabel="Finish and continue" finishOnboarding onSaved={() => navigate({ to: "/" })} />
      </section>
    </div>
  );
}
