import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import courses from "@/data/tud-courses.json";

const years = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Postgraduate", "Staff"];

/** Display name, course and year — saved to the signed-in person's own profile. */
export function ProfileForm({ submitLabel = "Save profile", onSaved, finishOnboarding }: { submitLabel?: string; onSaved?: () => void; finishOnboarding?: boolean }) {
  const { profile, session, refresh } = useAuth();
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name);
    setCourse(profile.course);
    setYear(profile.year);
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (name.trim().length < 2) return void toast.error("Please enter your name.");
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim().slice(0, 80),
        course: course.trim().slice(0, 120),
        year: year.trim().slice(0, 40),
        ...(finishOnboarding ? { onboarded_at: new Date().toISOString() } : {}),
      })
      .eq("id", session.user.id);
    setBusy(false);
    if (error) return void toast.error("Couldn't save your profile. Try again.");
    await refresh();
    toast.success("Profile saved");
    onSaved?.();
  };

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-1.5 sm:col-span-3">
        <Label htmlFor="pf-name">Display name</Label>
        <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="pf-course">Course</Label>
        <Input id="pf-course" list="tud-courses" placeholder="Search course code or name" value={course} onChange={(e) => setCourse(e.target.value)} maxLength={120} autoComplete="off" />
        <datalist id="tud-courses">{courses.map((c) => <option key={c.code} value={`${c.code} — ${c.name}`} />)}</datalist>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-year">Year</Label>
        <select id="pf-year" value={year} onChange={(e) => setYear(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">Select year</option>
          {year && !years.includes(year) && <option value={year}>{year}</option>}
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{submitLabel}</Button>
      </div>
    </form>
  );
}
