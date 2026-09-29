import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ count: clientCount }, { count: activeProjectCount }, { data: balances }] =
    await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }),
      supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase.from("client_balances").select("balance"),
    ]);

  const totalOutstanding =
    balances?.reduce((sum, row) => sum + Math.max(row.balance, 0), 0) ?? 0;

  return (
    <div>
      <h1 className="mb-8 text-3xl font-medium">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Clients" value={String(clientCount ?? 0)} />
        <StatCard label="Active projects" value={String(activeProjectCount ?? 0)} />
        <StatCard
          label="Outstanding balance"
          value={`$${totalOutstanding.toFixed(2)}`}
          accent
        />
      </div>

      <div className="mt-10 flex gap-3">
        <Link
          href="/clients"
          className="rounded-md border border-line px-4 py-2 text-sm hover:bg-surface"
        >
          View clients
        </Link>
        <Link
          href="/projects"
          className="rounded-md border border-line px-4 py-2 text-sm hover:bg-surface"
        >
          View projects
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="text-sm text-ink-soft">{label}</div>
      <div
        className={`mt-2 font-display text-3xl ${accent ? "text-moss" : "text-ink"}`}
      >
        {value}
      </div>
    </div>
  );
}
