import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { askSocConnect, explainSocietyFits, generateSocietyProposal, saveSocietyProposal } from "@/lib/society-ai.functions";
import { useData } from "@/lib/api/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function useSocietyFits() {
  const { user, interests, recommendations } = useData();
  const explain = useServerFn(explainSocietyFits);
  return useQuery({ queryKey: ["society-fits", user.id, interests.join(","), recommendations.map(r => r.slug).join(",")], queryFn: () => explain(), enabled: recommendations.some(r => r.score > 0), staleTime: 86400000, retry: false });
}
export function AskSocConnect() {
  const ask = useServerFn(askSocConnect);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof askSocConnect>> | null>(null);
  const [busy, setBusy] = useState(false);
  return <section className="space-y-3"><h2 className="text-xl font-semibold">Ask SocConnect</h2>
    <form className="flex gap-2" onSubmit={async e => { e.preventDefault(); setBusy(true); try { setResult(await ask({ data: { question } })); } catch(e) { toast.error(e instanceof Error ? e.message : "Couldn't search."); } finally { setBusy(false); } }}>
      <Input aria-label="Ask about your societies" placeholder="When is my society’s next event?" value={question} onChange={e => setQuestion(e.target.value)} maxLength={500} required />
      <Button type="submit" disabled={busy || !question.trim()} aria-label="Search society updates">{busy ? <Loader2 className="animate-spin" /> : <Search />}</Button>
    </form>
    {result && <div className="space-y-2 border-l-2 border-primary pl-4"><p className="text-xs text-muted-foreground">{result.source === "ai" ? "AI answer" : "Search results"}</p>{result.notice && <p className="text-sm text-warning">{result.notice}</p>}<p className="whitespace-pre-wrap text-sm">{result.answer}</p><ul className="space-y-1">{result.records.map(r => <li key={r.id}>{r.kind === "event" ? <Link className="text-sm text-primary underline" to="/events/$eventId" params={{ eventId: r.id }}>{r.title}</Link> : <Link className="text-sm text-primary underline" to="/societies/$societyId" params={{ societyId: r.slug }} hash={`announcement-${r.id}`}>{r.title}</Link>}</li>)}</ul></div>}
  </section>;
}
export function ProposalComposer({ a, b }: { a: string; b: string }) {
  const { societyUuid, committeeSeats, refresh } = useData();
  const generate = useServerFn(generateSocietyProposal), save = useServerFn(saveSocietyProposal);
  const [draft, setDraft] = useState<Awaited<ReturnType<typeof generateSocietyProposal>>["draft"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  if (!committeeSeats.some(s => s.slug === a || s.slug === b)) return null;
  return <div className="space-y-3 border-t pt-4">
    <Button disabled={busy} onClick={async () => { const aid = societyUuid[a], bid = societyUuid[b]; if (!aid || !bid) return; setBusy(true); try { const r = await generate({ data: { a: aid, b: bid } }); setDraft(r.draft); setNotice(r.notice); } catch(e) { toast.error(e instanceof Error ? e.message : "Couldn't create an idea."); } finally { setBusy(false); } }}>{busy && <Loader2 className="animate-spin" />}Generate proposal</Button>
    {notice && <p className="text-sm text-warning">{notice}</p>}
    {draft && <form key={`${a}-${b}`} className="space-y-3" onSubmit={async e => { e.preventDefault(); const aid = societyUuid[a], bid = societyUuid[b]; if (!aid || !bid) return; setBusy(true); try { const r = await save({ data: { ...draft, a: aid, b: bid } }); if (!r.ok) return void toast.error(r.error); await refresh(); setDraft(null); toast.success("Proposal shared with both committees"); } catch(e) { toast.error(e instanceof Error ? e.message : "Couldn't save."); } finally { setBusy(false); } }}>
      <p className="text-xs font-medium text-warning">{draft.source === "ai" ? "AI-generated proposal, not a confirmed event" : "Committee draft, not a confirmed event"}</p>
      <Label htmlFor="proposal-title">Title</Label><Input id="proposal-title" value={draft.title} maxLength={160} required onChange={e => setDraft({ ...draft, title: e.target.value })} />
      <Label htmlFor="proposal-summary">Summary</Label><Textarea id="proposal-summary" value={draft.summary} maxLength={1500} onChange={e => setDraft({ ...draft, summary: e.target.value })} />
      <Label htmlFor="proposal-rationale">Why it could work</Label><Textarea id="proposal-rationale" value={draft.rationale} maxLength={2000} onChange={e => setDraft({ ...draft, rationale: e.target.value })} />
      {[a,b].map(id => <div className="space-y-1" key={id}><Label htmlFor={`contribution-${id}`}>{id} contribution</Label><Textarea id={`contribution-${id}`} value={draft.contributions[id] ?? ""} maxLength={1000} onChange={e => setDraft({ ...draft, contributions: { ...draft.contributions, [id]: e.target.value } })} /></div>)}
      <Label htmlFor="proposal-steps">Next steps</Label><Textarea id="proposal-steps" value={draft.nextSteps.join("\n")} onChange={e => setDraft({ ...draft, nextSteps: e.target.value.split("\n") })} />
      <Button type="submit" disabled={busy}>Save and share with committees</Button>
    </form>}
  </div>;
}
