import { createFileRoute } from "@tanstack/react-router";
import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import { useData } from "@/lib/api/store";
import { pageHead } from "@/lib/seo";
import { REQUEST_STATUSES, statusLabel } from "@/lib/support-requests";
import type { SupportRequestStatus } from "@/lib/types";
import { EmptyState, PageHeader } from "@/components/cards";
import { NewRequestDialog, RequestRow } from "@/components/support-requests";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/requests/")({
  head: () => pageHead("My Requests", "Questions and requests you've sent to society committees."),
  component: MyRequests,
});

function MyRequests() {
  const { supportRequests, user } = useData();
  const [tab, setTab] = useState<"all" | SupportRequestStatus>("all");
  const mine = supportRequests
    .filter((r) => r.submittedBy === user.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const shown = tab === "all" ? mine : mine.filter((r) => r.status === tab);
  const tabs = [
    { k: "all" as const, l: "All", n: mine.length },
    ...REQUEST_STATUSES.map((st) => ({
      k: st,
      l: statusLabel[st],
      n: mine.filter((r) => r.status === st).length,
    })),
  ];

  return (
    <div>
      <PageHeader
        title="My requests"
        subtitle="Ask a committee about membership, equipment, events or anything else, then follow it through to a resolution."
        actions={<NewRequestDialog />}
      />
      <div className="mb-4 flex flex-wrap gap-2">
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
      {shown.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title={mine.length === 0 ? "No requests yet" : "Nothing here"}
          body={
            mine.length === 0
              ? "Need something from a committee? Send a request and track it here."
              : "No requests with this status."
          }
          action={mine.length === 0 ? <NewRequestDialog /> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <RequestRow key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}
