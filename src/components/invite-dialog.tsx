import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, QrCode } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { inviteUrl } from "@/lib/invite";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Share a call the way Zoom does: one link, or a QR code a phone can scan.
 * The link opens /join/$roomId — the call on its own, no sign-in and no membership check.
 */
export function InviteDialog({
  roomId,
  roomName,
  societyName,
  children,
}: {
  roomId: string;
  roomName: string;
  societyName?: string | undefined;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Only computed once the dialog is open on a real page, so SSR never encodes "null".
  useEffect(() => {
    if (open) setUrl(inviteUrl(roomId, window.location.origin));
  }, [open, roomId]);

  const copy = () => {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        toast.success("Call link copied");
      },
      () => toast.message(url),
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite people to this call</DialogTitle>
          <DialogDescription>
            {societyName ? `${societyName} · ` : ""}
            {roomName}. Anyone who opens the link or scans the code joins straight away.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border">
            {url ? (
              <QRCodeSVG
                value={url}
                size={196}
                level="M"
                marginSize={2}
                fgColor="currentColor"
                bgColor="transparent"
                title={`Join ${roomName}`}
                className="text-foreground"
              />
            ) : (
              <div className="flex size-[196px] items-center justify-center text-sm text-muted-foreground">
                Opening…
              </div>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Point a phone camera at the code — it opens the call on that phone.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input readOnly value={url ?? ""} aria-label="Call invite link" onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
          <Button type="button" size="icon" variant="outline" onClick={copy} aria-label="Copy call link">
            {copied ? <Check className="text-success" /> : <Copy />}
          </Button>
        </div>

        <Button
          variant="outline"
          className={cn("w-full", copied && "border-success/40")}
          onClick={() => {
            setOpen(false);
            copy();
          }}
        >
          <QrCode />
          Copy link instead
        </Button>
      </DialogContent>
    </Dialog>
  );
}
