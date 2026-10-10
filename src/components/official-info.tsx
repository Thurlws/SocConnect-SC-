import { ExternalLink, Facebook, Globe, Instagram, Link2, Linkedin, Mail, MessageCircle, Music2, Twitter, Youtube, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeHref } from "@/lib/utils";
import type { Society, SocietyLinkKind } from "@/lib/types";

const linkMeta: Record<SocietyLinkKind, { icon: LucideIcon; label: string }> = {
  website: { icon: Globe, label: "Website" }, instagram: { icon: Instagram, label: "Instagram" }, tiktok: { icon: Music2, label: "TikTok" },
  facebook: { icon: Facebook, label: "Facebook" }, linkedin: { icon: Linkedin, label: "LinkedIn" }, x: { icon: Twitter, label: "X" },
  youtube: { icon: Youtube, label: "YouTube" }, discord: { icon: MessageCircle, label: "Discord" }, linktree: { icon: Link2, label: "Linktree" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp" }, other: { icon: ExternalLink, label: "Link" },
};

/** Membership, contact and links published on the society's official TU Dublin profile. */
export function OfficialInfo({ society: s }: { society: Society }) {
  const join = safeHref(s.joinUrl);
  const official = safeHref(s.officialUrl);
  const links = (s.links ?? []).flatMap((l) => { const href = safeHref(l.url); return href ? [{ ...l, href }] : []; });
  if (!join && !official && !s.contactEmail && !links.length) return null;
  return (
    <div className="rounded-xl border bg-card p-5 text-sm shadow-soft">
      <p className="font-semibold">Official TU Dublin details</p>
      {join && (
        <Button asChild size="sm" className="mt-3 w-full">
          <a href={join} target="_blank" rel="noopener noreferrer"><ExternalLink />Join on MyStudentLife</a>
        </Button>
      )}
      <ul className="mt-3 space-y-2">
        {s.contactEmail && (
          <li><a href={`mailto:${s.contactEmail}`} className="flex items-center gap-2 break-all text-muted-foreground hover:text-primary"><Mail className="size-4 shrink-0" />{s.contactEmail}</a></li>
        )}
        {links.map((l) => { const { icon: I, label } = linkMeta[l.kind] ?? linkMeta.other; return (
          <li key={l.href}><a href={l.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-primary"><I className="size-4 shrink-0" /><span className="truncate">{l.label ?? label}</span></a></li>
        ); })}
      </ul>
      {official && <a href={official} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">From societies.tudublin.ie<ExternalLink className="size-3" /></a>}
    </div>
  );
}
