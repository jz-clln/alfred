import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveApplicationId } from "@/lib/applications";
import { filterApplication, UNASSIGNED_APPLICATION } from "@/lib/application-scope";
import { scoreLead, type Temperature } from "@/lib/leads/score";
import { PageTitle, Group, EmptyState, TempBadge, StatusChip } from "@/components/ui/kit";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { AddLeadForm } from "./AddLeadForm";
import { LeadActions } from "./LeadActions";

const FILTERS: { key: "all" | Temperature; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hot", label: "Hot" },
  { key: "warm", label: "Warm" },
  { key: "cold", label: "Cold" },
];

const stageTone = (s: string) =>
  s === "replied" || s === "meeting" || s === "won" ? "moss" : "neutral";

export default async function LeadsPage({ searchParams }: { searchParams: { t?: string; q?: string } }) {
  const supabase = createClient();
  const activeApplicationId = getActiveApplicationId();

  let leadsQuery = supabase
    .from("leads")
    .select("*, applications(name)")
    .order("created_at", { ascending: false });
  filterApplication(leadsQuery, activeApplicationId);

  const [{ data: leads }, { data: messages }, { data: applications }] = await Promise.all([
    leadsQuery,
    supabase.from("email_messages").select("lead_id, status, opened_at, clicked_at, sent_at").not("lead_id", "is", null),
    supabase.from("applications").select("id, name").order("created_at"),
  ]);

  const showAppBadge = !activeApplicationId && (applications?.length ?? 0) > 0;

  const byLead = new Map<string, any[]>();
  for (const m of messages ?? []) {
    byLead.set(m.lead_id, [...(byLead.get(m.lead_id) ?? []), m]);
  }

  const q = (searchParams.q ?? "").trim();
  const needle = q.toLowerCase();

  const scored = (leads ?? [])
    .filter(
      (l) =>
        !needle ||
        [l.name, l.company, l.email].some((v: string | null) => v?.toLowerCase().includes(needle))
    )
    .map((l) => ({ lead: l, ...scoreLead(l, byLead.get(l.id) ?? []) }))
    .sort((a, b) => b.score - a.score);

  const filter = FILTERS.some((f) => f.key === searchParams.t) ? searchParams.t! : "all";
  const shown = filter === "all" ? scored : scored.filter((s) => s.temperature === filter);
  const counts = { hot: 0, warm: 0, cold: 0 } as Record<Temperature, number>;
  scored.forEach((s) => counts[s.temperature]++);

  const href = (t: string) => {
    const p = new URLSearchParams();
    if (t !== "all") p.set("t", t);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/leads?${s}` : "/leads";
  };

  return (
    <div className="max-w-6xl">
      <PageTitle
        title="Leads"
        sub="Sorted by how ready they are to hear from you."
        action={
          <FormDialog triggerLabel="Add lead" title="Add a lead" wide>
            <AddLeadForm applications={applications ?? []} defaultApplicationId={activeApplicationId === UNASSIGNED_APPLICATION ? null : activeApplicationId} />
          </FormDialog>
        }
      />

      <nav aria-label="Filter leads" className="mb-5 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Button key={f.key} asChild size="pill" variant={active ? "default" : "pill"} className="rounded-full">
              <Link href={href(f.key)} aria-current={active ? "page" : undefined}>
                {f.label}
                {f.key !== "all" && <span className="opacity-70">{counts[f.key as Temperature]}</span>}
              </Link>
            </Button>
          );
        })}
        {q && (
          <Button asChild size="pill" variant="outline" className="rounded-full">
            <Link href={filter === "all" ? "/leads" : `/leads?t=${filter}`} aria-label={`Clear search for ${q}`}>
              “{q}” ✕
            </Link>
          </Button>
        )}
      </nav>

      <Group>
        {shown.map(({ lead, temperature, reasons }) => (
          <li key={lead.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{lead.name}</span>
                  <TempBadge temperature={temperature} />
                  {lead.email_status === "invalid" && <StatusChip tone="rust">bad email</StatusChip>}
                  {lead.email_status === "risky" && <StatusChip tone="brass">risky email</StatusChip>}
                  {showAppBadge && lead.applications?.name && (
                    <StatusChip tone="neutral">{lead.applications.name}</StatusChip>
                  )}
                </div>
                <div className="mt-0.5 truncate text-sm text-ink-soft">
                  {[lead.company, lead.email].filter(Boolean).join(" · ") || "No contact details"}
                </div>
                {!!reasons.length && <div className="mt-1 text-xs text-ink-soft">{reasons.join(", ")}</div>}
              </div>
              <StatusChip tone={stageTone(lead.stage)}>{lead.stage}</StatusChip>
            </div>

            {lead.stage !== "won" && lead.stage !== "lost" && (
              <LeadActions lead={{ id: lead.id, name: lead.name, stage: lead.stage, email: lead.email }} />
            )}
            {lead.stage === "won" && lead.client_id && (
              <Button asChild variant="link" className="mt-1 h-auto px-0">
                <Link href={`/clients/${lead.client_id}`}>View client</Link>
              </Button>
            )}
          </li>
        ))}
        {!shown.length && (
          <EmptyState>
            {q
              ? `No leads match “${q}”.`
              : filter === "all"
                ? activeApplicationId === UNASSIGNED_APPLICATION ? "No unassigned leads yet." : activeApplicationId
                  ? "No leads in this application yet. Tap “Add lead” to start."
                  : "No leads yet. Tap “Add lead” to start."
                : `No ${filter} leads right now.`}
          </EmptyState>
        )}
      </Group>
    </div>
  );
}
