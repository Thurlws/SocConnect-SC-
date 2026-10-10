// Manual formatting (not toLocaleDateString) so output never depends on the browser's locale.
// "Now" and "today" are real, in Europe/Dublin.
const WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MO = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const TIMEZONE = "Europe/Dublin";

const dublinParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** A moment as Dublin wall-clock date (YYYY-MM-DD) and time (HH:mm). */
export function toDublin(d: Date | string) {
  const parts: Record<string, string> = Object.fromEntries(dublinParts.formatToParts(new Date(d)).map((p) => [p.type, p.value]));
  return { date: `${parts["year"]}-${parts["month"]}-${parts["day"]}`, time: `${parts["hour"]}:${parts["minute"]}`, hour: Number(parts["hour"]) };
}

/** Today's date in Dublin, YYYY-MM-DD. */
export const todayIso = () => toDublin(new Date()).date;
export const nowIso = () => new Date().toISOString();

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
  return { day: String(d.getDate()), month: MO[d.getMonth()]!.slice(0, 3) };
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

/** Whole days from Dublin "today" to a YYYY-MM-DD date. */
export function daysUntil(iso: string) {
  return Math.round((new Date(`${iso.slice(0, 10)}T12:00:00Z`).getTime() - new Date(`${todayIso()}T12:00:00Z`).getTime()) / 86400000);
}

export function greeting() {
  const h = toDublin(new Date()).hour;
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
