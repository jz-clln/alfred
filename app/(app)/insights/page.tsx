import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/ui/kit";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function Bar({ label, value, of, note }: { label: string; value: number; of: number; note?: string }) {
  const hasData = of > 0;
  const p = hasData ? Math.round((value / of) * 100) : 0;
  return (
    <li className="px-4 py-3.5">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="font-display text-xl">{hasData ? `${p}%` : "—"}</span>
      </div>
      <Progress value={p} label={`${label}: ${hasData ? `${p} percent` : "no data yet"}`} />
      <div className="mt-1.5 text-xs text-ink-soft">
        {hasData ? `${value} of ${of}` : "No data yet"}
        {note ? ` · ${note}` : ""}
      </div>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg">{title}</h2>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-border/70">{children}</ul>
      </Card>
    </section>
  );
}

export default async function InsightsPage() {
  const supabase = createClient();
  const [{ data: leads }, { data: messages }] = await Promise.all([
    supabase.from("leads").select("stage, last_contacted_at, last_replied_at, client_id"),
    supabase.from("email_messages").select("status, opened_at, kind"),
  ]);

  const all = leads ?? [];
  const contacted = all.filter((l) => l.last_contacted_at).length;
  const replied = all.filter((l) => l.last_replied_at).length;
  const meetings = all.filter((l) => l.stage === "meeting" || l.stage === "won").length;
  const won = all.filter((l) => l.stage === "won" || l.client_id).length;

  const outbound = (messages ?? []).filter((m) => m.status !== "failed");
  const opened = outbound.filter((m) => m.opened_at).length;
  const bounced = outbound.filter((m) => m.status === "bounced").length;

  return (
    <div className="max-w-3xl">
      <PageTitle title="Insights" sub="How your outreach is turning into work." />

      <div className="space-y-10">
        <Section title="Leads">
          <Bar label="Response rate" value={replied} of={contacted} note="contacted leads who replied" />
          <Bar label="Meeting rate" value={meetings} of={contacted} note="contacted leads who booked" />
          <Bar label="Conversion rate" value={won} of={all.length} note="all leads who became clients" />
        </Section>

        <Section title="Emails">
          <Bar label="Open rate" value={opened} of={outbound.length} note="treat as a rough guide" />
          <Bar label="Bounce rate" value={bounced} of={outbound.length} />
        </Section>
      </div>

      <p className="mt-6 max-w-prose text-sm text-ink-soft">
        Replies count when you mark a lead as replied, so keep that up to date for accurate rates. Open
        tracking is approximate: some mail apps hide opens, and others open messages automatically.
      </p>
    </div>
  );
}
