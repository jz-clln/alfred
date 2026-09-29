import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClientRecord } from "./actions";

export default async function ClientsPage() {
  const supabase = createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, status, client_balances(balance)")
    .order("name");

  return (
    <div>
      <h1 className="mb-8 text-3xl font-medium">Clients</h1>

      <div className="mb-8 overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-left text-ink-soft">
              <th className="px-4 py-3 font-normal">Name</th>
              <th className="px-4 py-3 font-normal">Email</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 text-right font-normal">Balance</th>
            </tr>
          </thead>
          <tbody>
            {clients?.map((c: any) => {
              const balance = c.client_balances?.[0]?.balance ?? 0;
              return (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft capitalize">{c.status}</td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      balance > 0 ? "text-rust" : "text-ink-soft"
                    }`}
                  >
                    ${Number(balance).toFixed(2)}
                  </td>
                </tr>
              );
            })}
            {!clients?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-soft">
                  No clients yet — add your first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form
        action={createClientRecord}
        className="flex max-w-xl flex-wrap items-end gap-3"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs text-ink-soft">Name</label>
          <input
            name="name"
            required
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-moss"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-ink-soft">Email</label>
          <input
            name="email"
            type="email"
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-moss"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-ink px-4 py-2 text-sm text-paper hover:opacity-90"
        >
          Add client
        </button>
      </form>
    </div>
  );
}
