import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Inbox, MessageSquarePlus, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useDemo } from "@/lib/demo-store";
import { timeAgo } from "@/lib/format";
import {
  REQUEST_STATUSES,
  categoryLabel,
  inboxOrder,
  priorityLabel,
  statusLabel,
} from "@/lib/support-requests";
import type {
  SupportRequest,
  SupportRequestCategory,
  SupportRequestPriority,
  SupportRequestStatus,
} from "@/lib/types";
import { SocietyAvatar, accentClasses } from "@/components/society-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const statusVariant = {
  open: "soft",
  in_progress: "warning",
  resolved: "success",
} as const satisfies Record<SupportRequestStatus, "soft" | "warning" | "success">;

export function RequestStatusBadge({ status }: { status: SupportRequestStatus }) {
  return <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: SupportRequestPriority }) {
  if (priority !== "high") return null;
  return (
    <Badge variant="outline" className="border-destructive/30 text-destructive">
      High priority
    </Badge>
  );
}

/** OPEN → IN PROGRESS → RESOLVED, so the lifecycle is obvious at a glance. */
export function RequestProgress({ status }: { status: SupportRequestStatus }) {
  const current = REQUEST_STATUSES.indexOf(status);
  return (
    <ol className="flex items-center gap-2" aria-label="Request progress">
      {REQUEST_STATUSES.map((step, i) => {
        const done = i < current || status === "resolved";
        const active = i === current && status !== "resolved";
        return (
          <li key={step} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                done && "bg-success text-primary-foreground",
                active && "bg-primary text-primary-foreground ring-4 ring-primary-soft",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "whitespace-nowrap text-xs font-medium",
                done || active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {statusLabel[step]}
            </span>
            {i < REQUEST_STATUSES.length - 1 && (
              <span className={cn("h-px flex-1", i < current ? "bg-success" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function RequestRow({
  request: r,
  showSubmitter = false,
}: {
  request: SupportRequest;
  showSubmitter?: boolean;
}) {
  const { getSociety } = useDemo();
  const s = getSociety(r.societyId);
  return (
    <Link
      to="/requests/$requestId"
      params={{ requestId: r.id }}
      className="card-interactive flex items-start gap-4 rounded-xl border bg-card p-4 shadow-soft"
    >
      {s && <SocietyAvatar society={s} size="sm" />}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {s && (
            <span className={cn("font-semibold", accentClasses[s.accent].text)}>{s.shortName}</span>
          )}
          <span>· {categoryLabel[r.category]}</span>
          <span>· {timeAgo(r.createdAt)}</span>
        </p>
        <p className="mt-1 truncate font-semibold">{r.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          {showSubmitter && <span>From {r.submitterName}</span>}
          <span className="flex items-center gap-1">
            <UserRound className="size-3" />
            {r.assignedTo ?? "Unassigned"}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <RequestStatusBadge status={r.status} />
        <PriorityBadge priority={r.priority} />
      </div>
    </Link>
  );
}

const categories = Object.keys(categoryLabel) as SupportRequestCategory[];
const priorities = Object.keys(priorityLabel) as SupportRequestPriority[];

export function NewRequestDialog({
  defaultSocietyId,
  trigger,
}: {
  defaultSocietyId?: string;
  trigger?: ReactNode;
}) {
  const { joinedSocieties, submitSupportRequest } = useDemo();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const blank = {
    societyId: defaultSocietyId ?? joinedSocieties[0]?.id ?? "",
    category: "question" as SupportRequestCategory,
    priority: "normal" as SupportRequestPriority,
    title: "",
    description: "",
  };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState("");
  const society = joinedSocieties.find((s) => s.id === f.societyId);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setF(blank);
          setErr("");
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <MessageSquarePlus />
            New request
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Contact a committee</DialogTitle>
          <DialogDescription>
            Your request goes straight to the society's committee. You can track its status and
            replies here instead of chasing a group chat.
          </DialogDescription>
        </DialogHeader>
        {joinedSocieties.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Join a society first. Requests go to the committees of societies you're a member of.
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (f.title.trim().length < 5 || f.description.trim().length < 10) {
                setErr("Add a title (5+ characters) and some detail (10+ characters).");
                return;
              }
              const id = submitSupportRequest({
                societyId: f.societyId,
                category: f.category,
                priority: f.priority,
                title: f.title.trim(),
                description: f.description.trim(),
              });
              if (!id) {
                setErr("You need to be a member of this society to contact its committee.");
                return;
              }
              toast.success(`Sent to the ${society?.shortName} committee`);
              setOpen(false);
              navigate({ to: "/requests/$requestId", params: { requestId: id } });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Society</Label>
                <Select value={f.societyId} onValueChange={(v) => setF({ ...f, societyId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a society" />
                  </SelectTrigger>
                  <SelectContent>
                    {joinedSocieties.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={f.category}
                  onValueChange={(v) => setF({ ...f, category: v as SupportRequestCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {categoryLabel[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-title">Title</Label>
              <Input
                id="req-title"
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
                maxLength={120}
                placeholder="e.g. Can I borrow a laptop for the workshop?"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-desc">Details</Label>
              <Textarea
                id="req-desc"
                rows={4}
                value={f.description}
                onChange={(e) => setF({ ...f, description: e.target.value })}
                maxLength={2000}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <div className="flex gap-2">
                {priorities.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setF({ ...f, priority: p })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                      f.priority === p
                        ? "border-primary bg-primary-soft text-primary"
                        : "bg-card hover:border-primary/40",
                    )}
                    aria-pressed={f.priority === p}
                  >
                    {priorityLabel[p]}
                  </button>
                ))}
              </div>
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Send request</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Compact inbox preview for the committee dashboard. */
export function CommitteeRequestsSummary({ societyId }: { societyId: string }) {
  const { supportRequests } = useDemo();
  const mine = supportRequests.filter((r) => r.societyId === societyId);
  const open = mine.filter((r) => r.status === "open").length;
  const inProgress = mine.filter((r) => r.status === "in_progress").length;
  const top = mine
    .filter((r) => r.status !== "resolved")
    .sort(inboxOrder)
    .slice(0, 3);

  return (
    <section className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Inbox className="size-4 text-primary" />
            Member requests
          </h2>
          <p className="text-sm text-muted-foreground">
            {open} open · {inProgress} in progress
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/inbox">
            Open inbox
            <ArrowRight />
          </Link>
        </Button>
      </div>
      <div className="mt-4 space-y-2">
        {top.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nothing waiting. Every request has been resolved.
          </p>
        )}
        {top.map((r) => (
          <Link
            key={r.id}
            to="/requests/$requestId"
            params={{ requestId: r.id }}
            className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:border-primary/30"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{r.title}</span>
              <span className="text-xs text-muted-foreground">
                {r.submitterName} · {timeAgo(r.createdAt)}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <PriorityBadge priority={r.priority} />
              <RequestStatusBadge status={r.status} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
