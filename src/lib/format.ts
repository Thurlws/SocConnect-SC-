import { DEMO_TODAY } from "@/data/mock";

// Manual formatting (not toLocaleDateString) so server and browser render identical text.
const NOW = new Date(`${DEMO_TODAY}T12:00:00`);
const WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MO = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Opts = { weekday?: "short" | "long"; day?: string; month?: "short" | "long"; year?: string };

export function formatDate(iso: string, opts: Opts = { weekday: "short", month: "short" }) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  const parts: string[] = [];
  if (opts.weekday) parts.push(opts.weekday === "long" ? `${WD[d.getDay()]},` : `${WD[d.getDay()]!.slice(0, 3)},`);
  parts.push(String(d.getDate()));
  parts.push(opts.month === "long" ? MO[d.getMonth()]! : MO[d.getMonth()]!.slice(0, 3));
  if (opts.year) parts.push(String(d.getFullYear()));
  return parts.join(" ");
}

export function monthLabel(year: number, month: number) {
  return `${MO[month]} ${year}`;
}

export function dayParts(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return { day: String(d.getDate()).padStart(2, "0"), month: MO[d.getMonth()]!.slice(0, 3).toUpperCase() };
}

export function timeAgo(iso: string) {
  const diff = (NOW.getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export function daysUntil(iso: string) {
  return Math.round((new Date(`${iso}T12:00:00`).getTime() - NOW.getTime()) / 86400000);
}

export function demoNowIso() {
  return `${DEMO_TODAY}T12:00:00`;
}

export function greeting() {
  return "Good afternoon";
}
