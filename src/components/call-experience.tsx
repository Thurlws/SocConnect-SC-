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
import { useData } from "@/lib/api/store";
import { summarizeCall, transcribeClip, transcribeGuestClip } from "@/lib/calls.functions";
import { getCallMode, getCallToken, getGuestToken } from "@/lib/livekit.functions";
import { CallHeaderCount, LiveCallBridge, LiveCallRoom, LiveTiles } from "@/components/live-call";
import { InviteDialog } from "@/components/invite-dialog";
import type { CallSummary, CallRoom, Society, TranscriptLine } from "@/lib/types";
import { SocietyAvatar, accentClasses } from "@/components/society-avatar";
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
  inviteCode,
}: {
  room: CallRoom;
  society: Society;
  guest?: boolean;
  defaultName: string;
  onName?: (name: string) => void;
  onEnded?: () => void;
  /** Guests join with a committee-made invite code instead of an account. */
  inviteCode?: string;
}) {
  const { refresh } = useData();
  const navigate = useNavigate();
  const summarize = useServerFn(summarizeCall);
  const transcribeMember = useServerFn(transcribeClip);
  const transcribeGuest = useServerFn(transcribeGuestClip);
  const guestToken = useServerFn(getGuestToken);
  const flushRef = useRef<(() => Promise<void>) | null>(null);
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
  // "live" = real call via LiveKit; "unavailable" = calls aren't configured yet.
  const [mode, setMode] = useState<"checking" | "live" | "unavailable">("checking");
  // Consent: captions (and so the recap) can be switched off by anyone at any time.
  const [captionsOn, setCaptionsOn] = useState(true);
  const [remoteCaptions, setRemoteCaptions] = useState(false);
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
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const addLine = useCallback((speaker: string, text: string) => setTranscript((t) => { const n = [...t, { speaker, text, at: elapsedRef.current }]; transcriptRef.current = n; return n; }), []);
  /** Your own words: add to the transcript and share with everyone in a live call. */
  const say = (text: string) => { addLine(me, text); sendRef.current?.(text, me); };
  const onParticipants = useCallback((names: string[]) => names.forEach((n) => seenRef.current.add(n)), []);

  useEffect(() => {
    let cancelled = false;
    callMode().then((r) => !cancelled && setMode(r.live ? "live" : "unavailable")).catch(() => !cancelled && setMode("unavailable"));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== "live") return;
    const i = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(i);
  }, [phase]);

  // Live speech-to-text: record the mic in short clips and transcribe each with AI.
  // Works in every browser (the built-in browser captions often fail with "network").
  useEffect(() => {
    if (phase !== "live" || !captionsOn) return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) { setSrSupported(false); return; }
    let stopped = false;
    let stream: MediaStream | null = null;
    let rec: MediaRecorder | null = null;
    let ctx: AudioContext | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let heard = false;
    const pending = new Set<Promise<void>>();
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported?.(m)) ?? "";

    const upload = (blob: Blob) => {
      const job = (async () => {
        const buf = new Uint8Array(await blob.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        setInterim("transcribing");
        interimRef.current = "";
        try {
          const clip = { audio: btoa(bin), mime: blob.type || mime || "audio/webm" };
          const r = inviteCode ? await transcribeGuest({ data: { ...clip, code: inviteCode } }) : await transcribeMember({ data: clip });
          if (r.text) { say(r.text); setSrIssue(null); }
          else if (r.error) setSrIssue(`Captions: ${r.error}`);
        } catch { setSrIssue("Captions couldn't reach the server — retrying…"); }
        finally { setInterim(""); }
      })();
      pending.add(job);
      void job.finally(() => pending.delete(job));
      return job;
    };

    const startClip = () => {
      if (stopped || !stream) return;
      heard = false;
      const chunks: Blob[] = [];
      const r = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      rec = r;
      r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      r.onstop = () => {
        const blob = new Blob(chunks, { type: (r.mimeType || mime || "audio/webm").split(";")[0] ?? "audio/webm" });
        if (heard && blob.size > 2000) void upload(blob);
        if (!stopped) startClip();
      };
      r.start();
      timer = setTimeout(() => { if (r.state === "recording") r.stop(); }, 7000);
    };

    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then((s) => {
      if (stopped) return s.getTracks().forEach((t) => t.stop());
      stream = s;
      s.getAudioTracks().forEach((t) => (t.enabled = micRef.current));
      // Only send clips that contain sound, so silence isn't transcribed.
      try {
        ctx = new AudioContext();
        const an = ctx.createAnalyser();
        an.fftSize = 512;
        ctx.createMediaStreamSource(s).connect(an);
        const data = new Uint8Array(an.fftSize);
        const tick = () => {
          if (stopped || !ctx) return;
          an.getByteTimeDomainData(data);
          let peak = 0;
          for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
          if (peak > 12 && micRef.current) { heard = true; setSpeaking(me); } else setSpeaking((x) => (x === me ? null : x));
          requestAnimationFrame(tick);
        };
        tick();
      } catch { heard = true; }
      startClip();
    }).catch(() => { setSrSupported(false); setSrIssue("Captions are blocked — allow the microphone, or type below."); });

    flushRef.current = async () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (rec && rec.state === "recording") await new Promise<void>((res) => { const r = rec!; const prev = r.onstop; r.onstop = (ev) => { (prev as ((e: Event) => void) | null)?.call(r, ev); res(); }; r.stop(); });
      await Promise.all([...pending]);
    };
    recRef.current = { setEnabled: (on: boolean) => stream?.getAudioTracks().forEach((t) => (t.enabled = on)) } as unknown as SR;
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      try { if (rec?.state === "recording") rec.stop(); } catch { /* noop */ }
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
      recRef.current = null;
      flushRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, captionsOn]);

  useEffect(() => {
    (recRef.current as unknown as { setEnabled?: (on: boolean) => void } | null)?.setEnabled?.(micOn);
  }, [micOn]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [transcript, interim]);

  const leave = () => { if (onEnded) onEnded(); else navigate({ to: "/calls" }); };

  const endCall = async () => {
    // Transcribe the words still being recorded when Leave was pressed.
    const flush = flushRef.current;
    flushRef.current = null;
    if (flush) { setPhase("summarizing"); await flush().catch(() => undefined); }
    recRef.current = null;
    const lines = transcriptRef.current;
    if (guest) return leave();
    if (lines.length === 0) {
      toast.message("No captions were captured, so there's no recap.", { description: captionsOn ? "Make sure the microphone is allowed and on. You can also type into the transcript." : "Captions were off for this call." });
      return leave();
    }
    setPhase("summarizing");
    try {
      const r = await summarize({ data: { roomId: room.id, transcript: lines, durationSec: elapsedRef.current } });
      if (r.source === "fallback") toast.message("AI summary unavailable, so we saved a basic recap from the transcript.");
      await refresh();
      navigate({ to: "/recaps/$recapId", params: { recapId: r.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the recap.");
      leave();
    }
  };

  const join = async () => {
    onName?.(me);
    if (mode !== "live") return;
    setJoining(true);
    try {
      const t = inviteCode ? await guestToken({ data: { code: inviteCode, name: me } }) : await callToken({ data: { roomId: room.id } });
      setLk({ url: t.url, token: t.token });
      setPhase("live");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't join the call.");
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
          <p className="mt-1 text-sm text-muted-foreground">{society.name}: {room.description}</p>
          {guest ? (
            <div className="mt-6 space-y-1.5 text-left">
              <Label htmlFor="call-name">Join as</Label>
              <Input id="call-name" value={nameInput ?? defaultName} onChange={(e) => setNameInput(e.target.value)} maxLength={60} placeholder="Your name" />
            </div>
          ) : null}
          <div className="mt-6 rounded-xl bg-surface p-4 text-left text-sm text-muted-foreground">
            <p className="flex items-center gap-2 font-medium text-foreground"><Wand2 className="size-4 text-primary" />Captions and an AI recap</p>
            <p className="mt-1">By joining you agree that what you say is captioned, shared with everyone in the call, and used for an AI recap that participants and the committee can read. Transcripts are deleted after 7 days; summaries are kept. You can turn your captions off at any time with the captions button.</p>
          </div>
          <Button size="lg" className="mt-6 w-full" onClick={join} disabled={mode !== "live" || joining}>{joining || mode === "checking" ? <Loader2 className="animate-spin" /> : <Video />}Join call</Button>
          {mode === "live" ? (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Radio className="size-3.5 text-success" />Live call</span>
              {!guest && (
                <InviteDialog roomId={room.id} roomName={room.name} societyName={society.name}>
                  <Button type="button" size="sm" variant="ghost" className="h-auto px-2 text-xs"><QrCode className="size-3.5" />Guest link or QR</Button>
                </InviteDialog>
              )}
            </div>
          ) : mode === "unavailable" ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">Calls aren't available yet. Ask a platform admin to set up the call service.</p>
          ) : null}
        </div>
      </div>
    );
  }

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
            <p className="text-xs opacity-70">{society.shortName}, {clock(elapsed)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(captionsOn || remoteCaptions) && <span className="flex items-center gap-1.5 rounded-full bg-ink-foreground/10 px-3 py-1 text-xs" title="What's said is captioned and used for the AI recap"><span className="size-1.5 animate-pulse rounded-full bg-destructive" />Captions on{captionsOn ? "" : " (others)"}</span>}
          {lk && <CallHeaderCount />}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-3 md:flex-row">
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2">
          {lk && <LiveTiles accentSolid={a.solid} roomId={room.id} roomName={room.name} societyName={society.name} />}
        </div>

        {showCaptions && (
          <aside className="flex h-56 shrink-0 flex-col overflow-hidden rounded-2xl bg-ink-foreground/5 md:h-auto md:w-80">
            <p className="flex items-center gap-2 border-b border-ink-foreground/10 px-4 py-3 text-sm font-semibold"><Captions className="size-4" />Live transcript{captionsOn && micOn && srSupported && <span className="ml-auto flex items-center gap-1 text-xs font-normal opacity-70"><span className="size-1.5 animate-pulse rounded-full bg-success" />Listening</span>}</p>
            {srIssue && <p className="border-b border-ink-foreground/10 px-4 py-2 text-xs opacity-80">{srIssue}</p>}
            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
              {transcript.length === 0 && !interim && <p className="opacity-60">Start talking — captions will show up here.</p>}
              {transcript.map((l, i) => (
                <p key={i}><span className="font-semibold">{l.speaker}</span> <span className="text-xs opacity-50">{clock(l.at)}</span><br /><span className="opacity-90">{l.text}</span></p>
              ))}
              {interim && <p className="opacity-60">Transcribing…</p>}
              <div ref={endRef} />
            </div>
            <form className="flex gap-2 border-t border-ink-foreground/10 p-3" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { say(typed.trim()); setTyped(""); } }}>
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={srSupported ? "Type into the transcript" : "Captions unavailable — type instead"} className="border-ink-foreground/20 bg-transparent text-ink-foreground" />
              <Button type="submit" size="icon" variant="secondary" aria-label="Add to transcript"><Send /></Button>
            </form>
          </aside>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 pb-5">
        <Button size="icon" variant={micOn ? "secondary" : "destructive"} className="size-12 rounded-full" onClick={() => setMicOn((m) => !m)} aria-label={micOn ? "Mute" : "Unmute"}>{micOn ? <Mic /> : <MicOff />}</Button>
        <Button size="icon" variant={camOn ? "secondary" : "destructive"} className="size-12 rounded-full" onClick={() => setCamOn((c) => !c)} aria-label={camOn ? "Turn camera off" : "Turn camera on"}>{camOn ? <Video /> : <VideoOff />}</Button>
        <Button size="icon" variant={captionsOn ? "secondary" : "destructive"} className="size-12 rounded-full" onClick={() => { setCaptionsOn((c) => !c); toast.message(captionsOn ? "Your captions are off — what you say won't be in the transcript." : "Your captions are on."); }} aria-label={captionsOn ? "Turn my captions off" : "Turn my captions on"} title={captionsOn ? "Turn my captions off" : "Turn my captions on"}><Captions /></Button>
        <Button size="icon" variant="secondary" className={cn("size-12 rounded-full", !showCaptions && "opacity-60")} onClick={() => setShowCaptions((s) => !s)} aria-label="Show or hide the transcript panel"><Send /></Button>
        <Button variant="destructive" className="h-12 rounded-full px-6" onClick={endCall} disabled={phase === "summarizing"}>
          {phase === "summarizing" ? <><Loader2 className="animate-spin" />{guest ? "Leaving…" : "Writing recap…"}</> : <><PhoneOff />{guest ? "Leave call" : "Leave & summarise"}</>}
        </Button>
      </div>
    </>
  );

  if (lk) {
    return (
      <LiveCallRoom url={lk.url} token={lk.token} connect={phase === "live"} className={stageClass}>
        {stage}
        <LiveCallBridge micOn={micOn} camOn={camOn} sendRef={sendRef} onRemoteLine={(sp, t) => { setRemoteCaptions(true); addLine(sp, t); }} onParticipants={onParticipants} />
      </LiveCallRoom>
    );
  }
  return <div className={stageClass}>{stage}</div>;
}
