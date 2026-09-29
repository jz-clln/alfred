"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Today", mobile: true },
  { href: "/clients", label: "Clients", mobile: true },
  { href: "/leads", label: "Leads", mobile: true },
  { href: "/outreach", label: "Outreach", mobile: true },
  { href: "/meetings", label: "Meetings", mobile: true },
  { href: "/projects", label: "Projects", mobile: false },
  { href: "/insights", label: "Insights", mobile: false },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const isActive = useActive();
  return (
    <nav className="space-y-0.5">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={`tap block rounded-xl px-3 py-2 text-[15px] ${
            isActive(item.href)
              ? "bg-moss-soft font-medium text-moss"
              : "text-ink-soft hover:bg-fill hover:text-ink"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// Thumb-reach navigation on phones. Projects and Insights stay one tap away
// from Today.
export function TabBar() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line/60 bg-paper/80 backdrop-blur-xl md:hidden"
    >
      <ul className="flex">
        {NAV.filter((n) => n.mobile).map((item) => (
          <li key={item.href} className="flex-1">
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`tap flex h-14 items-center justify-center text-[11px] ${
                isActive(item.href) ? "font-medium text-moss" : "text-ink-soft"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
