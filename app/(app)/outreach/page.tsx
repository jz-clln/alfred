import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveApplicationId } from "@/lib/applications";
import { filterApplication, UNASSIGNED_APPLICATION } from "@/lib/application-scope";
import { PageTitle } from "@/components/ui/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ComposeForm } from "./ComposeForm";
import { sendEmails } from "./actions";
import { RepliesPanel } from "./RepliesPanel";
import { SentPanel } from "./SentPanel";

type Tab = "write" | "replies" | "sent";
const TABS: { key: Tab; label: string }[] = [
  { key: "write", label: "Write" },
  { key: "replies", label: "Replies" },
  { key: "sent", label: "Sent" },
];

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: { tab?: string; to?: string; f?: string; gmail?: string; connected?: string };
}) {
  const supabase = createClient();
  const scope = getActiveApplicationId();

  // Follows the active application, like the rest of Alfred.
  const inScope = (appId: string | null | undefined) =>
    !scope ? true : scope === UNASSIGNED_APPLICATION ? !appId : appId === scope;

  // Round 1: replies and the Google connection. Needed for the unread badge
  // and to pick the starting tab.
  const [{ data: inbound }, { data: token }] = await Promise.all([
    supabase
      .from("inbound_emails")
      .select(
        "id, from_name, from_email, subject, snippet, received_at, read_at, lead_id, client_id, leads(name, application_id), clients(name, application_id)"
      )
      .order("received_at", { ascending: false })
      .limit(100),
    supabase.from("google_tokens").select("gmail_synced_at").limit(1).maybeSingle(),
  ]);
  const replies = (inbound ?? []).filter((r: any) =>
    inScope(r.leads?.application_id ?? r.clients?.application_id ?? null)
  );
  const unreadCount = replies.filter((r: any) => !r.read_at).length;

  // Which tab opens: an explicit ?tab= wins. Coming from "Write an email" on a
  // lead or client (?to=) opens Write. Otherwise: Replies if something is
  // unread, else Write.
  const explicit = TABS.find((t) => t.key === searchParams.tab)?.key;
  const tab: Tab = explicit ?? (searchParams.to ? "write" : unreadCount > 0 ? "replies" : "write");

  // Round 2: only what the open tab needs.
  let clients: any[] = [], leads: any[] = [], sequences: any[] = [], sent: any[] = [];
  if (tab === "write") {
    const clientsQ = supabase.from("clients").select("id, name, email").order("name");
    const leadsQ = supabase.from("leads").select("id, name, email, email_status").not("stage", "in", "(won,lost)").order("name");
    if (scope) {
      filterApplication(clientsQ, scope);
      filterApplication(leadsQ, scope);
    }
    const [c, l, s] = await Promise.all([
      clientsQ,
      leadsQ,
      supabase.from("sequences").select("id, name").order("created_at"),
    ]);
    clients = c.data ?? [];
    leads = l.data ?? [];
    sequences = s.data ?? [];
  } else if (tab === "sent") {
    const { data } = await supabase
      .from("email_messages")
      .select("id, to_email, subject, kind, status, sent_at, opened_at, leads(application_id), clients(application_id)")
      .order("sent_at", { ascending: false })
      .limit(50);
    sent = (data ?? []).filter((m: any) => inScope(m.leads?.application_id ?? m.clients?.application_id ?? null));
  }

  return (
    <div className="max-w-6xl">
      <PageTitle
        title="Outreach"
        sub="Write, follow up, and read replies in one place."
        action={
          <Button asChild variant="pill" size="pill" className="shrink-0">
            <Link href="/outreach/sequences">Follow-up sequences</Link>
          </Button>
        }
      />

      <nav aria-label="Outreach sections" className="mb-6 flex rounded-xl bg-muted p-1 sm:inline-flex">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/outreach?tab=${t.key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "tap flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                active ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {t.key === "replies" && unreadCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary-foreground">
                  {unreadCount}
                  <span className="sr-only"> unread</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {tab === "write" && (
        <ComposeForm
          key={scope ?? "all"}
          sendAction={sendEmails.bind(null, scope)}
          clients={clients}
          leads={leads.map((l) => ({ ...l, bad: l.email_status === "invalid" }))}
          sequences={sequences}
          initialChecked={searchParams.to ? [searchParams.to] : []}
        />
      )}
      {tab === "replies" && (
        <RepliesPanel
          rows={replies}
          filter={searchParams.f === "unread" ? "unread" : "all"}
          lastChecked={token?.gmail_synced_at ?? null}
          connected={!!token}
          gmailMissing={searchParams.gmail === "missing"}
        />
      )}
      {tab === "sent" && <SentPanel rows={sent} />}
    </div>
  );
}
