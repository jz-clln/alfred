"use client";

import type { ReactNode } from "react";
import { SidebarNav } from "./SidebarNav";
import { PaletteTrigger } from "./CommandPalette";

export function DesktopSidebar({ application, currency, account }: { application: ReactNode; currency: ReactNode; account: ReactNode }) {
  return (
    <aside aria-label="Main navigation" className="sticky top-0 z-40 hidden h-dvh w-60 shrink-0 flex-col bg-fill/40 px-4 py-[clamp(8px,2vh,28px)] backdrop-blur-xl [--sidebar-row:clamp(28px,7vh,44px)] md:flex">
      <div className="mb-[clamp(4px,2vh,16px)] px-3 font-display text-2xl">Alfred</div>
      <div className="mb-[clamp(4px,2vh,16px)]">{application}</div>
      <div className="mb-[clamp(4px,2vh,16px)]"><PaletteTrigger variant="sidebar" /></div>
      <SidebarNav />
      <div className="mt-auto space-y-[clamp(4px,2vh,16px)] px-3 pt-2">
        <div>{currency}</div>
        <div className="space-y-1 border-t border-line/70 pt-[clamp(4px,1.5vh,12px)]">{account}</div>
      </div>
    </aside>
  );
}
