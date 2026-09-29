import { createClient } from "@/lib/supabase/server";
import { SidebarNav, TabBar } from "@/components/SidebarNav";
import SignOutButton from "./sign-out-button";

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
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between bg-fill/40 px-4 py-7 backdrop-blur-xl md:flex">
        <div>
          <div className="mb-9 px-3 font-display text-2xl">Alfred</div>
          <SidebarNav />
        </div>
        <div className="space-y-2 px-3">
          <div className="truncate text-xs text-ink-soft">{user?.email}</div>
          <SignOutButton />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-paper/80 px-5 py-3 backdrop-blur-xl md:hidden">
          <span className="font-display text-xl">Alfred</span>
          <SignOutButton />
        </header>
        <main className="px-5 pb-28 pt-4 md:px-12 md:pb-12 md:pt-10">{children}</main>
      </div>

      <TabBar />
    </div>
  );
}
