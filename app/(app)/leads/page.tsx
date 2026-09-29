import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { scoreLead, type Temperature } from "@/lib/leads/score";
import { PageTitle, Group, EmptyState, TempBadge } from "@/components/ui/kit";
import { AddLeadForm } from "./AddLeadForm";
import {
  checkLeadEmail,
  markLeadReplied,
  setLeadStage,
  convertLeadToClient,
} from "./actions";

const FILTERS: { key: "all" | Temperature; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hot", label: "Hot" },
  { key: "warm", label: "Warm" },
  { key: "cold", label: "Cold" },
];

function Act({ action, children, tone = "default" }: { action: () => Promise<void>; children: React.ReactNode; tone?: "default" | "danger" }) {
  return (
    <form action={action}>
      <button
        type="submit"
        className={`tap rounded-lg px-2.5 py-1 text-xs ${
          tone === "danger" ? "text-rust hover:bg-rust-soft" : "text-moss hover:bg-moss-soft"
        }`}
      >
        {children}
      </button>
    </form>
  );
}

export default async function LeadsPage({ searchParams }: { searchParams: { t?: string } }) {
  const supabase = createClient();
  const [{ data: leads }, { data: messages }] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
    supabase.from("email_messages").select("lead_id, status, opened_at, clicked_at, sent_at").not("lead_id", "is", null),
  ]);

  const byLead = new Map<string, any[]>();
  for (const m of messages ?? []) {
    byLead.set(m.lead_id, [...(byLead.get(m.lead_id) ?? []), m]);
  }

  const scored = (leads ?? [])
    .map((l) => ({ lead: l, ...scoreLead(l, byLead.get(l.id) ?? []) }))
    .sort((a, b) => b.score - a.score);

  const filter = FILTERS.some((f) => f.key === searchParams.t) ? searchParams.t! : "all";
  const shown = filter === "all" ? scored : scored.filter((s) => s.temperature === filter);
  const counts = { hot: 0, warm: 0, cold: 0 } as Record<Temperature, number>;
  scored.forEach((s) => counts[s.temperature]++);

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Leads" sub="Sorted by how ready they are to hear from you." />

      <div className="mb-5 flex gap-1.5 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/leads" : `/leads?t=${f.key}`}
            className={`tap shrink-0 rounded-full px-3.5 py-1.5 text-sm ${
              filter === f.key ? "bg-ink text-paper" : "bg-fill text-ink-soft hover:text-ink"
            }`}
          >
            {f.label}
            {f.key !== "all" && <span className="ml-1.5 opacity-60">{counts[f.key as Temperature]}</span>}
          </Link>
        ))}
      </div>

      <Group>
        {shown.map(({ lead, temperature, reasons }) => (
          <li key={lead.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{lead.name}</span>
                  <TempBadge temperature={temperature} />
                </div>
                <div className="mt-0.5 truncate text-sm text-ink-soft">
                  {[lead.company, lead.email].filter(Boolean).join(" · ") || "No contact details"}
                  {lead.email_status === "invalid" && <span className="ml-1.5 text-rust">· bad email</span>}
                  {lead.email_status === "risky" && <span className="ml-1.5 text-brass">· risky email</span>}
                </div>
                {!!reasons.length && (
                  <div className="mt-1 text-xs text-ink-soft/80">{reasons.join(", ")}</div>
                )}
              </div>
              <div className="shrink-0 text-right text-xs capitalize text-ink-soft">{lead.stage}</div>
            </div>

            {lead.stage !== "won" && lead.stage !== "lost" && (
              <div className="-ml-2.5 mt-2 flex flex-wrap">
                {lead.email && <Act action={checkLeadEmail.bind(null, lead.id)}>Check email</Act>}
                {lead.stage !== "replied" && <Act action={markLeadReplied.bind(null, lead.id)}>Mark replied</Act>}
                {lead.stage !== "meeting" && <Act action={setLeadStage.bind(null, lead.id, "meeting")}>Meeting booked</Act>}
                <Act action={convertLeadToClient.bind(null, lead.id)}>Make client</Act>
                <Act action={setLeadStage.bind(null, lead.id, "lost")} tone="danger">Lost</Act>
              </div>
            )}
          </li>
        ))}
        {!shown.length && (
          <EmptyState>
            {filter === "all" ? "No leads yet. Add your first one below." : `No ${filter} leads right now.`}
          </EmptyState>
        )}
      </Group>

      <h2 className="mb-3 mt-10 text-lg">Add a lead</h2>
      <AddLeadForm />
    </div>
  );
}
