import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { scoreLead } from "@/lib/leads/score";
import { Group } from "@/components/ui/kit";

const money = (n: number) =>
  `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

interface Item { key: string; href: string; title: string; meta: string; tone: "rust" | "moss" | "ink" }

export default async function DashboardPage() {
  const supabase = createClient();

  const [
    { count: clientCount },
    { count: activeProjectCount },
    { data: clients },
    { data: leads },
    { data: messages },
    { data: meetings },
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("clients").select("id, name, client_balances(balance)"),
    supabase.from("leads").select("*").not("stage", "in", "(won,lost)"),
    supabase.from("email_messages").select("lead_id, status, opened_at, clicked_at, sent_at").not("lead_id", "is", null),
    supabase
      .from("meetings")
      .select("id, title, starts_at")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(2),
  ]);

  const owing = (clients ?? [])
    .map((c: any) => ({ id: c.id, name: c.name, balance: Number(c.client_balances?.[0]?.balance ?? 0) }))
    .filter((c) => c.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  const totalOutstanding = owing.reduce((s, c) => s + c.balance, 0);

  const byLead = new Map<string, any[]>();
  for (const m of messages ?? []) byLead.set(m.lead_id, [...(byLead.get(m.lead_id) ?? []), m]);
  const scored = (leads ?? []).map((l) => ({ lead: l, ...scoreLead(l, byLead.get(l.id) ?? []) }));
  const replies = scored.filter((s) => s.lead.stage === "replied");
  const hot = scored.filter((s) => s.temperature === "hot" && s.lead.stage !== "replied").sort((a, b) => b.score - a.score).slice(0, 3);

  const items: Item[] = [];
  if (replies.length) {
    items.push({
      key: "replies",
      href: "/leads?t=hot",
      title: `${replies.length} ${replies.length === 1 ? "person has" : "people have"} replied`,
      meta: replies.slice(0, 3).map((r) => r.lead.name).join(", "),
      tone: "moss",
    });
  }
  hot.forEach(({ lead, reasons }) =>
    items.push({ key: `hot-${lead.id}`, href: "/leads?t=hot", title: `${lead.name} is a hot lead`, meta: reasons.join(", "), tone: "rust" })
  );
  (meetings ?? []).forEach((m) =>
    items.push({ key: `m-${m.id}`, href: "/meetings", title: m.title, meta: when(m.starts_at), tone: "ink" })
  );
  owing.slice(0, 3).forEach((c) =>
    items.push({ key: `o-${c.id}`, href: `/clients/${c.id}`, title: `${c.name} owes ${money(c.balance)}`, meta: "Outstanding balance", tone: "rust" })
  );

  const tone = { rust: "bg-rust", moss: "bg-moss", ink: "bg-ink-soft" };

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-medium md:text-[2.6rem] md:leading-[1.1]">{greeting()}, sir.</h1>
      <p className="mt-3 text-lg text-ink-soft">
        {items.length
          ? `${items.length} ${items.length === 1 ? "thing needs" : "things need"} you today.`
          : "Nothing needs you today."}
      </p>

      {!!items.length && (
        <div className="mt-8">
          <Group>
            {items.map((item, i) => (
              <li key={item.key} className="animate-rise" style={{ animationDelay: `${i * 45}ms` }}>
                <Link href={item.href} className="tap flex items-center gap-3.5 px-4 py-3.5 hover:bg-paper/60">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${tone[item.tone]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.title}</span>
                    <span className="block truncate text-sm text-ink-soft">{item.meta}</span>
                  </span>
                </Link>
              </li>
            ))}
          </Group>
        </div>
      )}

      <p className="mt-10 text-ink-soft">
        <span className="font-display text-xl text-ink">{clientCount ?? 0}</span> clients,{" "}
        <span className="font-display text-xl text-ink">{activeProjectCount ?? 0}</span> active projects,{" "}
        <span className="font-display text-xl text-ink">{money(totalOutstanding)}</span> outstanding.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {[
          { href: "/outreach", label: "Write an email" },
          { href: "/leads", label: "Add a lead" },
          { href: "/projects", label: "Projects" },
          { href: "/insights", label: "Insights" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="tap rounded-full bg-fill px-4 py-2 text-sm text-ink-soft hover:text-ink">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
