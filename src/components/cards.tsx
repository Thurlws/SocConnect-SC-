import { Link } from "@tanstack/react-router";
import { CalendarDays, Check, Clock, MapPin, Users } from "lucide-react";
import { useData } from "@/lib/api/store";
import { dayParts, formatDate } from "@/lib/format";
import type { Event, Society } from "@/lib/types";
import { SocietyAvatar, accentClasses } from "@/components/society-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function EventCard({ event, compact = false }: { event: Event; compact?: boolean }) {
  const { getSociety, attendeeCount, eventAvailability } = useData();
  const soc = getSociety(event.societyId)!;
  const { day, month } = dayParts(event.date);
  const count = attendeeCount(event);
  const availability = eventAvailability(event);
  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="card-interactive group flex flex-col overflow-hidden rounded-xl border bg-card"
    >
      <div className={cn("flex items-center justify-between gap-3 border-b px-4 py-3", accentClasses[soc.accent].soft)}>
        <div className="flex items-baseline gap-1.5">
          <span className="font-wide text-2xl font-bold leading-none">{day}</span>
          <span className="text-sm font-semibold">{month}</span>
        </div>
        <SocietyAvatar society={soc} size="sm" className="bg-card" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className={cn("text-xs font-semibold", accentClasses[soc.accent].text)}>{soc.shortName}</p>
        <h3 className="text-base font-semibold leading-snug decoration-highlight decoration-[3px] underline-offset-4 group-hover:underline">{event.title}</h3>
        {!compact && <p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>}
        <div className="mt-auto flex flex-col gap-1 pt-2 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5"><Clock className="size-3.5" />{formatDate(event.date)}, {event.start}{event.end ? `–${event.end}` : ""}</p>
          <p className="flex items-center gap-1.5"><MapPin className="size-3.5" />{event.venue}</p>
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3.5" />{event.capacity ? `${count} of ${event.capacity} going` : `${count} going`}</span>
          {availability === "registered" ? (
            <Badge variant="highlight"><Check className="size-3" />Registered</Badge>
          ) : availability === "full" ? (
            <Badge variant="outline">Full</Badge>
          ) : availability === "past" ? (
            <Badge variant="outline">Ended</Badge>
          ) : (
            <Badge variant="outline">Open</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}

export function SocietyCard({ society, reason, action }: { society: Society; reason?: string; action?: ReactNode }) {
  const { membership } = useData();
  const status = membership(society.id);
  return (
    <div className="card-interactive relative flex flex-col rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <SocietyAvatar society={society} />
        {status === "member" && <Badge variant="highlight"><Check className="size-3" />Member</Badge>}
        {status === "pending" && <Badge variant="outline">Pending</Badge>}
      </div>
      <Link to="/societies/$societyId" params={{ societyId: society.id }} className="mt-4 after:absolute after:inset-0">
        <h3 className="text-base font-semibold leading-snug decoration-highlight decoration-[3px] underline-offset-4 hover:underline">{society.name}</h3>
      </Link>
      <p className="mt-0.5 text-xs text-muted-foreground">{society.category}</p>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{society.tagline}</p>
      {reason && <p className="mt-3 border-l-2 border-teal pl-3 text-xs text-foreground">{reason}</p>}
      <p className="mt-3 text-xs text-muted-foreground">{[society.campus && `${society.campus} campus`, `${society.memberCount} members`].filter(Boolean).join(", ")}</p>
      {society.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {society.tags.map((t) => (
            <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t}</span>
          ))}
        </div>
      )}
      {action && <div className="relative z-10 mt-auto pt-4">{action}</div>}
    </div>
  );
}

export function SectionHeader({ title, action, subtitle }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon = CalendarDays, title, body, action }: { icon?: typeof CalendarDays; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
      <Icon className="size-6 text-muted-foreground" aria-hidden />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return <span className={cn("rounded-md border border-dashed px-2 py-0.5 text-xs font-medium text-muted-foreground", className)}>Demo</span>;
}
