import { createFileRoute } from "@tanstack/react-router";
import { Inbox, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useData } from "@/lib/api/store";
import { pageHead } from "@/lib/seo";
import { REQUEST_STATUSES, inboxOrder, statusLabel } from "@/lib/support-requests";
import type { SupportRequestStatus } from "@/lib/types";
import { EmptyState, PageHeader } from "@/components/cards";
import { RequestRow } from "@/components/support-requests";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () =>
    pageHead("Request Inbox", "Member requests for your society, from submission to resolution."),
  component: InboxPage,
});

function InboxPage() {
  const { user, committeeSeats, getSociety, supportRequests } = useData();
  const [tab, setTab] = useState<"all" | SupportRequestStatus>("all");
  const [mineOnly, setMineOnly] = useState(false);

  const seat = committeeSeats[0];
  const found = seat ? getSociety(seat.slug) : undefined;
  if (!seat || !found) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Committee access only"
        body={seat ? "Your society's request inbox switches to live data in the next update." : "The request inbox is for society committee members."}
      />
    );
  }

  const s = found;
  const all = supportRequests.filter((r) => r.societyId === s.id).sort(inboxOrder);
  const scoped = mineOnly ? all.filter((r) => r.assignedTo === user.name) : all;
  const shown = tab === "all" ? scoped : scoped.filter((r) => r.status === tab);
  const tabs = [
    { k: "all" as const, l: "All", n: scoped.length },
    ...REQUEST_STATUSES.map((st) => ({
      k: st,
      l: statusLabel[st],
      n: scoped.filter((r) => r.status === st).length,
    })),
  ];

  return (
    <div>
      <PageHeader
        title={`${s.shortName} request inbox`}
        subtitle="Questions and requests from members. Assign them, reply, and resolve them so nothing gets lost in a group chat."
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              aria-pressed={tab === t.k}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.k
                  ? "border-ink bg-highlight text-ink"
                  : "bg-card hover:border-ink/40",
              )}
            >
              {t.l} <span className="text-muted-foreground">{t.n}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Switch id="mine-only" checked={mineOnly} onCheckedChange={setMineOnly} />
          <Label htmlFor="mine-only">Assigned to me</Label>
        </div>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={Inbox} title="Inbox zero" body="No requests match this filter." />
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <RequestRow key={r.id} request={r} showSubmitter />
          ))}
        </div>
      )}
    </div>
  );
}
