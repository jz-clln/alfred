//app\(app)\dashboard\page.tsx

import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Flame,
  FolderKanban,
  MessageCircle,
  Send,
  Target,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { scoreLead } from "@/lib/leads/score";
import { Group, EmptyState } from "@/components/ui/kit";
import { getActiveApplicationId } from "@/lib/applications";
import { filterApplication, UNASSIGNED_APPLICATION } from "@/lib/application-scope";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { cn } from "@/lib/utils";
import { philippineDate } from "@/lib/time";
import { formatMoney, ledgerCurrency, convertMoney, moneyLabel, sumMoney } from "@/lib/money";
import { getDisplayCurrency } from "@/lib/currency-preference";
import { getExchangeRate } from "@/lib/exchange-rates";
import { Money, ExchangeRateNote } from "@/components/Money";
import { AddLeadForm } from "../leads/AddLeadForm";

function greeting() {
  const hour = Number(
    new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" })
  );
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

type Tone = "rust" | "moss" | "ink";
interface Item { key: string; href: string; title: string; meta: string; tone: Tone; icon: LucideIcon }

// Each item has a tinted icon AND text, so meaning never depends on colour alone.
const TONE: Record<Tone, string> = {
  rust: "bg-rust-soft text-rust",
  moss: "bg-moss-soft text-moss",
  ink: "bg-muted text-ink-soft",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const applicationId = getActiveApplicationId();
  const displayCurrency = getDisplayCurrency();
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000).toISOString();
  const clientCountQuery = supabase.from("clients").select("*", { count: "exact", head: true });
  const projectCountQuery = supabase.from("projects").select("id, clients()", { count: "exact", head: true }).eq("status", "active");
  const clientsQuery = supabase.from("clients").select("id, name, currency, client_balances(balance)");
  const leadsQuery = supabase.from("leads").select("*", { count: "exact" }).not("stage", "in", "(won,lost)");
  const messagesQuery = supabase.from("email_messages")
    .select("lead_id, status, opened_at, clicked_at, sent_at, leads()").not("lead_id", "is", null);
  const meetingsQuery = supabase.from("meetings").select("id, title, starts_at, clients()")
    .gte("starts_at", new Date().toISOString()).order("starts_at").limit(2);
  const overdueQuery = supabase.from("projects").select("id, clients()", { count: "exact", head: true })
    .eq("status", "active").lt("due_date", philippineDate());
  const upcomingQuery = supabase.from("meetings").select("id, clients()", { count: "exact", head: true })
    .gte("starts_at", now.toISOString()).lt("starts_at", weekEnd);
  const repliedQuery = supabase.from("leads").select("id", { count: "exact", head: true }).eq("stage", "replied");
  if (applicationId) {
    for (const query of [clientCountQuery, clientsQuery, leadsQuery, repliedQuery]) filterApplication(query, applicationId);
    for (const query of [projectCountQuery, meetingsQuery, overdueQuery, upcomingQuery]) {
      filterApplication(query, applicationId, "clients.application_id");
      query.not("clients", "is", null);
    }
    filterApplication(messagesQuery, applicationId, "leads.application_id");
    messagesQuery.not("leads", "is", null);
  }

  const [
    { count: clientCount },
    { count: activeProjectCount },
    { data: clients },
    { data: leads, count: openLeadCount },
    { data: messages },
    { data: meetings },
    { count: overdueCount },
    { count: upcomingCount },
    { count: repliedCount },
    { data: application },
    { data: applications },
    rate,
  ] = await Promise.all([
    clientCountQuery,
    projectCountQuery,
    clientsQuery,
    leadsQuery,
    messagesQuery,
    meetingsQuery,
    overdueQuery,
    upcomingQuery,
    repliedQuery,
    applicationId && applicationId !== UNASSIGNED_APPLICATION
      ? supabase.from("applications").select("name").eq("id", applicationId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("applications").select("id, name").order("created_at"),
    getExchangeRate(),
  ]);

  const owing = (clients ?? [])
    .map((c: any) => ({ id: c.id, name: c.name, currency: ledgerCurrency(c.currency), balance: Number(c.client_balances?.[0]?.balance ?? 0) }))
    .filter((c) => c.balance > 0)
    .sort((a, b) => {
      const left = convertMoney(a.balance, a.currency, displayCurrency, rate);
      const right = convertMoney(b.balance, b.currency, displayCurrency, rate);
      return left !== null && right !== null ? right - left : a.currency.localeCompare(b.currency) || b.balance - a.balance;
    });
  const totalOutstanding = sumMoney(owing.map((c) => ({ amount: c.balance, currency: c.currency })), displayCurrency, rate);
  const hasConversion = owing.some((c) => c.currency !== displayCurrency);
  const totalLabel = totalOutstanding === null ? "Unavailable" : `${hasConversion ? "≈ " : ""}${formatMoney(totalOutstanding, displayCurrency)}`;

  const byLead = new Map<string, any[]>();
  for (const m of messages ?? []) byLead.set(m.lead_id, [...(byLead.get(m.lead_id) ?? []), m]);
  const scored = (leads ?? []).map((l) => ({ lead: l, ...scoreLead(l, byLead.get(l.id) ?? []) }));
  const replies = scored.filter((s) => s.lead.stage === "replied");
  const hot = scored.filter((s) => s.temperature === "hot" && s.lead.stage !== "replied").sort((a, b) => b.score - a.score).slice(0, 3);

  const items: Item[] = [];
  if (replies.length) {
    items.push({
      key: "replies",
      href: "/leads",
      title: `${replies.length} ${replies.length === 1 ? "person has" : "people have"} replied`,
      meta: replies.slice(0, 3).map((r) => r.lead.name).join(", "),
      tone: "moss",
      icon: MessageCircle,
    });
  }
  hot.forEach(({ lead, reasons }) =>
    items.push({ key: `hot-${lead.id}`, href: "/leads?t=hot", title: `${lead.name} is a hot lead`, meta: reasons.join(", "), tone: "rust", icon: Flame })
  );
  (meetings ?? []).forEach((m) =>
    items.push({ key: `m-${m.id}`, href: "/meetings", title: m.title, meta: when(m.starts_at), tone: "ink", icon: CalendarClock })
  );
  owing.slice(0, 3).forEach((c) =>
    items.push({ key: `o-${c.id}`, href: `/clients/${c.id}`, title: `${c.name} owes ${moneyLabel(c.balance, c.currency, displayCurrency, rate)}`, meta: "Outstanding balance", tone: "rust", icon: Wallet })
  );

  const overdue = overdueCount ?? 0;
  const nothingYet = !(clientCount ?? 0) && !(openLeadCount ?? 0);

  const metrics: { label: string; value: string | number; note: string; href: string; urgent: boolean; icon: LucideIcon }[] = [
    { label: `Outstanding balance (${displayCurrency})`, value: totalLabel, note: totalOutstanding === null ? "Conversion unavailable. See original balances below." : `${plural(owing.length, "client")} with an unpaid balance`, href: "/clients", urgent: owing.length > 0, icon: Wallet },
    { label: "Active projects", value: activeProjectCount ?? 0, note: `${overdue} past their due date`, href: "/projects", urgent: overdue > 0, icon: FolderKanban },
    { label: "Open leads", value: openLeadCount ?? 0, note: "Not yet won or lost", href: "/leads", urgent: false, icon: Target },
    { label: "Replies to review", value: repliedCount ?? 0, note: "Leads currently marked replied", href: "/leads", urgent: (repliedCount ?? 0) > 0, icon: MessageCircle },
    { label: "Meetings, next 7 days", value: upcomingCount ?? 0, note: "Scheduled meetings saved in Alfred", href: "/meetings", urgent: false, icon: CalendarDays },
    { label: "Clients", value: clientCount ?? 0, note: "Across all client statuses", href: "/clients", urgent: false, icon: Users },
  ];

  const scope = applicationId === UNASSIGNED_APPLICATION ? "Unassigned" : application?.name ?? "All applications";

  return (
    <div className="max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="mb-2 text-sm text-ink-soft">{scope} · Business overview</p>
          <h1 className="text-4xl font-medium md:text-[2.6rem] md:leading-[1.1]">{greeting()}, sir.</h1>
          <p className="mt-3 text-ink-soft">
            {items.length
              ? `${items.length === 1 ? "1 thing needs" : `${items.length} things need`} your attention today.`
              : "You're all caught up."}
          </p>
        </div>
        {/* The two things you do most, no longer buried at the bottom. */}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/outreach">
              <Send aria-hidden="true" />
              Write an email
            </Link>
          </Button>
          <FormDialog triggerLabel="Add lead" title="Add a lead" variant="secondary" wide>
            <AddLeadForm
              applications={applications ?? []}
              defaultApplicationId={applicationId === UNASSIGNED_APPLICATION ? null : applicationId}
            />
          </FormDialog>
        </div>
      </header>

      <section aria-label="Business summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((m, i) => (
            <Card
              key={m.label}
              className={cn(
                "overflow-hidden",
                // Phones: balance and last tile span the row, the rest pair up.
                (i === 0 || i === metrics.length - 1) && "col-span-2 sm:col-span-1"
              )}
            >
              <Link
                href={m.href}
                className="group flex h-full flex-col gap-3 p-4 transition-colors hover:bg-fill/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40 sm:p-5"
              >
                <span className="flex items-center justify-between gap-2 text-sm text-ink-soft">
                  {m.label}
                  <m.icon className="size-4 shrink-0" aria-hidden="true" />
                </span>
                <span className={cn("break-words font-display text-2xl tabular-nums sm:text-3xl", m.urgent ? "text-rust" : "text-ink")}>
                  {m.value}
                  {m.urgent && <span className="sr-only"> (needs attention)</span>}
                </span>
                <span className={cn("text-xs", m.urgent ? "text-rust" : "text-ink-soft")}>{m.note}</span>
              </Link>
            </Card>
          ))}
        </div>
        <div className="mt-3">
          <ExchangeRateNote rate={rate} />
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-2">
        <section aria-labelledby="attention-title">
          <h2 id="attention-title" className="mb-3 text-lg">Where to focus</h2>
          {overdue > 0 && (
            <Link
              href="/projects"
              className="tap mb-3 flex min-h-11 items-center gap-3 rounded-2xl bg-rust-soft px-4 py-3 text-sm text-rust"
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">
                {plural(overdue, "active project")} {overdue === 1 ? "is" : "are"} overdue. Review due dates.
              </span>
              <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          )}
          <Group>
            {items.map((item, i) => (
              <li key={item.key} className="animate-rise" style={{ animationDelay: `${i * 45}ms` }}>
                <Link
                  href={item.href}
                  className="tap flex min-h-16 items-center gap-3.5 px-4 py-3 hover:bg-paper/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
                >
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", TONE[item.tone])}>
                    <item.icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.title}</span>
                    <span className="block truncate text-sm text-ink-soft">{item.meta}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
                </Link>
              </li>
            ))}
            {!items.length && (
              <EmptyState icon={<CheckCircle2 className="size-6 text-moss" aria-hidden="true" />}>
                {nothingYet
                  ? "Add your first lead or client and your priorities show up here."
                  : "You're all caught up. Nothing needs you right now."}
              </EmptyState>
            )}
          </Group>
        </section>

        <section aria-labelledby="balances-title" className="space-y-4">
          <div>
            <h2 id="balances-title" className="mb-3 text-lg">
              {totalOutstanding === null ? "Outstanding balances by currency" : "Largest outstanding balances"}
            </h2>
            <Group>
              {owing.slice(0, 5).map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="tap flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-fill/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
                  >
                    <span className="truncate">{client.name}</span>
                    <span className="shrink-0 text-right font-medium tabular-nums text-rust">
                      <Money amount={client.balance} currency={client.currency} displayCurrency={displayCurrency} rate={rate} />
                    </span>
                  </Link>
                </li>
              ))}
              {owing.length > 5 && (
                <li>
                  <Link href="/clients" className="tap flex min-h-11 items-center justify-center px-4 text-sm text-ink-soft hover:text-ink">
                    View all {owing.length} clients with a balance
                  </Link>
                </li>
              )}
              {!owing.length && (
                <EmptyState icon={<CheckCircle2 className="size-6 text-moss" aria-hidden="true" />}>
                  No outstanding balances in this view.
                </EmptyState>
              )}
            </Group>
          </div>

          <Card>
            <Link
              href="/insights"
              className="tap flex min-h-16 items-center gap-3.5 rounded-2xl px-4 py-3 hover:bg-fill/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-ink-soft">
                <TrendingUp className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block">How is outreach performing?</span>
                <span className="block text-sm text-ink-soft">Response, meeting and conversion rates for this view.</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
            </Link>
          </Card>
        </section>
      </div>
    </div>
  );
}
