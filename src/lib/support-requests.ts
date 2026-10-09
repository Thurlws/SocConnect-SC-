import type {
  SupportRequest,
  SupportRequestCategory,
  SupportRequestPriority,
  SupportRequestStatus,
} from "@/lib/types";

export const REQUEST_STATUSES: SupportRequestStatus[] = ["open", "in_progress", "resolved"];

export const statusLabel: Record<SupportRequestStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export const categoryLabel: Record<SupportRequestCategory, string> = {
  question: "General question",
  membership: "Membership",
  event: "Event",
  equipment: "Equipment",
  finance: "Finance",
  other: "Other",
};

export const priorityLabel: Record<SupportRequestPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

/** Moves a committee member may make from each status. Reopening a resolved request is allowed. */
const transitions: Record<SupportRequestStatus, SupportRequestStatus[]> = {
  open: ["in_progress", "resolved"],
  in_progress: ["open", "resolved"],
  resolved: ["in_progress"],
};

export function canTransition(from: SupportRequestStatus, to: SupportRequestStatus) {
  return transitions[from].includes(to);
}

const priorityRank: Record<SupportRequestPriority, number> = { high: 0, normal: 1, low: 2 };
const statusRank: Record<SupportRequestStatus, number> = { open: 0, in_progress: 1, resolved: 2 };

/** Inbox order: unresolved first, then high priority, then newest. */
export function inboxOrder(a: SupportRequest, b: SupportRequest) {
  return (
    statusRank[a.status] - statusRank[b.status] ||
    priorityRank[a.priority] - priorityRank[b.priority] ||
    b.createdAt.localeCompare(a.createdAt)
  );
}
