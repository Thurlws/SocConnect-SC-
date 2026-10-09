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
