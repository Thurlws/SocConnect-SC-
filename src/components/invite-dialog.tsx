import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Link2, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { inviteUrl } from "@/lib/invite";
import { useData } from "@/lib/api/store";
import { createCallInvite } from "@/lib/livekit.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EXPIRY = [{ h: 1, l: "1 hour" }, { h: 24, l: "1 day" }, { h: 168, l: "7 days" }];
const USES = [5, 20, 100];

/**
 * Guest links: committee members create a link (and QR code) that expires and has a use limit.
 * Only the society's committee sees this; everyone else gets nothing to click.
 */
export function InviteDialog({ roomId, roomName, societyName, children }: { roomId: string; roomName: string; societyName?: string | undefined; children: ReactNode }) {
  const { getRoom, canManage } = useData();
  const create = useServerFn(createCallInvite);
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("24");
  const [uses, setUses] = useState("20");
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const room = getRoom(roomId);
  if (!room || !canManage(room.societyId)) return null;

  const make = async () => {
    setBusy(true);
    try {
      const r = await create({ data: { roomId, hours: Number(hours), maxUses: Number(uses) } });
      setUrl(inviteUrl(r.code, window.location.origin));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create a link.");
    } finally {
      setBusy(false);
    }
  };
  const copy = () => {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); toast.success("Guest link copied"); }, () => toast.message(url));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setUrl(null); setCopied(false); } }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite guests to this call</DialogTitle>
          <DialogDescription>
            {societyName ? `${societyName} · ` : ""}{roomName}. Guests join without an account. Members can just open the room in SocConnect.
          </DialogDescription>
        </DialogHeader>
        {!url ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Link works for</Label>
                <Select value={hours} onValueChange={setHours}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPIRY.map((e) => <SelectItem key={e.h} value={String(e.h)}>{e.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Number of joins</Label>
                <Select value={uses} onValueChange={setUses}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{USES.map((u) => <SelectItem key={u} value={String(u)}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={make} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Link2 />}Create guest link</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border">
                <QRCodeSVG value={url} size={196} level="M" marginSize={2} fgColor="currentColor" bgColor="transparent" title={`Join ${roomName}`} className="text-foreground" />
              </div>
              <p className="text-center text-xs text-muted-foreground">Point a phone camera at the code to open the call on that phone.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input readOnly value={url} aria-label="Guest call link" onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
              <Button type="button" size="icon" variant="outline" onClick={copy} aria-label="Copy guest link">{copied ? <Check className="text-success" /> : <Copy />}</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
