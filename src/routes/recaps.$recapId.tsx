import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, ChevronDown, ListTodo, Loader2, MessageCircleQuestion, Send, Share2, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useDemo } from "@/lib/demo-store";
import { formatDate } from "@/lib/format";
import { askAboutCall } from "@/lib/calls.functions";
import { SocietyAvatar } from "@/components/society-avatar";
import { EmptyState } from "@/components/cards";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export const Route = createFileRoute("/recaps/$recapId")({
  head: () => ({
    meta: [
      { title: "Call recap · SocConnect" },
      { name: "description", content: "AI summary, decisions and action items from a society call — plus ask questions about it." },
      { property: "og:title", content: "Call recap · SocConnect" },
      { property: "og:description", content: "AI summary, decisions and action items from a society call." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecapPage,
});

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const suggestions = ["What did we decide?", "What do I need to do?", "Summarise it in one sentence"];

function RecapPage() {
  const { recapId } = Route.useParams();
  const { recaps, getSociety, shareRecap, updateRecapQa, loaded } = useDemo();
  const ask = useServerFn(askAboutCall);
  const recap = recaps.find((r) => r.id === recapId);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [recap?.qa.length, busy]);

  if (!recap) return loaded ? <EmptyState title="Recap not found" body="It may have been removed when the demo was reset." action={<Button asChild><Link to="/calls">Back to calls</Link></Button>} /> : null;
  const s = getSociety(recap.societyId);

  const send = async (question: string) => {
    if (!question.trim() || busy) return;
    const history = recap.qa;
    const next = [...history, { role: "user" as const, content: question.trim() }];
    updateRecapQa(recap.id, next);
    setQ("");
    setBusy(true);
    try {
      const { answer } = await ask({ data: { title: recap.title, transcript: recap.transcript, history, question: question.trim() } });
      updateRecapQa(recap.id, [...next, { role: "assistant", content: answer }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The assistant couldn't answer.");
      updateRecapQa(recap.id, history);
      setQ(question);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/calls" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />All calls</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {s && <SocietyAvatar society={s} size="lg" />}
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary"><Wand2 className="size-3.5" />AI call recap</p>
            <h1 className="font-display text-2xl font-semibold">{recap.title}</h1>
            <p className="text-sm text-muted-foreground">{formatDate(recap.date)} · {Math.max(1, Math.round(recap.durationSec / 60))} min · {recap.participants.join(", ")}</p>
          </div>
        </div>
        <Button variant={recap.shared ? "outline" : "default"} disabled={recap.shared} onClick={() => { shareRecap(recap.id); toast.success(`Recap posted to #general in ${s?.shortName}`); }}>
          {recap.shared ? <><CheckCircle2 />Shared with members</> : <><Share2 />Share with members</>}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <section className="rounded-xl border bg-card p-6 shadow-soft">
            <h2 className="text-sm font-semibold">Summary</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{recap.summary.overview}</p>
            {recap.summary.topics.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{recap.summary.topics.map((t) => <span key={t} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs text-primary">{t}</span>)}</div>}
          </section>
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-xl border bg-card p-5 shadow-soft">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-4 text-success" />Decisions</h2>
              {recap.summary.decisions.length ? <ul className="mt-3 space-y-2 text-sm">{recap.summary.decisions.map((d) => <li key={d} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-success" />{d}</li>)}</ul>
                : <p className="mt-3 text-sm text-muted-foreground">Nothing was decided.</p>}
            </section>
            <section className="rounded-xl border bg-card p-5 shadow-soft">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><ListTodo className="size-4 text-primary" />Action items</h2>
              {recap.summary.actionItems.length ? <ul className="mt-3 space-y-2.5 text-sm">{recap.summary.actionItems.map((a, i) => <li key={i}><span className="font-medium">{a.owner}</span><span className="block text-muted-foreground">{a.task}</span></li>)}</ul>
                : <p className="mt-3 text-sm text-muted-foreground">No action items.</p>}
            </section>
          </div>
          <Collapsible className="rounded-xl border bg-card shadow-soft">
            <CollapsibleTrigger className="group flex w-full items-center justify-between px-5 py-4 text-sm font-semibold">
              Full transcript ({recap.transcript.length} lines)<ChevronDown className="size-4 transition group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="max-h-96 space-y-2 overflow-y-auto border-t px-5 py-4 text-sm">
              {recap.transcript.map((l, i) => <p key={i}><span className="text-xs text-muted-foreground">{clock(l.at)}</span> <span className="font-medium">{l.speaker}:</span> {l.text}</p>)}
            </CollapsibleContent>
          </Collapsible>
        </div>

        <section className="flex h-[560px] flex-col rounded-xl border bg-card shadow-soft lg:col-span-2">
          <div className="border-b px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><MessageCircleQuestion className="size-4 text-primary" />Ask about this call</h2>
            <p className="text-xs text-muted-foreground">Answers come only from what was said.</p>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm">
            {recap.qa.length === 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground">Missed something? Try:</p>
                {suggestions.map((sg) => <button key={sg} onClick={() => send(sg)} className="block rounded-full border px-3 py-1.5 text-left text-xs hover:bg-muted">{sg}</button>)}
              </div>
            )}
            {recap.qa.map((m, i) => m.role === "user"
              ? <div key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2 text-ink-foreground">{m.content}</div>
              : <div key={i} className="space-y-2 leading-relaxed [&_li]:ml-4 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc"><ReactMarkdown>{m.content}</ReactMarkdown></div>)}
            {busy && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Thinking…</p>}
            <div ref={endRef} />
          </div>
          <form className="flex items-end gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(q); }}>
            <Textarea ref={inputRef} autoFocus value={q} onChange={(e) => setQ(e.target.value)} rows={1} placeholder="e.g. Who's booking the room?" className="min-h-10 resize-none"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(q); } }} />
            <Button type="submit" size="icon" disabled={busy || !q.trim()} aria-label="Ask"><Send /></Button>
          </form>
        </section>
      </div>
    </div>
  );
}
