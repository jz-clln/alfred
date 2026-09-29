import type { ReactNode } from "react";
import type { Temperature } from "@/lib/leads/score";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
    <Card className="overflow-hidden">
      <ul className="divide-y divide-border/70">{children}</ul>
    </Card>
  );
}

export function EmptyState({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <li className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-ink-soft">
      {icon}
      {children}
    </li>
  );
}

const TEMP = {
  hot: { label: "Hot", variant: "rust", dot: "bg-rust" },
  warm: { label: "Warm", variant: "brass", dot: "bg-brass" },
  cold: { label: "Cold", variant: "slate", dot: "bg-slate" },
} as const;

export function TempBadge({ temperature }: { temperature: Temperature }) {
  const t = TEMP[temperature];
  return (
    <Badge variant={t.variant} className="gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {t.label}
    </Badge>
  );
}

// Legacy class strings. Kept so forms not yet migrated to <Input>/<Label>
// keep working. Prefer the components in new code.
export const field =
  "w-full rounded-xl bg-fill px-3.5 py-2.5 text-sm outline-none placeholder:text-ink-soft focus:ring-2 focus:ring-moss/30";
export const label = "mb-1 block text-xs text-ink-soft";

export function StatusChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "moss" | "rust" | "brass";
}) {
  return (
    <Badge variant={tone} className="capitalize">
      {children}
    </Badge>
  );
}
