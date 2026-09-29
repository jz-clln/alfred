import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addBalanceEntry } from "../actions";

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: client }, { data: entries }, { data: balanceRow }, { data: projects }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", params.id).single(),
      supabase
        .from("balance_entries")
        .select("*")
        .eq("client_id", params.id)
        .order("entry_date", { ascending: false }),
      supabase
        .from("client_balances")
        .select("balance")
        .eq("client_id", params.id)
        .maybeSingle(),
      supabase.from("projects").select("id, name, status").eq("client_id", params.id),
    ]);

  if (!client) notFound();

  const balance = balanceRow?.balance ?? 0;
  const addEntry = addBalanceEntry.bind(null, params.id);

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-medium">{client.name}</h1>
          <p className="mt-1 text-ink-soft">{client.email ?? "No email on file"}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-soft">Balance</div>
          <div
            className={`font-display text-3xl ${
              balance > 0 ? "text-rust" : "text-moss"
            }`}
          >
            ${Number(balance).toFixed(2)}
          </div>
        </div>
      </div>

      {!!projects?.length && (
        <div className="mb-8">
          <h2 className="mb-2 text-sm text-ink-soft">Projects</h2>
          <ul className="space-y-1 text-sm">
            {projects.map((p) => (
              <li key={p.id}>
                {p.name} <span className="text-ink-soft capitalize">— {p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mb-2 text-sm text-ink-soft">Ledger</h2>
      <div className="mb-6 overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-left text-ink-soft">
              <th className="px-4 py-3 font-normal">Date</th>
              <th className="px-4 py-3 font-normal">Type</th>
              <th className="px-4 py-3 font-normal">Memo</th>
              <th className="px-4 py-3 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries?.map((e) => (
              <tr key={e.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 text-ink-soft">{e.entry_date}</td>
                <td className="px-4 py-3 capitalize">{e.type}</td>
                <td className="px-4 py-3 text-ink-soft">{e.memo ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {e.type === "invoice" ? "+" : "−"}${Number(e.amount).toFixed(2)}
                </td>
              </tr>
            ))}
            {!entries?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-soft">
                  No entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form action={addEntry} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Type</label>
          <select
            name="type"
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm"
          >
            <option value="invoice">Invoice (they owe you)</option>
            <option value="payment">Payment (they paid you)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Amount</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            className="w-32 rounded-md border border-line bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-ink-soft">Memo</label>
          <input
            name="memo"
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-ink px-4 py-2 text-sm text-paper hover:opacity-90"
        >
          Add entry
        </button>
      </form>
    </div>
  );
}
