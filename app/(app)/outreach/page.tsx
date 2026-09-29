import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, Group, EmptyState } from "@/components/ui/kit";
import { ComposeForm } from "./ComposeForm";

const kindLabel: Record<string, string> = { manual: "Email", follow_up: "Follow-up", reminder: "Reminder" };

export default async function OutreachPage({ searchParams }: { searchParams: { to?: string } }) {
  const supabase = createClient();
  const [{ data: clients }, { data: leads }, { data: sequences }, { data: recent }] = await Promise.all([
    supabase.from("clients").select("id, name, email").order("name"),
    supabase.from("leads").select("id, name, email, email_status").not("stage", "in", "(won,lost)").order("name"),
    supabase.from("sequences").select("id, name").order("created_at"),
    supabase
      .from("email_messages")
      .select("id, to_email, subject, kind, status, sent_at, opened_at")
      .order("sent_at", { ascending: false })
      .limit(15),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Outreach"
        sub="Write once, send to as many people as you like."
        action={<Link href="/outreach/sequences" className="tap rounded-full bg-fill px-3.5 py-1.5 text-sm text-ink-soft hover:text-ink">Follow-up sequences</Link>}
      />

      <ComposeForm
        clients={clients ?? []}
        leads={(leads ?? []).map((l) => ({ ...l, bad: l.email_status === "invalid" }))}
        sequences={sequences ?? []}
        initialChecked={searchParams.to ? [searchParams.to] : []}
      />

      <h2 className="mb-3 mt-12 text-lg">Recently sent</h2>
      <Group>
        {recent?.map((m) => (
          <li key={m.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="truncate">{m.subject}</div>
              <div className="truncate text-xs text-ink-soft">{m.to_email}</div>
            </div>
            <div className="shrink-0 text-right text-xs text-ink-soft">
              <div className={m.status === "failed" || m.status === "bounced" ? "text-rust" : ""}>
                {kindLabel[m.kind]} · {m.status}
              </div>
              {m.opened_at && <div className="text-moss">Opened</div>}
            </div>
          </li>
        ))}
        {!recent?.length && <EmptyState>Nothing sent yet.</EmptyState>}
      </Group>
    </div>
  );
}
