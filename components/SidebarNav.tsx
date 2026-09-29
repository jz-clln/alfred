"use client";

import Link from "next/link";
import styles from "./SidebarNav.module.css";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronRight,
  FolderKanban,
  FileText,
  MoreHorizontal,
  Send,
  Sun,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ReplyWatcher } from "@/components/ReplyWatcher";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Single source of truth for navigation. The sidebar, the phone tab bar, the
// "More" sheet and the search palette all read this list.
// mobile: true  -> gets a slot in the phone tab bar (keep it to 4)
// mobile: false -> lives in the phone "More" sheet
export const NAV = [
  { href: "/dashboard", label: "Today", icon: Sun, mobile: true },
  { href: "/clients", label: "Clients", icon: Users, mobile: true },
  { href: "/leads", label: "Leads", icon: Target, mobile: true },
  { href: "/outreach", label: "Outreach", icon: Send, mobile: true },
  { href: "/meetings", label: "Meetings", icon: CalendarDays, mobile: false },
  { href: "/projects", label: "Projects", icon: FolderKanban, mobile: false },
  { href: "/proposals", label: "Proposals", icon: FileText, mobile: false },
  { href: "/insights", label: "Insights", icon: TrendingUp, mobile: false },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

// Unread replies. Refreshes on every page change (works without Realtime) and
// instantly when Realtime is on. Shows 0 if the table doesn't exist yet.
function useUnreadReplies() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sb = createClient();
    let alive = true;
    const load = async () => {
      const { count: n } = await sb
        .from("inbound_emails")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (alive) setCount(n ?? 0);
    };
    load();
    const channel = sb
      .channel(`unread-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inbound_emails" }, load)
      .subscribe();
    return () => {
      alive = false;
      sb.removeChannel(channel);
    };
  }, [pathname]);

  return count;
}

export function SidebarNav() {
  const isActive = useActive();
  const unread = useUnreadReplies();
  const selected = NAV.find(item => isActive(item.href));
  return (
    <nav aria-label="Sidebar" className="shrink-0">
      <div className="mb-2 flex h-[var(--sidebar-row,44px)] items-center rounded-xl bg-moss-soft px-3 text-moss">
        {selected && <div key={selected.href} className={cn(styles.selection, "flex items-center gap-3 text-sm font-medium")}>
          <selected.icon className="size-5 shrink-0" aria-hidden="true" />
          <span>{selected.label}</span>
        </div>}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-[var(--sidebar-row,44px)] items-center justify-center rounded-xl transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none",
                active ? "bg-moss-soft text-moss" : "text-ink-soft hover:bg-fill hover:text-ink"
              )}
            >
              <item.icon aria-hidden="true" strokeWidth={active ? 2.25 : 1.75} className="size-5 shrink-0" />
              {item.href === "/outreach" && unread > 0 && <span className="absolute right-2 top-1 size-2 rounded-full bg-primary"><span className="sr-only">{unread} unread replies</span></span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const tabClass = (active: boolean) =>
  cn(
    "tap flex h-14 w-full flex-col items-center justify-center gap-0.5 text-xs",
    active ? "font-medium text-moss" : "text-ink-soft"
  );

// Phone navigation: 4 tabs + "More". Bottom bars work best with 5 or fewer
// items, so the rest sit one tap away in a bottom sheet.
// email and signOut come from the server layout.
export function TabBar({ email, signOut }: { email?: string | null; signOut?: ReactNode }) {
  const pathname = usePathname();
  const isActive = useActive();
  const unread = useUnreadReplies();
  const [open, setOpen] = useState(false);

  // Close the sheet after any navigation.
  useEffect(() => setOpen(false), [pathname]);

  const tabs = NAV.filter((n) => n.mobile);
  const more = NAV.filter((n) => !n.mobile);
  const moreActive = more.some((n) => isActive(n.href));

  return (
    <>
      {/* Always mounted, on every screen size: checks Gmail and listens for new replies. */}
      <ReplyWatcher />

      <nav
        aria-label="Main"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line/60 bg-paper/80 backdrop-blur-xl md:hidden"
      >
        <ul className="flex">
          {tabs.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link href={item.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
                  <span className="relative">
                    <item.icon className="size-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                    {item.href === "/outreach" && unread > 0 && (
                      <>
                        <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-primary" aria-hidden="true" />
                        <span className="sr-only">{unread} unread replies</span>
                      </>
                    )}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-current={moreActive ? "page" : undefined}
              className={tabClass(moreActive)}
            >
              <MoreHorizontal className="size-5" strokeWidth={moreActive ? 2.25 : 1.75} aria-hidden="true" />
              More
            </button>
          </li>
        </ul>
      </nav>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>More</DialogTitle>
            <DialogDescription className="sr-only">Other pages and your account.</DialogDescription>
          </DialogHeader>

          <ul className="-mx-1 divide-y divide-border/70">
            {more.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "tap flex min-h-12 items-center gap-3 px-1 text-[15px]",
                      active && "font-medium text-moss"
                    )}
                  >
                    <item.icon className="size-5 shrink-0" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className="size-4 text-ink-soft" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>

          {(email || signOut) && (
            <div className="space-y-3 border-t border-border/70 pt-4">
              {email && <p className="truncate text-sm text-ink-soft">{email}</p>}
              {signOut}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
