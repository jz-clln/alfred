import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/projects", label: "Projects" },
  { href: "/meetings", label: "Meetings" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-line px-5 py-6">
        <div>
          <div className="mb-8 font-display text-xl">Alfred</div>
          <nav className="space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-moss-soft hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="space-y-2">
          <div className="truncate text-xs text-ink-soft">{user?.email}</div>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 px-10 py-8">{children}</main>
    </div>
  );
}
