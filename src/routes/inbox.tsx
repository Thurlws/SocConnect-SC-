import { createFileRoute } from "@tanstack/react-router";
import { Inbox, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDemo } from "@/lib/demo-store";
import { pageHead } from "@/lib/seo";
import { REQUEST_STATUSES, inboxOrder, statusLabel } from "@/lib/support-requests";
import type { SupportRequestStatus } from "@/lib/types";
import { EmptyState, PageHeader } from "@/components/cards";
import { RequestRow } from "@/components/support-requests";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox")({
  head: () =>
    pageHead("Request Inbox", "Member requests for your society, from submission to resolution."),
  component: InboxPage,
});

function InboxPage() {
  const { role, user, setRole, getSociety, supportRequests } = useDemo();
  const [tab, setTab] = useState<"all" | SupportRequestStatus>("all");
  const [mineOnly, setMineOnly] = useState(false);

  if (role !== "committee" || !user.committeeSocietyId) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Committee access only"
        body="The request inbox is for society committee members. In the demo you can switch to Jordan Lee, CompSoc President."
        action={
          <Button
            onClick={() => {
              setRole("committee");
              toast.success("Now viewing as Jordan Lee (committee)");
            }}
          >
            Switch to committee demo
          </Button>
        }
      />
    );
  }

  const s = getSociety(user.committeeSocietyId)!;
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
                  ? "border-primary bg-primary-soft text-primary"
                  : "bg-card hover:border-primary/40",
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
