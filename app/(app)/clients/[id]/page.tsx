import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Group, StatusChip } from "@/components/ui/kit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormDialog } from "@/components/ui/form-dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AddBalanceEntryForm } from "./AddBalanceEntryForm";
import { ClientCurrencyForm } from "./ClientCurrencyForm";
import { formatMoney, ledgerCurrency } from "@/lib/money";
import { getDisplayCurrency } from "@/lib/currency-preference";
import { getExchangeRate } from "@/lib/exchange-rates";
import { Money, ExchangeRateNote } from "@/components/Money";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const displayCurrency = getDisplayCurrency();

  const [{ data: client }, { data: entries }, { data: balanceRow }, { data: projects }, { data: emails }, rate] =
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
      getExchangeRate(),
    ]);

  if (!client) notFound();
  const balance = Number(balanceRow?.balance ?? 0);
  const currency = ledgerCurrency(client.currency);

  return (
    <div className="max-w-6xl">
      <Link href="/clients" className="text-sm text-moss">Clients</Link>

      <div className="mb-8 mt-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-4xl font-medium">{client.name}</h1>
          <p className="mt-1.5 text-ink-soft">
            {[client.email, client.phone].filter(Boolean).join(" · ") || "No contact details"}
          </p>
          {client.email && (
            <Button asChild variant="pill" size="pill" className="mt-3">
              <Link href={`/outreach?to=client:${client.id}`}>Write an email</Link>
            </Button>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-ink-soft">Balance</div>
          <div className={`font-display text-3xl ${balance > 0 ? "text-rust" : "text-moss"}`}>
            <Money amount={balance} currency={currency} displayCurrency={displayCurrency} rate={rate} />
          </div>
        </div>
      </div>

      <Card className="mb-8 space-y-3 p-4">
        {entries?.length ? <p className="text-sm text-ink-soft">Billing currency: {currency}. Existing ledger entries keep their original currency.</p>
          : <ClientCurrencyForm key={currency} clientId={params.id} currency={currency} />}
        <ExchangeRateNote rate={rate} />
      </Card>

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

      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-lg">Ledger</h2>
        <FormDialog
          triggerLabel="Add entry"
          title="Add a ledger entry"
          description="Log an invoice you sent or a payment you received."
          variant="secondary"
        >
          <AddBalanceEntryForm key={currency} clientId={params.id} currency={currency} />
        </FormDialog>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Entry</TableHead>
              <TableHead className="text-right">Amount ({currency})</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries?.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap text-xs text-ink-soft">{e.entry_date}</TableCell>
                <TableCell className="min-w-0">
                  <span className="capitalize">{e.type}</span>
                  {e.memo && <span className="text-ink-soft"> · {e.memo}</span>}
                </TableCell>
                <TableCell
                  className={`whitespace-nowrap text-right tabular-nums ${e.type === "invoice" ? "text-rust" : "text-moss"}`}
                >
                  {e.type === "invoice" ? "+" : "−"}
                  {formatMoney(Number(e.amount), ledgerCurrency(e.currency ?? currency))}
                </TableCell>
              </TableRow>
            ))}
            {!entries?.length && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-ink-soft">
                  No entries yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

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
