import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  VideoTrack,
  isTrackReference,
  useDataChannel,
  useIsMuted,
  useIsSpeaking,
  useLocalParticipant,
  useParticipants,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track, type Participant } from "livekit-client";
import { MicOff, QrCode, Users } from "lucide-react";
import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InviteDialog } from "@/components/invite-dialog";

const TRANSCRIPT_TOPIC = "transcript";
// Stable literals for useTracks: a fresh array/options object on every render makes the
// hook re-subscribe, and the tiles briefly lose everyone but you — it looks like people
// are dropping out of the call.
const CAMERA_TRACKS = [{ source: Track.Source.Camera, withPlaceholder: true }];
const ALL_TRACKS = { onlySubscribed: false };
const initials = (n: string) =>
  n
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Real multi-person call room. Children render inside the LiveKit room context. */
export function LiveCallRoom({
  url,
  token,
  connect,
  className,
  children,
}: {
  url: string;
  token: string;
  connect: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect={connect}
      audio
      video
      className={className}
      onError={(e) => toast.error(`Call connection problem: ${e.message}`)}
      onMediaDeviceFailure={() =>
        toast.message("Camera or mic not available. Others can still see your name and captions.")
      }
    >
      {children}
      <RoomAudioRenderer />
      <StartAudio
        label="Click to hear the call"
        className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lift"
      />
    </LiveKitRoom>
  );
}

/**
 * Keeps mic/camera in sync with the page's buttons, shares this person's captions with everyone
 * in the room, and reports who has been in the call (for the recap).
 */
export function LiveCallBridge({
  micOn,
  camOn,
  sendRef,
  onRemoteLine,
  onParticipants,
}: {
  micOn: boolean;
  camOn: boolean;
  sendRef: MutableRefObject<((text: string, speaker: string) => void) | null>;
  onRemoteLine: (speaker: string, text: string) => void;
  onParticipants: (names: string[]) => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const onLine = useRef(onRemoteLine);
  onLine.current = onRemoteLine;

  useEffect(() => {
    localParticipant.setMicrophoneEnabled(micOn).catch(() => {});
  }, [localParticipant, micOn]);
  useEffect(() => {
    localParticipant.setCameraEnabled(camOn).catch(() => {});
  }, [localParticipant, camOn]);

  const { send } = useDataChannel(TRANSCRIPT_TOPIC, (msg) => {
    try {
      const line = JSON.parse(new TextDecoder().decode(msg.payload)) as {
        speaker?: string;
        text?: string;
      };
      const speaker = line.speaker || msg.from?.name || "Someone";
      if (line.text) onLine.current(speaker, line.text);
    } catch {
      /* ignore malformed messages */
    }
  });

  useEffect(() => {
    sendRef.current = (text, speaker) => {
      send(new TextEncoder().encode(JSON.stringify({ speaker, text })), { reliable: true }).catch(
        () => {},
      );
    };
    return () => {
      sendRef.current = null;
    };
  }, [send, sendRef]);

  const names = participants.map((p) => p.name || p.identity).join("|");
  useEffect(() => {
    onParticipants(names.split("|").filter(Boolean));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names]);

  return null;
}

/** Video tiles for everyone in the room, plus an invite card while you're alone. */
export function LiveTiles({ accentSolid, roomId, roomName, societyName }: { accentSolid: string; roomId: string; roomName: string; societyName?: string | undefined }) {
  const tracks = useTracks(CAMERA_TRACKS, ALL_TRACKS);
  const participants = useParticipants();
  // Tiles follow the people in the room, not the video tracks: someone whose
  // camera hasn't arrived yet still gets a tile with their initials, so the call
  // never looks like a person dropped out.
  const covered = new Set(tracks.map((t) => t.participant.identity));
  const cameraless = participants.filter((p) => !covered.has(p.identity));
  return (
    <>
      {tracks.map((t) => (
        <LiveTile
          key={t.participant.identity}
          participant={t.participant}
          trackRef={t}
          accentSolid={accentSolid}
        />
      ))}
      {cameraless.map((p) => (
        <LiveTile key={p.identity} participant={p} accentSolid={accentSolid} />
      ))}
      {participants.length <= 1 && <InviteTile roomId={roomId} roomName={roomName} societyName={societyName} />}
    </>
  );
}

/** "2 in the call" — counts everyone the room actually knows about. */
export function CallHeaderCount() {
  const participants = useParticipants();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">
      <span className="size-2 animate-pulse rounded-full bg-success" />
      {participants.length} in the call
    </span>
  );
}

function LiveTile({
  participant,
  trackRef,
  accentSolid,
}: {
  participant: Participant;
  trackRef?: TrackReferenceOrPlaceholder | undefined;
  accentSolid: string;
}) {
  const speaking = useIsSpeaking(participant);
  const camMuted = useIsMuted({ participant, source: Track.Source.Camera });
  const micMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const name = participant.name || participant.identity;
  const showVideo = trackRef !== undefined && isTrackReference(trackRef) && !camMuted;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl bg-ink-foreground/5 ring-2 ring-transparent transition",
        speaking && "ring-success",
      )}
    >
      {showVideo ? (
        <VideoTrack
          trackRef={trackRef}
          className={cn("h-full w-full object-cover", participant.isLocal && "-scale-x-100")}
        />
      ) : (
        <span
          className={cn(
            "flex size-20 items-center justify-center rounded-full text-2xl font-semibold text-primary-foreground",
            accentSolid,
          )}
        >
          {initials(name)}
        </span>
      )}
      <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-ink/70 px-2 py-1 text-xs">
        {micMuted && <MicOff className="size-3" />}
        {participant.isLocal ? `${name} (you)` : name}
      </span>
    </div>
  );
}

function InviteTile({ roomId, roomName, societyName }: { roomId: string; roomName: string; societyName?: string | undefined }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-foreground/20 p-6 text-center">
      <Users className="size-6 opacity-60" />
      <p className="text-sm font-semibold">Waiting for others to join</p>
      <p className="max-w-xs text-xs opacity-70">
        Point a phone camera at the code, or send the link — it opens this call straight away.
      </p>
      <InviteDialog roomId={roomId} roomName={roomName} societyName={societyName}>
        <Button size="sm" variant="secondary"><QrCode />Show QR & link</Button>
      </InviteDialog>
    </div>
  );
}
