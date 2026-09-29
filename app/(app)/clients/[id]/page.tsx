import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Group, EmptyState, StatusChip } from "@/components/ui/kit";
import { AddBalanceEntryForm } from "./AddBalanceEntryForm";

const money = (n: number) =>
  `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: client }, { data: entries }, { data: balanceRow }, { data: projects }, { data: emails }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", params.id).single(),
      supabase.from("balance_entries").select("*").eq("client_id", params.id).order("entry_date", { ascending: false }),
      supabase.from("client_balances").select("balance").eq("client_id", params.id).maybeSingle(),
      supabase.from("projects").select("id, name, status").eq("client_id", params.id),
      supabase
        .from("email_messages")
        .select("id, subject, kind, status, sent_at")
        .eq("client_id", params.id)
        .order("sent_at", { ascending: false })
        .limit(5),
    ]);

  if (!client) notFound();
  const balance = Number(balanceRow?.balance ?? 0);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/clients" className="text-sm text-moss">Clients</Link>

      <div className="mb-8 mt-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-4xl font-medium">{client.name}</h1>
          <p className="mt-1.5 text-ink-soft">
            {[client.email, client.phone].filter(Boolean).join(" · ") || "No contact details"}
          </p>
          {client.email && (
            <Link
              href={`/outreach?to=client:${client.id}`}
              className="tap mt-3 inline-block rounded-full bg-fill px-3.5 py-1.5 text-sm text-ink-soft hover:text-ink"
            >
              Write an email
            </Link>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-ink-soft">Balance</div>
          <div className={`font-display text-3xl ${balance > 0 ? "text-rust" : "text-moss"}`}>{money(balance)}</div>
        </div>
      </div>

      {!!projects?.length && (
        <>
          <h2 className="mb-3 text-lg">Projects</h2>
          <div className="mb-8">
            <Group>
              {projects.map((p) => (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="tap flex items-center justify-between px-4 py-3 text-sm hover:bg-paper/60">
                    <span>{p.name}</span>
                    <StatusChip tone={p.status === "active" ? "moss" : "neutral"}>{p.status.replace("_", " ")}</StatusChip>
                  </Link>
                </li>
              ))}
            </Group>
          </div>
        </>
      )}

      <h2 className="mb-3 text-lg">Ledger</h2>
      <Group>
        {entries?.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="capitalize">{e.type}{e.memo ? <span className="text-ink-soft"> · {e.memo}</span> : null}</div>
              <div className="text-xs text-ink-soft">{e.entry_date}</div>
            </div>
            <div className={e.type === "invoice" ? "text-rust" : "text-moss"}>
              {e.type === "invoice" ? "+" : "−"}{money(e.amount)}
            </div>
          </li>
        ))}
        {!entries?.length && <EmptyState>No entries yet.</EmptyState>}
      </Group>

      <div className="mt-4">
        <AddBalanceEntryForm clientId={params.id} />
      </div>

      {!!emails?.length && (
        <>
          <h2 className="mb-3 mt-10 text-lg">Recent emails</h2>
          <Group>
            {emails.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="truncate">{m.subject}</span>
                <span className={`shrink-0 text-xs ${m.status === "failed" || m.status === "bounced" ? "text-rust" : "text-ink-soft"}`}>
                  {m.kind === "reminder" ? "Reminder" : "Email"} · {m.status}
                </span>
              </li>
            ))}
          </Group>
        </>
      )}
    </div>
  );
}
