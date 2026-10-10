import { cn } from "@/lib/utils";

/** Two societies joined by a line; the highlighted one is you. Same language as the Society Pulse map. */
export function BrandMark({ className }: { className?: string | undefined }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="7" fill="var(--ink)" />
      <path d="M10.5 21.5 21.5 10.5" stroke="#fff" strokeWidth="2" />
      <circle cx="10.5" cy="21.5" r="4.75" fill="var(--highlight)" />
      <circle cx="21.5" cy="10.5" r="4.75" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ collapsed, className }: { collapsed?: boolean | undefined; className?: string | undefined }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      {!collapsed && <span className="font-wide text-lg font-bold">SocConnect</span>}
    </span>
  );
}
