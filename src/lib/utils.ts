import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Only http(s) and mailto links are rendered; anything else (e.g. javascript:) is dropped. */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return ["http:", "https:", "mailto:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
}
