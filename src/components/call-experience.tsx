import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Captions,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  QrCode,
  Radio,
  Send,
  Video,
  VideoOff,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useDemo } from "@/lib/demo-store";
import { callScript, roomPresence } from "@/data/calls";
import { demoNowIso } from "@/lib/format";
import { summarizeCall } from "@/lib/calls.functions";
import { fallbackSummary } from "@/lib/call-recap-fallback";
import { getCallMode, getCallToken } from "@/lib/livekit.functions";
import { inviteUrl } from "@/lib/invite";
import { CallHeaderCount, LiveCallBridge, LiveCallRoom, LiveTiles } from "@/components/live-call";
import { InviteDialog } from "@/components/invite-dialog";
import type { CallSummary, CallRoom, Society, TranscriptLine } from "@/lib/types";
import { SocietyAvatar, accentClasses } from "@/components/society-avatar";
import { DemoBadge } from "@/components/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initials = (n: string) => n.split(" ").map((p) => p[0]).join("");
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

type SREvent = { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
type SR = { continuous: boolean; interimResults: boolean; lang: string; start: () => void; stop: () => void; onresult: ((e: SREvent) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };
type SRWindow = Window & { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };

/**
 * The call itself: camera, mic, live captions, transcript and AI recap.
 *
 * Shared by the in-app room page (/call/$roomId) and the bare invite page
 * (/join/$roomId) that a QR code or shared link opens — so a scanned code and a
 * clicked nav link land in exactly the same call.
 *
 * `guest` drops the app chrome: full-screen stage, a name to join as, and an
 * inline recap instead of the in-app recap page.
 */
export function CallExperience({
  room,
  society,
  guest = false,
  defaultName,
  onName,
  onEnded,
}: {
  room: CallRoom;
  society: Society;
  guest?: boolean;
  defaultName: string;
  onName?: (name: string) => void;
  onEnded?: (recapId: string) => void;
}) {
  const { saveRecap } = useDemo();
  const navigate = useNavigate();
  const summarize = useServerFn(summarizeCall);
  const callMode = useServerFn(getCallMode);
  const callToken = useServerFn(getCallToken);

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
  // "live" = real multi-person call via LiveKit; "simulated" = scripted participants (no LiveKit configured).
  const [mode, setMode] = useState<"checking" | "live" | "simulated">("checking");
  const [lk, setLk] = useState<{ url: string; token: string } | null>(null);
  const [joining, setJoining] = useState(false);
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [srIssue, setSrIssue] = useState<string | null>(null);
  const interimRef = useRef("");
  const sendRef = useRef<((text: string, speaker: string) => void) | null>(null);
  const seenRef = useRef(new Set<string>());
  const me = (nameInput ?? defaultName).trim() || defaultName;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<SR | null>(null);
  const elapsedRef = useRef(0);
  const micRef = useRef(micOn);
  const endRef = useRef<HTMLDivElement>(null);
  micRef.current = micOn;
  elapsedRef.current = elapsed;

  const a = accentClasses[society.accent];
  const title = `${room.name}`;
  // The share link depends on the browser's address, so it's filled in after mount.
  const [invite, setInvite] = useState<string | null>(null);
  useEffect(() => { setInvite(inviteUrl(room.id, window.location.origin)); }, [room.id]);

  const others = (() => {
    const base = room.kind === "meeting" ? society.committee.map((c) => c.name) : roomPresence(room.id);
    const pool = [...base, ...society.committee.map((c) => c.name), "Priya Nair", "Sam Okafor"];
    return [...new Set(pool)].filter((n) => n !== me).slice(0, 3);
  })();

  const addLine = useCallback((speaker: string, text: string) => setTranscript((t) => [...t, { speaker, text, at: elapsedRef.current }]), []);
  /** Your own words: add to the transcript and share with everyone in a live call. */
  const say = (text: string) => { addLine(me, text); sendRef.current?.(text, me); };
  const onParticipants = useCallback((names: string[]) => names.forEach((n) => seenRef.current.add(n)), []);

  useEffect(() => {
    let cancelled = false;
    callMode().then((r) => !cancelled && setMode(r.live ? "live" : "simulated")).catch(() => !cancelled && setMode("simulated"));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Media: camera + mic (simulated mode only; LiveKit manages devices in live calls)
  useEffect(() => {
    if (phase !== "live" || lk) return;
    let cancelled = false;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true }).then((s) => {
      if (cancelled) return s.getTracks().forEach((t) => t.stop());
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    }).catch(() => { setCamOn(false); toast.message("Camera/mic not available — you can still type into the transcript."); });
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  }, [phase, lk]);

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
    if (phase !== "live" || !society || lk) return;
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
        if (r.isFinal) { const t = r[0].transcript.trim(); if (t) say(t); } else partial += r[0].transcript;
      }
      setInterim(partial);
      interimRef.current = partial;
      setSrIssue(null);
      setSpeaking(partial ? me : null);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") { setSrSupported(false); setSrIssue("Captions are blocked — allow the microphone, or type below."); }
      else if (e.error === "network") setSrIssue("Captions lost connection — retrying…");
      else if (e.error === "audio-capture") setSrIssue("No microphone found for captions — type below.");
    };
    // Chrome stops recognition after silence or errors; keep restarting while the mic is on.
    rec.onend = () => { if (micRef.current && recRef.current === rec) setTimeout(() => { if (recRef.current === rec) try { rec.start(); } catch { /* already running */ } }, 250); };
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

  const endCall = async () => {
    const rec = recRef.current;
    recRef.current = null;
    try { rec?.stop(); } catch { /* noop */ }
    // Keep words still being recognised when Leave was pressed.
    let lines = transcript;
    const pending = interimRef.current.trim();
    if (pending) { lines = [...transcript, { speaker: me, text: pending, at: elapsedRef.current }]; sendRef.current?.(pending, me); }
    if (lines.length === 0) {
      toast.message("No captions were captured, so there's no recap.", { description: srSupported ? "Captions work in Chrome or Edge with the microphone allowed. You can also type into the transcript." : "Live captions need Chrome or Edge. Type into the transcript during the call instead." });
      if (onEnded) setPhase("lobby");
      else navigate({ to: "/calls" });
      return;
    }
    setPhase("summarizing");
    let summary: CallSummary;
    try {
      summary = await summarize({ data: { society: society.name, title, transcript: lines } });
    } catch {
      // Server unreachable: still save a keyword recap so leaving a call never loses the transcript.
      summary = fallbackSummary(lines, elapsedRef.current);
    }
    if (summary.source === "fallback") toast.message("AI summary unavailable, so we saved a basic recap from the transcript.");
    const participants = lk ? [...new Set([me, ...seenRef.current])] : [me, ...others];
    const id = saveRecap({ roomId: room.id, societyId: society.id, title: `${room.name} — ${society.shortName}`, date: demoNowIso(), durationSec: elapsedRef.current, participants, transcript: lines, summary });
    if (onEnded) onEnded(id);
    else navigate({ to: "/recaps/$recapId", params: { recapId: id } });
  };

  const join = async () => {
    onName?.(me);
    if (mode !== "live") return setPhase("live");
    setJoining(true);
    try {
      setLk(await callToken({ data: { roomId: room.id, name: me } }));
      setPhase("live");
    } catch {
      toast.error("Couldn't reach the live call service, so this is a demo call with simulated participants.");
      setMode("simulated");
      setPhase("live");
    } finally {
      setJoining(false);
    }
  };

  if (phase === "lobby") {
    return (
      <div className={cn("mx-auto", guest ? "max-w-lg px-4 py-10" : "max-w-xl")}>
        {guest ? (
          <p className="mb-6 text-center font-display text-sm font-semibold tracking-tight text-muted-foreground">
            SocConnect <span className="opacity-50">·</span> {society.shortName}
          </p>
        ) : (
          <Link to="/calls" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />All calls</Link>
        )}
        <div className="rounded-2xl border bg-card p-8 text-center shadow-soft">
          <SocietyAvatar society={society} size="lg" className="mx-auto" />
          <h1 className="mt-4 font-display text-2xl font-semibold">{room.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{society.name} · {room.description}</p>
          {mode === "simulated" && (
            <>
              <div className="mt-5 flex justify-center -space-x-2">
                {others.map((p) => <span key={p} title={p} className={cn("flex size-9 items-center justify-center rounded-full border-2 border-card text-xs font-semibold", a.soft, a.text)}>{initials(p)}</span>)}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{others.join(", ")} {room.kind === "room" ? "are hanging out" : "will be there"}</p>
            </>
          )}
          {guest || mode === "live" ? (
            <div className="mt-6 space-y-1.5 text-left">
              <Label htmlFor="call-name">Join as</Label>
              <Input id="call-name" value={nameInput ?? defaultName} onChange={(e) => setNameInput(e.target.value)} maxLength={60} placeholder="Your name" />
            </div>
          ) : null}
          <div className="mt-6 rounded-xl bg-surface p-4 text-left text-sm text-muted-foreground">
            <p className="flex items-center gap-2 font-medium text-foreground"><Wand2 className="size-4 text-primary" />AI recap is on</p>
            <p className="mt-1">Live captions turn what's said into a transcript{mode === "live" ? " shared with everyone in the call" : ""}. When you leave, AI writes a summary with decisions and action items.</p>
          </div>
          <Button size="lg" className="mt-6 w-full" onClick={join} disabled={mode === "checking" || joining}>{joining || mode === "checking" ? <Loader2 className="animate-spin" /> : <Video />}Join call</Button>
          {mode === "live" ? (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Radio className="size-3.5 text-success" />Live call: anyone who opens this room joins you</span>
              {invite && (
                <InviteDialog roomId={room.id} roomName={room.name} societyName={society.name}>
                  <Button type="button" size="sm" variant="ghost" className="h-auto px-2 text-xs"><QrCode className="size-3.5" />Share link or QR</Button>
                </InviteDialog>
              )}
            </div>
          ) : mode === "simulated" ? (
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground"><DemoBadge />Other people in the call are simulated</p>
          ) : null}
        </div>
      </div>
    );
  }

  const tiles = [me, ...others];
  const stageClass = cn(
    "flex flex-col overflow-hidden rounded-2xl bg-ink text-ink-foreground shadow-soft",
    guest ? "min-h-dvh rounded-none" : "h-[calc(100dvh-10rem)] min-h-[520px]",
  );
  const stage = (
    <>
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <SocietyAvatar society={society} size="sm" />
          <div>
            <p className="text-sm font-semibold">{room.name}</p>
            <p className="text-xs opacity-70">{society.shortName} · {clock(elapsed)}</p>
          </div>
        </div>
        {lk ? <CallHeaderCount /> : <span className="flex items-center gap-1.5 rounded-full bg-ink-foreground/10 px-3 py-1 text-xs"><span className="size-1.5 animate-pulse rounded-full bg-destructive" />AI notes on</span>}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-3 md:flex-row">
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2">
          {lk ? <LiveTiles accentSolid={a.solid} roomId={room.id} roomName={room.name} societyName={society.name} /> : tiles.map((n) => {
            const isMe = n === me;
            return (
              <div key={n} className={cn("relative flex items-center justify-center overflow-hidden rounded-2xl bg-ink-foreground/5 ring-2 ring-transparent transition", speaking === n && "ring-success")}>
                {isMe && camOn ? <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
                  : <span className={cn("flex size-20 items-center justify-center rounded-full text-2xl font-semibold", a.solid, "text-primary-foreground")}>{initials(n)}</span>}
                <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-ink/70 px-2 py-1 text-xs">
                  {isMe && !micOn && <MicOff className="size-3" />}{isMe ? `${n} (you)` : n}
                </span>
              </div>
            );
          })}
        </div>

        {showCaptions && (
          <aside className="flex h-56 shrink-0 flex-col overflow-hidden rounded-2xl bg-ink-foreground/5 md:h-auto md:w-80">
            <p className="flex items-center gap-2 border-b border-ink-foreground/10 px-4 py-3 text-sm font-semibold"><Captions className="size-4" />Live transcript{micOn && srSupported && <span className="ml-auto flex items-center gap-1 text-xs font-normal opacity-70"><span className="size-1.5 animate-pulse rounded-full bg-success" />Listening</span>}</p>
            {srIssue && <p className="border-b border-ink-foreground/10 px-4 py-2 text-xs opacity-80">{srIssue}</p>}
            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
              {transcript.length === 0 && !interim && <p className="opacity-60">Start talking — captions will show up here.</p>}
              {transcript.map((l, i) => (
                <p key={i}><span className="font-semibold">{l.speaker}</span> <span className="text-xs opacity-50">{clock(l.at)}</span><br /><span className="opacity-90">{l.text}</span></p>
              ))}
              {interim && <p className="opacity-60"><span className="font-semibold">{me}</span><br />{interim}…</p>}
              <div ref={endRef} />
            </div>
            <form className="flex gap-2 border-t border-ink-foreground/10 p-3" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { say(typed.trim()); setTyped(""); } }}>
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={srSupported ? "Type into the transcript" : "Live captions need Chrome — type instead"} className="border-ink-foreground/20 bg-transparent text-ink-foreground" />
              <Button type="submit" size="icon" variant="secondary" aria-label="Add to transcript"><Send /></Button>
            </form>
          </aside>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 pb-5">
        <Button size="icon" variant={micOn ? "secondary" : "destructive"} className="size-12 rounded-full" onClick={() => setMicOn((m) => !m)} aria-label={micOn ? "Mute" : "Unmute"}>{micOn ? <Mic /> : <MicOff />}</Button>
        <Button size="icon" variant={camOn ? "secondary" : "destructive"} className="size-12 rounded-full" onClick={() => setCamOn((c) => !c)} aria-label={camOn ? "Turn camera off" : "Turn camera on"}>{camOn ? <Video /> : <VideoOff />}</Button>
        <Button size="icon" variant="secondary" className={cn("size-12 rounded-full", !showCaptions && "opacity-60")} onClick={() => setShowCaptions((s) => !s)} aria-label="Toggle transcript"><Captions /></Button>
        <Button variant="destructive" className="h-12 rounded-full px-6" onClick={endCall} disabled={phase === "summarizing"}>
          {phase === "summarizing" ? <><Loader2 className="animate-spin" />Writing recap…</> : <><PhoneOff />Leave & summarise</>}
        </Button>
      </div>
    </>
  );

  if (lk) {
    return (
      <LiveCallRoom url={lk.url} token={lk.token} connect={phase === "live"} className={stageClass}>
        {stage}
        <LiveCallBridge micOn={micOn} camOn={camOn} sendRef={sendRef} onRemoteLine={addLine} onParticipants={onParticipants} />
      </LiveCallRoom>
    );
  }
  return <div className={stageClass}>{stage}</div>;
}
