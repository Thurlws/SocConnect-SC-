export type Role = "student" | "committee";

export type SocietyAccent =
  | "indigo"
  | "teal"
  | "coral"
  | "amber"
  | "rose"
  | "sky"
  | "emerald"
  | "plum";

export interface User {
  id: string;
  name: string;
  role: Role;
  initials: string;
  course: string;
  year: string;
  interests: string[];
  committeeSocietyId?: string;
}

export interface CommitteeMember {
  name: string;
  position: string;
}

export interface Society {
  id: string;
  name: string;
  shortName: string;
  category: string;
  tagline: string;
  description: string;
  icon: string;
  accent: SocietyAccent;
  memberCount: number;
  tags: string[];
  committee: CommitteeMember[];
  requiresApproval: boolean;
  meets: string;
}

export type MembershipStatus = "member" | "pending" | "none";

export interface Event {
  id: string;
  title: string;
  description: string;
  societyId: string;
  date: string; // ISO date YYYY-MM-DD
  start: string; // HH:mm
  end?: string | undefined;
  venue: string;
  category: string;
  capacity?: number | undefined;
  attendees: number;
  tags: string[];
  featured?: boolean;
}

export interface Announcement {
  id: string;
  societyId: string;
  author: string;
  title: string;
  body: string;
  createdAt: string; // ISO datetime
  pinned?: boolean;
}

export interface DiscussionChannel {
  id: string;
  societyId: string;
  name: string;
  description: string;
}

export interface DiscussionMessage {
  id: string;
  channelId: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface Resource {
  id: string;
  societyId: string;
  title: string;
  kind: "Guide" | "Link" | "Document" | "Form";
  description: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  link?: { to: string; params?: Record<string, string> } | undefined;
}

export interface CollaborationProposal {
  id: string;
  societyIds: [string, string];
  title: string;
  summary: string;
  sharedInterests: string[];
  rationale: string;
  contributions: Record<string, string>;
  nextSteps: string[];
}

export interface MembershipRequest {
  id: string;
  societyId: string;
  name: string;
  course: string;
  message: string;
  requestedAt: string;
}

/** Lifecycle: open → in_progress → resolved (see src/lib/support-requests.ts for allowed moves). */
export type SupportRequestStatus = "open" | "in_progress" | "resolved";
export type SupportRequestCategory = "question" | "membership" | "event" | "equipment" | "finance" | "other";
export type SupportRequestPriority = "low" | "normal" | "high";

export interface SupportRequestActivity {
  id: string;
  at: string; // ISO datetime
  actor: string;
  kind: "created" | "status" | "assigned" | "comment";
  text: string;
}

/** A member's request to a society committee (not a paid event ticket). */
export interface SupportRequest {
  id: string;
  societyId: string;
  title: string;
  description: string;
  category: SupportRequestCategory;
  priority: SupportRequestPriority;
  status: SupportRequestStatus;
  submittedBy: string; // user id
  submitterName: string;
  assignedTo?: string | undefined; // committee member name
  resolution?: string | undefined;
  createdAt: string;
  updatedAt: string;
  activity: SupportRequestActivity[];
}

export interface CallRoom {
  id: string;
  societyId: string;
  name: string;
  kind: "room" | "meeting";
  description: string;
  /** meetings only */
  date?: string | undefined;
  start?: string | undefined;
  eventId?: string | undefined;
  host?: string | undefined;
}

export interface TranscriptLine {
  speaker: string;
  text: string;
  at: number; // seconds since call start
}

export interface CallSummary {
  overview: string;
  topics: string[];
  decisions: string[];
  actionItems: { owner: string; task: string }[];
}

export interface CallRecap {
  id: string;
  roomId: string;
  societyId: string;
  title: string;
  date: string; // ISO datetime
  durationSec: number;
  participants: string[];
  transcript: TranscriptLine[];
  summary: CallSummary;
  qa: { role: "user" | "assistant"; content: string }[];
  shared: boolean;
}
