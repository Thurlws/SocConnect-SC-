import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell, CalendarDays, ChevronsLeft, Compass, Home, Inbox, LayoutDashboard, Menu, MessageSquareText, MessagesSquare, Search, Settings, Users, Waypoints, Video, LogOut, ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useData } from "@/lib/api/store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { SocietyAvatar } from "@/components/society-avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { timeAgo, formatDate } from "@/lib/format";

type NavItem = { to: string; label: string; icon: LucideIcon; committeeOnly?: boolean };
const nav: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/societies", label: "Discover societies", icon: Compass },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/my-societies", label: "My societies", icon: Users },
  { to: "/communications", label: "Communications", icon: MessagesSquare },
  { to: "/requests", label: "My requests", icon: MessageSquareText },
  { to: "/calls", label: "Calls", icon: Video },
  { to: "/society-pulse", label: "Society Pulse", icon: Waypoints },
  { to: "/committee", label: "Committee", icon: LayoutDashboard, committeeOnly: true },
  { to: "/inbox", label: "Request inbox", icon: Inbox, committeeOnly: true },
  { to: "/settings", label: "Settings", icon: Settings },
];

const titles: Record<string, string> = Object.fromEntries(nav.map((n) => [n.to, n.label]));

// Bottom bar shows the last word only: "Discover societies" becomes "Societies".
const shortLabel = (label: string) => {
  const w = label.split(" ").pop() ?? label;
  return w.charAt(0).toUpperCase() + w.slice(1);
};

function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-primary-foreground shadow-soft">
        <Waypoints className="size-4" />
      </span>
      {!collapsed && <span className="font-display text-lg font-semibold tracking-tight">SocConnect</span>}
    </Link>
  );
}

function SidebarBody({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { joinedSocieties, user, role, committeeSeats } = useData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 items-center px-4", collapsed && "justify-center px-0")}>
        <Logo collapsed={collapsed} />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {nav.filter((n) => !n.committeeOnly || role === "committee").map((n) => (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            title={collapsed ? n.label : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
              isActive(n.to) && "bg-primary-soft font-semibold text-primary hover:bg-primary-soft",
              collapsed && "justify-center px-0",
            )}
          >
            {isActive(n.to) && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />}
            <n.icon className="size-4 shrink-0" />
            {!collapsed && n.label}
          </Link>
        ))}
        {!collapsed && (
          <div className="pt-6">
            <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground">Your societies</p>
            {joinedSocieties.slice(0, 5).map((s) => (
              <Link
                key={s.id}
                to="/societies/$societyId"
                params={{ societyId: s.id }}
                onClick={onNavigate}
                className={cn("flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent", pathname === `/societies/${s.id}` && "bg-sidebar-accent")}
              >
                <SocietyAvatar society={s} size="xs" />
                <span className="truncate">{s.name}</span>
              </Link>
            ))}
            {joinedSocieties.length === 0 && <p className="px-3 text-xs text-muted-foreground">Join a society to see it here.</p>}
          </div>
        )}
      </nav>
      <div className={cn("flex items-center gap-3 border-t border-sidebar-border p-4", collapsed && "justify-center")}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-ink-foreground">{user.initials}</span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{committeeSeats[0] ? `${committeeSeats[0].position}, ${committeeSeats[0].short_name}` : "Student"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const { societies, events } = useData();
  const navigate = useNavigate();
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-soft transition-colors hover:border-primary/30"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search societies & events</span>
        <kbd className="hidden rounded border bg-muted px-1.5 text-[10px] sm:inline">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search societies, events, tags…" />
        <CommandList>
          <CommandEmpty>No matches.</CommandEmpty>
          <CommandGroup heading="Societies">
            {societies.map((s) => (
              <CommandItem key={s.id} value={`${s.name} ${s.shortName} ${s.tags.join(" ")}`} onSelect={() => { setOpen(false); navigate({ to: "/societies/$societyId", params: { societyId: s.id } }); }}>
                <SocietyAvatar society={s} size="xs" />
                <span>{s.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{s.category}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Events">
            {events.map((e) => (
              <CommandItem key={e.id} value={`${e.title} ${e.tags.join(" ")}`} onSelect={() => { setOpen(false); navigate({ to: "/events/$eventId", params: { eventId: e.id } }); }}>
                <CalendarDays className="size-4" />
                <span>{e.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(e.date)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead } = useData();
  const navigate = useNavigate();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${unreadCount} unread`}>
          <Bell className="size-4" />
          {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <button onClick={markAllRead} className="text-xs font-medium text-primary hover:underline">Mark all read</button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>}
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                markRead(n.id);
                if (n.link) navigate({ to: n.link.to, params: n.link.params } as never);
              }}
              className={cn("flex w-full gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-muted", !n.read && "bg-primary-soft/50")}
            >
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{n.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{n.body}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UserMenu() {
  const { user } = useData();
  const { email, signOut, access } = useAuth();
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex size-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-ink-foreground ring-offset-2 transition hover:ring-2 hover:ring-primary/40" aria-label="Account menu">
          {user.initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <p className="text-sm">{user.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}><Settings className="size-4" /> Settings</DropdownMenuItem>
        {access.is_admin && <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}><ShieldCheck className="size-4" /> Admin</DropdownMenuItem>}
        <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/welcome" }); }}><LogOut className="size-4" /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titles[pathname] ?? (pathname.startsWith("/societies") ? "Society" : pathname.startsWith("/events") ? "Event" : pathname.startsWith("/requests") ? "Request" : "SocConnect");
  const { role } = useData();

  return (
    <div className="flex min-h-screen">
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:block", collapsed ? "w-[72px]" : "w-64")}>
        <SidebarBody collapsed={collapsed} />
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-20 flex size-6 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-soft hover:text-foreground"
        >
          <ChevronsLeft className={cn("size-3.5 transition-transform", collapsed && "rotate-180")} />
        </button>
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="size-5" />
          </Button>
          <p className="hidden w-44 truncate text-sm font-semibold md:block">{title}</p>
          <div className="flex flex-1 justify-center"><GlobalSearch /></div>
          {role === "committee" && <span className="hidden rounded-full bg-teal-soft px-2.5 py-1 text-[11px] font-semibold text-teal sm:inline">Committee view</span>}
          <Notifications />
          <UserMenu />
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-10 lg:pb-10">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/95 backdrop-blur lg:hidden">
        {nav.filter((n) => ["/", "/societies", "/events", "/communications", "/society-pulse"].includes(n.to)).map((n) => {
          const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground", active && "text-primary")}>
              <n.icon className="size-5" />
              {shortLabel(n.label)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
