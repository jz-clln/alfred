import type { ReactNode } from "react";
import type { Temperature } from "@/lib/leads/score";

// Large title, iOS style: size and weight carry the hierarchy, not colour.
export function PageTitle({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl font-medium md:text-[2.6rem] md:leading-[1.1]">{title}</h1>
        {sub && <p className="mt-2 text-ink-soft">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// A grouped list: one rounded surface, hairline separators between rows.
export function Group({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl bg-surface">{children}</ul>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <li className="px-4 py-8 text-center text-sm text-ink-soft">{children}</li>;
}

const TEMP = {
  hot: { label: "Hot", cls: "bg-rust-soft text-rust", dot: "bg-rust" },
  warm: { label: "Warm", cls: "bg-brass-soft text-brass", dot: "bg-brass" },
  cold: { label: "Cold", cls: "bg-slate-soft text-slate", dot: "bg-slate" },
} as const;

export function TempBadge({ temperature }: { temperature: Temperature }) {
  const t = TEMP[temperature];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${t.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {t.label}
    </span>
  );
}

// Shared form styling: filled fields, no borders, focus ring in moss.
export const field =
  "w-full rounded-xl bg-fill px-3.5 py-2.5 text-sm outline-none placeholder:text-ink-soft/70 focus:ring-2 focus:ring-moss/30";
export const label = "mb-1 block text-xs text-ink-soft";

export function StatusChip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "moss" | "rust" | "brass" }) {
  const cls = {
    neutral: "bg-fill text-ink-soft",
    moss: "bg-moss-soft text-moss",
    rust: "bg-rust-soft text-rust",
    brass: "bg-brass-soft text-brass",
  }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{children}</span>;
}
