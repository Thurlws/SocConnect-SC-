import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Captions, Loader2, Lock, Mic, MicOff, PhoneOff, Send, Video, VideoOff, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useDemo } from "@/lib/demo-store";
import { callScript, roomPresence } from "@/data/calls";
import { demoNowIso } from "@/lib/format";
import { summarizeCall } from "@/lib/calls.functions";
import { fallbackSummary } from "@/lib/call-recap-fallback";
import type { CallSummary, TranscriptLine } from "@/lib/types";
import { SocietyAvatar, accentClasses } from "@/components/society-avatar";
import { EmptyState, DemoBadge } from "@/components/cards";
import { JoinButton } from "@/components/join-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/call/$roomId")({
  head: () => ({
    meta: [
      { title: "Call · SocConnect" },
      { name: "description", content: "Join a society voice and video call with live captions and an AI recap." },
      { property: "og:title", content: "Call · SocConnect" },
      { property: "og:description", content: "Join a society voice and video call with live captions and an AI recap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CallPage,
});

const initials = (n: string) => n.split(" ").map((p) => p[0]).join("");
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

type SREvent = { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
type SR = { continuous: boolean; interimResults: boolean; lang: string; start: () => void; stop: () => void; onresult: ((e: SREvent) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };
type SRWindow = Window & { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };

function CallPage() {
  const { roomId } = Route.useParams();
  const { getRoom, getSociety, membership, user, saveRecap } = useDemo();
  const navigate = useNavigate();
  const summarize = useServerFn(summarizeCall);
  const room = getRoom(roomId);
  const society = room ? getSociety(room.societyId) : undefined;

  const [phase, setPhase] = useState<"lobby" | "live" | "summarizing">("lobby");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [showCaptions, setShowCaptions] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [interim, setInterim] = useState("");
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [srSupported, setSrSupported] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<SR | null>(null);
  const elapsedRef = useRef(0);
  const micRef = useRef(micOn);
  const endRef = useRef<HTMLDivElement>(null);
  micRef.current = micOn;
  elapsedRef.current = elapsed;

  const others = (() => {
    if (!room || !society) return [];
    const base = room.kind === "meeting" ? society.committee.map((c) => c.name) : roomPresence(room.id);
    const pool = [...base, ...society.committee.map((c) => c.name), "Priya Nair", "Sam Okafor"];
    return [...new Set(pool)].filter((n) => n !== user.name).slice(0, 3);
  })();

  const addLine = (speaker: string, text: string) => setTranscript((t) => [...t, { speaker, text, at: elapsedRef.current }]);

  // Media: camera + mic
  useEffect(() => {
    if (phase !== "live") return;
    let cancelled = false;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true }).then((s) => {
      if (cancelled) return s.getTracks().forEach((t) => t.stop());
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    }).catch(() => { setCamOn(false); toast.message("Camera/mic not available — you can still type into the transcript."); });
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  }, [phase]);

  useEffect(() => { streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = camOn)); if (camOn && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current; }, [camOn]);
  useEffect(() => { streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = micOn)); }, [micOn]);

  // Timer
  useEffect(() => {
    if (phase !== "live") return;
    const i = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(i);
  }, [phase]);

  // Simulated participants
  useEffect(() => {
    if (phase !== "live" || !society) return;
    const script = callScript(society.shortName, others);
    let idx = 0;
    const i = setInterval(() => {
      if (idx >= script.length) return clearInterval(i);
      const l = script[idx++]!;
      setSpeaking(l.speaker);
      addLine(l.speaker, l.text);
      setTimeout(() => setSpeaking((s) => (s === l.speaker ? null : s)), 3000);
    }, 5000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, society?.id]);

  // Live speech-to-text (browser)
  useEffect(() => {
    if (phase !== "live") return;
    const Ctor = (window as SRWindow).SpeechRecognition ?? (window as SRWindow).webkitSpeechRecognition;
    if (!Ctor) { setSrSupported(false); return; }
    const rec: SR = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IE";
    rec.onresult = (e) => {
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r) continue;
        if (r.isFinal) { const t = r[0].transcript.trim(); if (t) addLine(user.name, t); } else partial += r[0].transcript;
      }
      setInterim(partial);
      setSpeaking(partial ? user.name : null);
    };
    rec.onerror = (e) => { if (e.error === "not-allowed") setSrSupported(false); };
    rec.onend = () => { if (micRef.current && recRef.current === rec) try { rec.start(); } catch { /* already running */ } };
    recRef.current = rec;
    if (micRef.current) try { rec.start(); } catch { /* noop */ }
    return () => { recRef.current = null; rec.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    const rec = recRef.current;
    if (!rec) return;
    try { if (micOn) rec.start(); else rec.stop(); } catch { /* noop */ }
  }, [micOn]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [transcript, interim]);

  if (!room || !society) return <EmptyState title="Call not found" body="This room may have been removed." action={<Button asChild><Link to="/calls">Back to calls</Link></Button>} />;
  if (membership(society.id) !== "member") return <EmptyState icon={Lock} title="Calls are for members" body={`Join ${society.shortName} to hop into its rooms.`} action={<JoinButton society={society} />} />;

  const a = accentClasses[society.accent];
  const title = `${room.name}`;

  const endCall = async () => {
    recRef.current = null;
    if (transcript.length === 0) { toast.message("Call ended — nothing was said, so there's no recap."); navigate({ to: "/calls" }); return; }
    setPhase("summarizing");
    let summary: CallSummary;
    try {
      summary = await summarize({ data: { society: society.name, title, transcript } });
    } catch {
      // Server unreachable: still save a keyword recap so leaving a call never loses the transcript.
      summary = fallbackSummary(transcript, elapsedRef.current);
    }
    if (summary.source === "fallback") toast.message("AI summary unavailable, so we saved a basic recap from the transcript.");
    const participants = [user.name, ...others];
    const id = saveRecap({ roomId: room.id, societyId: society.id, title: `${room.name} — ${society.shortName}`, date: demoNowIso(), durationSec: elapsedRef.current, participants, transcript, summary });
    navigate({ to: "/recaps/$recapId", params: { recapId: id } });
  };

  if (phase === "lobby") {
    return (
      <div className="mx-auto max-w-xl">
        <Link to="/calls" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />All calls</Link>
        <div className="rounded-2xl border bg-card p-8 text-center shadow-soft">
          <SocietyAvatar society={society} size="lg" className="mx-auto" />
          <h1 className="mt-4 font-display text-2xl font-semibold">{room.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{society.name} · {room.description}</p>
          <div className="mt-5 flex justify-center -space-x-2">
            {others.map((p) => <span key={p} title={p} className={cn("flex size-9 items-center justify-center rounded-full border-2 border-card text-xs font-semibold", a.soft, a.text)}>{initials(p)}</span>)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{others.join(", ")} {room.kind === "room" ? "are hanging out" : "will be there"}</p>
          <div className="mt-6 rounded-xl bg-surface p-4 text-left text-sm text-muted-foreground">
            <p className="flex items-center gap-2 font-medium text-foreground"><Wand2 className="size-4 text-primary" />AI recap is on</p>
            <p className="mt-1">Live captions turn what's said into a transcript. When you leave, AI writes a summary with decisions and action items.</p>
          </div>
          <Button size="lg" className="mt-6 w-full" onClick={() => setPhase("live")}><Video />Join call</Button>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground"><DemoBadge />Other people in the call are simulated</p>
        </div>
      </div>
    );
  }

  const tiles = [user.name, ...others];
  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl bg-ink text-ink-foreground shadow-soft">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <SocietyAvatar society={society} size="sm" />
          <div>
            <p className="text-sm font-semibold">{room.name}</p>
            <p className="text-xs opacity-70">{society.shortName} · {clock(elapsed)}</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-ink-foreground/10 px-3 py-1 text-xs"><span className="size-1.5 animate-pulse rounded-full bg-destructive" />AI notes on</span>
      </div>

      <div className="flex min-h-0 flex-1 gap-4 px-5 pb-3">
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2">
          {tiles.map((n) => {
            const me = n === user.name;
            return (
              <div key={n} className={cn("relative flex items-center justify-center overflow-hidden rounded-2xl bg-ink-foreground/5 ring-2 ring-transparent transition", speaking === n && "ring-success")}>
                {me && camOn ? <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
                  : <span className={cn("flex size-20 items-center justify-center rounded-full text-2xl font-semibold", a.solid, "text-primary-foreground")}>{initials(n)}</span>}
                <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-ink/70 px-2 py-1 text-xs">
                  {me && !micOn && <MicOff className="size-3" />}{me ? `${n} (you)` : n}
                </span>
              </div>
            );
          })}
        </div>

        {showCaptions && (
          <aside className="hidden w-80 shrink-0 flex-col overflow-hidden rounded-2xl bg-ink-foreground/5 md:flex">
            <p className="flex items-center gap-2 border-b border-ink-foreground/10 px-4 py-3 text-sm font-semibold"><Captions className="size-4" />Live transcript</p>
            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
              {transcript.length === 0 && !interim && <p className="opacity-60">Start talking — captions will show up here.</p>}
              {transcript.map((l, i) => (
                <p key={i}><span className="font-semibold">{l.speaker}</span> <span className="text-xs opacity-50">{clock(l.at)}</span><br /><span className="opacity-90">{l.text}</span></p>
              ))}
              {interim && <p className="opacity-60"><span className="font-semibold">{user.name}</span><br />{interim}…</p>}
              <div ref={endRef} />
            </div>
            {!srSupported && (
              <form className="flex gap-2 border-t border-ink-foreground/10 p-3" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { addLine(user.name, typed.trim()); setTyped(""); } }}>
                <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Live captions need Chrome — type instead" className="border-ink-foreground/20 bg-transparent text-ink-foreground" />
                <Button type="submit" size="icon" variant="secondary" aria-label="Add to transcript"><Send /></Button>
              </form>
            )}
          </aside>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 pb-5">
        <Button size="icon" variant={micOn ? "secondary" : "destructive"} className="size-12 rounded-full" onClick={() => setMicOn((m) => !m)} aria-label={micOn ? "Mute" : "Unmute"}>{micOn ? <Mic /> : <MicOff />}</Button>
        <Button size="icon" variant={camOn ? "secondary" : "destructive"} className="size-12 rounded-full" onClick={() => setCamOn((c) => !c)} aria-label={camOn ? "Turn camera off" : "Turn camera on"}>{camOn ? <Video /> : <VideoOff />}</Button>
        <Button size="icon" variant="secondary" className={cn("hidden size-12 rounded-full md:inline-flex", !showCaptions && "opacity-60")} onClick={() => setShowCaptions((s) => !s)} aria-label="Toggle transcript"><Captions /></Button>
        <Button variant="destructive" className="h-12 rounded-full px-6" onClick={endCall} disabled={phase === "summarizing"}>
          {phase === "summarizing" ? <><Loader2 className="animate-spin" />Writing recap…</> : <><PhoneOff />Leave & summarise</>}
        </Button>
      </div>
    </div>
  );
}
