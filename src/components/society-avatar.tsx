import {
  Bot, Camera, Clapperboard, Code2, Cog, Dices, Gamepad2, Globe2, HeartHandshake, Leaf, Mic2, Mountain, Music, Palette, Rocket, Sparkles, Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Society, SocietyAccent } from "@/lib/types";

const icons: Record<string, LucideIcon> = {
  Bot, Camera, Clapperboard, Code2, Cog, Dices, Gamepad2, Globe2, HeartHandshake, Leaf, Mic2, Mountain, Music, Palette, Rocket, Sparkles,
};

export const accentClasses: Record<SocietyAccent, { soft: string; text: string; solid: string; ring: string; fill: string; stroke: string }> = {
  indigo: { soft: "bg-soc-indigo/12", text: "text-soc-indigo", solid: "bg-soc-indigo", ring: "ring-soc-indigo/30", fill: "fill-soc-indigo", stroke: "stroke-soc-indigo" },
  teal: { soft: "bg-soc-teal/12", text: "text-soc-teal", solid: "bg-soc-teal", ring: "ring-soc-teal/30", fill: "fill-soc-teal", stroke: "stroke-soc-teal" },
  coral: { soft: "bg-soc-coral/12", text: "text-soc-coral", solid: "bg-soc-coral", ring: "ring-soc-coral/30", fill: "fill-soc-coral", stroke: "stroke-soc-coral" },
  amber: { soft: "bg-soc-amber/15", text: "text-soc-amber", solid: "bg-soc-amber", ring: "ring-soc-amber/30", fill: "fill-soc-amber", stroke: "stroke-soc-amber" },
  rose: { soft: "bg-soc-rose/12", text: "text-soc-rose", solid: "bg-soc-rose", ring: "ring-soc-rose/30", fill: "fill-soc-rose", stroke: "stroke-soc-rose" },
  sky: { soft: "bg-soc-sky/12", text: "text-soc-sky", solid: "bg-soc-sky", ring: "ring-soc-sky/30", fill: "fill-soc-sky", stroke: "stroke-soc-sky" },
  emerald: { soft: "bg-soc-emerald/12", text: "text-soc-emerald", solid: "bg-soc-emerald", ring: "ring-soc-emerald/30", fill: "fill-soc-emerald", stroke: "stroke-soc-emerald" },
  plum: { soft: "bg-soc-plum/12", text: "text-soc-plum", solid: "bg-soc-plum", ring: "ring-soc-plum/30", fill: "fill-soc-plum", stroke: "stroke-soc-plum" },
};

export function societyIcon(name: string): LucideIcon {
  return icons[name] ?? Users;
}

const sizes = { xs: "size-6 rounded-md [&_svg]:size-3.5", sm: "size-8 rounded-lg [&_svg]:size-4", md: "size-10 rounded-xl [&_svg]:size-5", lg: "size-16 rounded-2xl [&_svg]:size-8" };

export function SocietyAvatar({ society, size = "md", className }: { society: Pick<Society, "icon" | "accent" | "name">; size?: keyof typeof sizes; className?: string }) {
  const Icon = societyIcon(society.icon);
  const a = accentClasses[society.accent];
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center", sizes[size], a.soft, a.text, className)}>
      <Icon strokeWidth={2} />
    </span>
  );
}
