import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Loader2, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { pageHead } from "@/lib/seo";
import { PageHeader, EmptyState } from "@/components/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => pageHead("Admin", "Create and manage societies and their committees."),
  component: AdminPage,
});

const ACCENTS = ["indigo", "teal", "coral", "amber", "rose", "sky", "emerald", "plum"] as const;
type Accent = (typeof ACCENTS)[number];

type SocietyRow = {
  id: string; slug: string; name: string; short_name: string; category: string; tagline: string;
  description: string; accent: string; requires_approval: boolean; meets: string; status: string;
};
type RoleRow = { id: string; society_id: string; position: string; user_id: string; profiles: { display_name: string } | null };
type InviteRow = { id: string; email: string; society_id: string | null; position: string };

const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

function useAdminData() {
  return useQuery({
    queryKey: ["admin"],
    queryFn: async () => {
      const [s, r, i] = await Promise.all([
        supabase.from("societies").select("id, slug, name, short_name, category, tagline, description, accent, requires_approval, meets, status").order("name"),
        supabase.from("society_roles").select("id, society_id, position, user_id, profiles(display_name)"),
        supabase.from("role_invites").select("id, email, society_id, position").is("claimed_at", null),
      ]);
      if (s.error) throw s.error;
      return { societies: (s.data ?? []) as SocietyRow[], roles: (r.data ?? []) as unknown as RoleRow[], invites: (i.data ?? []) as InviteRow[] };
    },
  });
}

function AdminPage() {
  const { access } = useAuth();
  const { data, isLoading } = useAdminData();
  const [editing, setEditing] = useState<SocietyRow | "new" | null>(null);
  const qc = useQueryClient();

  if (!access.is_admin) return <EmptyState icon={ShieldCheck} title="Admins only" body="This page is for platform admins (TU Dublin staff accounts)." />;

  const setStatus = async (s: SocietyRow, status: "active" | "archived") => {
    const { error } = await supabase.from("societies").update({ status }).eq("id", s.id);
    if (error) return void toast.error(error.message);
    toast.success(status === "archived" ? `${s.short_name} archived` : `${s.short_name} restored`);
    void qc.invalidateQueries({ queryKey: ["admin"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Admin" subtitle="Add your university's societies and choose who runs them." actions={<Button onClick={() => setEditing("new")}><Plus />New society</Button>} />
      {isLoading && <div className="h-32 animate-pulse rounded-xl bg-muted" />}
      {data && data.societies.length === 0 && <EmptyState title="No societies yet" body="Create the first society to get started." />}
      {data?.societies.map((s) => (
        <section key={s.id} className="rounded-xl border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{s.name} <span className="text-sm font-normal text-muted-foreground">· /societies/{s.slug}</span></h2>
              <p className="text-sm text-muted-foreground">{s.category}{s.status === "archived" && " · Archived"}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(s)}>Edit</Button>
              {s.status === "active"
                ? <Button variant="outline" size="sm" onClick={() => setStatus(s, "archived")}><Archive />Archive</Button>
                : <Button variant="outline" size="sm" onClick={() => setStatus(s, "active")}><ArchiveRestore />Restore</Button>}
            </div>
          </div>
          <Committee society={s} roles={data.roles.filter((r) => r.society_id === s.id)} invites={data.invites.filter((i) => i.society_id === s.id)} />
        </section>
      ))}
      {editing && <SocietyDialog society={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Committee({ society, roles, invites }: { society: SocietyRow; roles: RoleRow[]; invites: InviteRow[] }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = email.trim().toLowerCase();
    if (!/^[^@\s]+@(mytudublin\.ie|tudublin\.ie)$/.test(addr)) return void toast.error("Use a TU Dublin email address.");
    setBusy(true);
    const { error } = await supabase.from("role_invites").insert({ email: addr, society_id: society.id, role: "committee", position: position.trim() || "Committee member", invited_by: session?.user.id ?? null });
    setBusy(false);
    if (error) return void toast.error(error.code === "23505" ? "That person is already invited." : error.message);
    toast.success(`${addr} added to ${society.short_name}'s committee`);
    setEmail(""); setPosition("");
    void refresh();
  };

  const remove = async (table: "society_roles" | "role_invites", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return void toast.error(error.message);
    void refresh();
  };

  return (
    <div className="mt-5 border-t pt-4">
      <h3 className="text-sm font-semibold">Committee</h3>
      <ul className="mt-2 space-y-1 text-sm">
        {roles.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2">
            <span>{r.profiles?.display_name || "Member"} · <span className="text-muted-foreground">{r.position}</span></span>
            <Button variant="ghost" size="sm" aria-label="Remove" onClick={() => remove("society_roles", r.id)}><Trash2 /></Button>
          </li>
        ))}
        {invites.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2 text-muted-foreground">
            <span>{i.email} · {i.position} · waiting for first sign-in</span>
            <Button variant="ghost" size="sm" aria-label="Cancel invite" onClick={() => remove("role_invites", i.id)}><Trash2 /></Button>
          </li>
        ))}
        {roles.length + invites.length === 0 && <li className="text-muted-foreground">No committee yet.</li>}
      </ul>
      <form onSubmit={invite} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input type="email" placeholder="name@mytudublin.ie" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input placeholder="Position, e.g. President" value={position} onChange={(e) => setPosition(e.target.value)} maxLength={60} />
        <Button type="submit" variant="outline" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <UserPlus />}Add</Button>
      </form>
    </div>
  );
}

function SocietyDialog({ society, onClose }: { society: SocietyRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: society?.name ?? "", short_name: society?.short_name ?? "", slug: society?.slug ?? "",
    category: society?.category ?? "", tagline: society?.tagline ?? "", description: society?.description ?? "",
    meets: society?.meets ?? "", accent: (society?.accent ?? "indigo") as Accent, requires_approval: society?.requires_approval ?? false,
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = f.slug || slugify(f.short_name || f.name);
    if (f.name.trim().length < 2 || !f.short_name.trim() || slug.length < 2) return void toast.error("Name, short name and address are required.");
    setBusy(true);
    const row = { ...f, slug, name: f.name.trim(), short_name: f.short_name.trim(), category: f.category.trim() || "Community" };
    const { error } = society ? await supabase.from("societies").update(row).eq("id", society.id) : await supabase.from("societies").insert(row);
    setBusy(false);
    if (error) return void toast.error(error.code === "23505" ? "That address is already taken." : error.message);
    toast.success(society ? "Society updated" : "Society created");
    void qc.invalidateQueries({ queryKey: ["admin"] });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{society ? `Edit ${society.short_name}` : "New society"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={100} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Short name</Label><Input value={f.short_name} onChange={(e) => set("short_name", e.target.value)} maxLength={30} required /></div>
            <div className="space-y-1.5"><Label>Address</Label><Input placeholder={slugify(f.short_name || f.name) || "compsoc"} value={f.slug} onChange={(e) => set("slug", slugify(e.target.value))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Category</Label><Input placeholder="e.g. Academic" value={f.category} onChange={(e) => set("category", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Colour</Label>
              <Select value={f.accent} onValueChange={(v) => set("accent", v as Accent)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACCENTS.map((a) => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Tagline</Label><Input value={f.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={140} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} /></div>
          <div className="space-y-1.5"><Label>When it meets</Label><Input placeholder="e.g. Wednesdays 6pm, Room A12" value={f.meets} onChange={(e) => set("meets", e.target.value)} maxLength={140} /></div>
          <div className="flex items-center justify-between"><Label htmlFor="ra">New members need approval</Label><Switch id="ra" checked={f.requires_approval} onCheckedChange={(v) => set("requires_approval", v)} /></div>
          <DialogFooter><Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{society ? "Save" : "Create society"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
