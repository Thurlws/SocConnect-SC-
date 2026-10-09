import { createFileRoute } from "@tanstack/react-router";
import { Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { useData } from "@/lib/api/store";
import { pageHead } from "@/lib/seo";
import { PageHeader, SocietyCard, EmptyState } from "@/components/cards";
import { JoinButton } from "@/components/join-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSocietyFits } from "@/components/society-ai";

export const Route = createFileRoute("/_authenticated/societies/")({
  head: () => pageHead("Discover Societies", "Browse every society on campus by interest, category and size."),
  component: Discover,
});

function Discover() {
  const { societies, membership, allInterests, recommendations } = useData();
  const fits = useSocietyFits();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [tags, setTags] = useState<string[]>([]);
  const [sort, setSort] = useState("recommended");
  const [status, setStatus] = useState("all");
  const cats = ["All", ...Array.from(new Set(societies.map((s) => s.category)))];

  const list = useMemo(() => {
    const ql = q.toLowerCase();
    return societies
      .filter((s) => !ql || `${s.name} ${s.tagline} ${s.tags.join(" ")}`.toLowerCase().includes(ql))
      .filter((s) => cat === "All" || s.category === cat)
      .filter((s) => tags.every((t) => s.tags.includes(t)))
      .filter((s) => status === "all" || (status === "joined" ? membership(s.id) === "member" : membership(s.id) === "none"))
      .sort((a, b) => sort === "recommended" ? (recommendations.findIndex(r => r.slug === a.id) < 0 ? 99999 : recommendations.findIndex(r => r.slug === a.id)) - (recommendations.findIndex(r => r.slug === b.id) < 0 ? 99999 : recommendations.findIndex(r => r.slug === b.id)) : (sort === "az" ? a.name.localeCompare(b.name) : b.memberCount - a.memberCount));
  }, [societies, q, cat, tags, sort, status, membership, recommendations]);

  const clear = () => { setQ(""); setCat("All"); setTags([]); setStatus("all"); };

  return (
    <div>
      <PageHeader title="Discover societies" subtitle={`${societies.length} societies across campus. Find your people.`} />
      <div className="mb-6 space-y-4 rounded-xl border bg-card p-4 shadow-soft">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, activity or interest" className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All societies</SelectItem>
              <SelectItem value="joined">Joined</SelectItem>
              <SelectItem value="not">Not joined</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="popular">Most members</SelectItem>
              <SelectItem value="az">A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", cat === c ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40")}>{c}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground">Interests:</span>
          {allInterests.map((t) => (
            <button key={t} onClick={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))} className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors", tags.includes(t) ? "bg-teal text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-teal-soft")}>{t}</button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{list.length} result{list.length === 1 ? "" : "s"}</p>
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => <SocietyCard key={s.id} society={s} reason={fits.data?.reasons[s.id] ?? ""} action={<JoinButton society={s} full />} />)}
        </div>
      ) : (
        <EmptyState icon={SearchX} title="No societies match" body="Try fewer filters or a different search term." action={<Button size="sm" variant="outline" onClick={clear}>Clear filters</Button>} />
      )}
    </div>
  );
}
