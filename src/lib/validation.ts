/**
 * Form validation shared by the UI. The database mirrors the important limits as
 * constraints and enforces permissions itself — these schemas are for friendly errors only.
 */
import { z } from "zod";
import type { SupportRequestCategory, SupportRequestPriority } from "@/lib/types";
import { categoryLabel, priorityLabel } from "@/lib/support-requests";

/** Every mutation resolves to this, so toasts and form errors stay simple. */
export type Outcome = { ok: true; id?: string } | { ok: false; error: string };

export interface NotificationPrefs {
  announcements: boolean;
  events: boolean;
  discussions: boolean;
  email: boolean;
}

export type EventAvailability = "open" | "registered" | "full" | "past";

export const eventCategories = [
  "Workshop",
  "Social",
  "Talk",
  "Outdoors",
  "Performance",
  "Volunteering",
] as const;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid time.");

export const announcementInput = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Add a title of at least 3 characters.")
    .max(100, "Keep the title under 100 characters."),
  body: z
    .string()
    .trim()
    .min(10, "Add a message of at least 10 characters.")
    .max(1000, "Keep the message under 1,000 characters."),
  pinned: z.boolean(),
});
export type AnnouncementInput = z.infer<typeof announcementInput>;

export const messageInput = z
  .string()
  .trim()
  .min(1, "Write a message first.")
  .max(1000, "Messages can be up to 1,000 characters.");

export const societyEditInput = z.object({
  tagline: z.string().trim().min(3, "Add a tagline.").max(80),
  description: z.string().trim().min(10, "Add a description of at least 10 characters.").max(800),
  meets: z.string().trim().min(2, "Say when and where you meet.").max(80),
});

export const eventInput = (today: string) =>
  z
    .object({
      title: z
        .string()
        .trim()
        .min(3, "Add a title of at least 3 characters.")
        .max(100, "Keep the title under 100 characters."),
      description: z.string().trim().max(1000, "Keep the description under 1,000 characters."),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")
        .refine((d) => d >= today, "Pick today or a later date."),
      start: hhmm,
      end: hhmm.optional(),
      venue: z.string().trim().min(2, "Add a venue.").max(120),
      category: z.enum(eventCategories),
      capacity: z
        .number({ invalid_type_error: "Capacity must be a number." })
        .int("Capacity must be a whole number.")
        .min(1, "Capacity must be at least 1.")
        .max(5000, "Capacity can be at most 5,000.")
        .optional(),
    })
    .refine((e) => e.end === undefined || e.end > e.start, {
      message: "End time must be after the start time.",
      path: ["end"],
    });
export type EventInput = z.infer<ReturnType<typeof eventInput>>;

export const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form and try again.";

export const supportRequestInput = z.object({
  societyId: z.string(),
  title: z
    .string()
    .trim()
    .min(5, "Add a title of at least 5 characters.")
    .max(120, "Keep the title under 120 characters."),
  description: z
    .string()
    .trim()
    .min(10, "Add some detail (at least 10 characters).")
    .max(2000, "Keep the details under 2,000 characters."),
  category: z.enum(
    Object.keys(categoryLabel) as [SupportRequestCategory, ...SupportRequestCategory[]],
  ),
  priority: z.enum(
    Object.keys(priorityLabel) as [SupportRequestPriority, ...SupportRequestPriority[]],
  ),
});
export type SupportRequestInput = z.infer<typeof supportRequestInput>;
