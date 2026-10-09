import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Lock,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useData } from "@/lib/api/store";
import { formatDate, timeAgo } from "@/lib/format";
import { categoryLabel, priorityLabel, statusLabel } from "@/lib/support-requests";
import type { SupportRequest, SupportRequestActivity } from "@/lib/types";
import { EmptyState } from "@/components/cards";
import { SocietyAvatar, accentClasses } from "@/components/society-avatar";
import { PriorityBadge, RequestProgress, RequestStatusBadge } from "@/components/support-requests";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/_authenticated/requests/$requestId")({
  head: () => ({
    meta: [
      { title: "Request · SocConnect" },
      { name: "description", content: "A member request to a society committee." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequestPage,
});

const UNASSIGNED = "__unassigned";

const activityIcon: Record<SupportRequestActivity["kind"], typeof Send> = {
  created: Send,
  status: CircleDot,
  assigned: UserRound,
  comment: MessageSquare,
};

function RequestPage() {
  const { requestId } = Route.useParams();
  const { getSupportRequest, canViewRequest, canManageRequest, getSociety, loaded } = useData();
  const r = getSupportRequest(requestId);

  if (!r || !canViewRequest(r)) {
    // Wait for saved demo state before deciding a newly created request doesn't exist.
    if (!loaded) return null;
    return (
      <EmptyState
        icon={Lock}
        title="Request not found"
        body="It doesn't exist, or you can't see it. Requests are only visible to the member who sent them and that society's committee."
        action={
          <Button asChild>
            <Link to="/requests">My requests</Link>
          </Button>
        }
      />
    );
  }

  const s = getSociety(r.societyId)!;
  const manage = canManageRequest(r);

  return (
    <div>
      <Link
        to={manage ? "/inbox" : "/requests"}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {manage ? "Request inbox" : "My requests"}
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border bg-card p-6 shadow-soft">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <SocietyAvatar society={s} size="xs" />
              <span className={cn("font-semibold", accentClasses[s.accent].text)}>{s.name}</span>
              <span>· {categoryLabel[r.category]}</span>
              <RequestStatusBadge status={r.status} />
              <PriorityBadge priority={r.priority} />
            </div>
            <h1 className="mt-3 text-2xl font-semibold">{r.title}</h1>
            <div className="mt-6">
              <RequestProgress status={r.status} />
            </div>
            <p className="mt-6 whitespace-pre-line leading-relaxed text-muted-foreground">
              {r.description}
            </p>
          </section>

          {r.status === "resolved" && r.resolution && (
            <section className="rounded-xl border border-success/30 bg-success/5 p-5 shadow-soft">
              <p className="flex items-center gap-2 text-sm font-semibold text-success">
                <CheckCircle2 className="size-4" />
                Resolution
              </p>
              <p className="mt-2 whitespace-pre-line text-sm">{r.resolution}</p>
            </section>
          )}

          <Activity request={r} manage={manage} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-xl border bg-card p-5 text-sm shadow-soft">
            <dl className="space-y-3">
              {[
                ["Submitted by", r.submitterName],
                ["Assigned to", r.assignedTo ?? "Unassigned"],
                ["Category", categoryLabel[r.category]],
                ["Priority", priorityLabel[r.priority]],
                ["Opened", `${formatDate(r.createdAt)} · ${timeAgo(r.createdAt)}`],
                ["Last update", timeAgo(r.updatedAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 flex gap-2 rounded-lg bg-surface p-3 text-xs text-muted-foreground">
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              Only {r.submitterName.split(" ")[0]} and the {s.shortName} committee can see this
              request.
            </p>
          </section>
          {manage && <ManagePanel request={r} />}
        </aside>
      </div>
    </div>
  );
}

function Activity({ request: r, manage }: { request: SupportRequest; manage: boolean }) {
  const { commentOnSupportRequest } = useData();
  const [text, setText] = useState("");
  return (
    <section className="rounded-xl border bg-card p-6 shadow-soft">
      <h2 className="font-semibold">Activity</h2>
      <ol className="mt-4 space-y-4">
        {r.activity.map((a) => {
          const Icon = activityIcon[a.kind];
          return (
            <li key={a.id} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-sm">
                  <span className="font-semibold">{a.actor}</span>{" "}
                  {a.kind !== "comment" && <span className="text-muted-foreground">{a.text}</span>}
                  <span className="ml-2 text-xs text-muted-foreground">{timeAgo(a.at)}</span>
                </p>
                {a.kind === "comment" && (
                  <p className="mt-1.5 whitespace-pre-line rounded-lg bg-surface px-3 py-2 text-sm">
                    {a.text}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <form
        className="mt-5 space-y-2 border-t pt-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const o = await commentOnSupportRequest(r.id, text);
          if (!o.ok) {
            toast.error(o.error);
            return;
          }
          setText("");
          toast.success(manage ? `Reply sent to ${r.submitterName}` : "Comment added");
        }}
      >
        <Label htmlFor="req-comment">
          {manage ? `Reply to ${r.submitterName}` : "Add a comment for the committee"}
        </Label>
        <Textarea
          id="req-comment"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!text.trim()}>
            <Send />
            {manage ? "Send reply" : "Comment"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function ManagePanel({ request: r }: { request: SupportRequest }) {
  const { getSociety, assignSupportRequest, setSupportRequestStatus } = useData();
  const [resolution, setResolution] = useState("");
  const committee = getSociety(r.societyId)?.committee ?? [];

  const move = async (to: SupportRequest["status"], note?: string) => {
    const o = await setSupportRequestStatus(r.id, to, note);
    if (!o.ok) {
      toast.error(o.error);
      return;
    }
    setResolution("");
    toast.success(to === "resolved" ? "Request resolved" : `Moved to ${statusLabel[to]}`);
  };

  return (
    <section className="space-y-5 rounded-xl border bg-card p-5 shadow-soft">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 text-teal" />
        Committee actions
      </p>

      <div className="space-y-1.5">
        <Label>Assigned to</Label>
        <Select
          value={r.assignedTo ?? UNASSIGNED}
          onValueChange={async (v) => {
            const who = v === UNASSIGNED ? undefined : v;
            const o = await assignSupportRequest(r.id, who);
            if (!o.ok) toast.error(o.error);
            else toast.success(who ? `Assigned to ${who}` : "Assignee removed");
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {committee.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name} · {c.position}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {r.status === "resolved" ? (
        <Button variant="outline" className="w-full" onClick={() => move("in_progress")}>
          <RotateCcw />
          Reopen request
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => move(r.status === "open" ? "in_progress" : "open")}
          >
            <CircleDot />
            {r.status === "open" ? "Mark in progress" : "Move back to open"}
          </Button>
          <form
            className="space-y-2 border-t pt-5"
            onSubmit={async (e) => {
              e.preventDefault();
              move("resolved", resolution);
            }}
          >
            <Label htmlFor="req-resolution">Resolution</Label>
            <Textarea
              id="req-resolution"
              rows={3}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="What was the outcome? The member will see this."
              maxLength={2000}
            />
            <Button type="submit" className="w-full" disabled={!resolution.trim()}>
              <CheckCircle2 />
              Mark as resolved
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
