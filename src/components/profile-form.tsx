import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        <Input id="pf-course" placeholder="e.g. BSc Computer Science" value={course} onChange={(e) => setCourse(e.target.value)} maxLength={120} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-year">Year</Label>
        <Input id="pf-year" placeholder="e.g. Second year" value={year} onChange={(e) => setYear(e.target.value)} maxLength={40} />
      </div>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{submitLabel}</Button>
      </div>
    </form>
  );
}
