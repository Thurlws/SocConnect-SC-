import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/lib/demo-store";
import { allInterests } from "@/data/mock";
import { pageHead } from "@/lib/seo";
import { PageHeader, DemoBadge } from "@/components/cards";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => pageHead("Settings", "Your profile, interests and notification preferences."),
  component: SettingsPage,
});

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-6 shadow-soft">
      <h2 className="font-semibold">{title}</h2>
      {desc && <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SettingsPage() {
  const { user, role, interests, toggleInterest, prefs, setPref, reset } = useDemo();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" subtitle="Manage your profile and how SocConnect keeps you informed." />
      <Card title="Profile">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-ink font-display text-lg font-semibold text-ink-foreground">{user.initials}</span>
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.course} · {user.year}</p>
            <p className="text-xs text-muted-foreground">{role === "committee" ? "Committee member" : "Student"}</p>
          </div>
        </div>
      </Card>
      <Card title="Interests" desc="Used for society recommendations on your home page.">
        <div className="flex flex-wrap gap-2">
          {allInterests.map((i) => {
            const on = interests.includes(i);
            return (
              <button key={i} disabled={role === "committee"} onClick={() => toggleInterest(i)} className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60", on ? "border-primary bg-primary-soft text-primary" : "bg-card hover:border-primary/40")}>{i}</button>
            );
          })}
        </div>
        {role === "committee" && <p className="mt-3 text-xs text-muted-foreground">Interests are editable on the student demo account.</p>}
      </Card>
      <Card title="Notifications">
        <div className="space-y-4">
          {([
            ["announcements", "Society announcements"],
            ["events", "Event reminders"],
            ["discussions", "Discussion replies"],
            ["email", "Weekly email digest"],
          ] as const).map(([k, l]) => (
            <div key={k} className="flex items-center justify-between">
              <Label htmlFor={k}>{l}</Label>
              <Switch id={k} checked={prefs[k]} onCheckedChange={(v) => setPref(k, v)} />
            </div>
          ))}
        </div>
      </Card>
      <Card title="Account" desc="University sign-in will be connected in the next phase.">
        <Button variant="outline" disabled className="w-full sm:w-auto">
          <svg viewBox="0 0 21 21" className="size-4" aria-hidden><path className="fill-soc-coral" d="M0 0h10v10H0z" /><path className="fill-soc-emerald" d="M11 0h10v10H11z" /><path className="fill-soc-sky" d="M0 11h10v10H0z" /><path className="fill-soc-amber" d="M11 11h10v10H11z" /></svg>
          Sign in with Microsoft — coming soon
        </Button>
      </Card>
      <Card title="Demo controls">
        <div className="flex items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">Restore all societies, events and messages to their starting state. <DemoBadge /></p>
          <Button variant="outline" onClick={() => { reset(); toast.success("Demo data reset"); }}><RotateCcw />Reset</Button>
        </div>
      </Card>
    </div>
  );
}
