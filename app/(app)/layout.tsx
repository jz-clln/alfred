//app\(app)\layout.tsx

import { createClient } from "@/lib/supabase/server";
import { TabBar } from "@/components/SidebarNav";
import { CommandPalette, PaletteTrigger } from "@/components/CommandPalette";
import { ApplicationSwitcher } from "@/components/ApplicationSwitcher";
import { getActiveApplicationId } from "@/lib/applications";
import SignOutButton from "./sign-out-button";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { getDisplayCurrency } from "@/lib/currency-preference";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const [
    {
      data: { user },
    },
    { data: applications },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("applications").select("id, name").order("created_at"),
  ]);
  const activeApplicationId = getActiveApplicationId();
  const displayCurrency = getDisplayCurrency();

  return (
    <div className="flex min-h-dvh">
      {/* Keyboard users skip the sidebar. Visible only when focused. */}
      <a
        href="#main"
        className="sr-only rounded-xl bg-card px-4 py-2 text-sm shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70]"
      >
        Skip to content
      </a>

      <DesktopSidebar
        application={<ApplicationSwitcher applications={applications ?? []} activeId={activeApplicationId} />}
        currency={<>
          <p className="mb-1.5 text-xs text-ink-soft">Display currency</p>
          <CurrencySwitcher currency={displayCurrency} className="w-full" />
        </>}
        account={<>
          <div className="truncate text-xs text-ink-soft">{user?.email}</div>
          <SignOutButton />
        </>}
      />

      <div className="min-w-0 flex-1">
        {/* Phone header: only what you need at a glance. Currency and sign out
            live in the More sheet, so this row never crowds on small screens. */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-paper/80 px-5 py-1 backdrop-blur-xl md:hidden">
          <ApplicationSwitcher
            variant="compact"
            applications={applications ?? []}
            activeId={activeApplicationId}
          />
          <PaletteTrigger variant="icon" />
        </header>
        <main id="main" tabIndex={-1} className="px-5 pb-28 pt-4 outline-none md:px-12 md:pb-12 md:pt-10">
          {children}
        </main>
      </div>

      {/* TabBar renders this slot inside the More sheet, so it carries both the
          currency control and Sign out. */}
      <TabBar
        email={user?.email}
        signOut={
          <>
            <div>
              <p className="mb-1.5 text-sm text-ink-soft">Display currency</p>
              <CurrencySwitcher currency={displayCurrency} large className="w-full" />
            </div>
            <SignOutButton variant="row" />
          </>
        }
      />
      <CommandPalette activeApplicationId={activeApplicationId} />
    </div>
  );
}
