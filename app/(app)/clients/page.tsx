import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, Group, EmptyState, StatusChip } from "@/components/ui/kit";
import { FormDialog } from "@/components/ui/form-dialog";
import { AddClientForm } from "./AddClientForm";

const money = (n: number) =>
  `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function ClientsPage() {
  const supabase = createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, status, client_balances(balance)")
    .order("name");

  return (
    <div className="max-w-3xl">
      <PageTitle
        title="Clients"
        sub={clients?.length ? `${clients.length} in your book.` : undefined}
        action={
          <FormDialog triggerLabel="Add client" title="Add a client">
            <AddClientForm />
          </FormDialog>
        }
      />

      <Group>
        {clients?.map((c: any) => {
          const balance = Number(c.client_balances?.[0]?.balance ?? 0);
          return (
            <li key={c.id}>
              <Link href={`/clients/${c.id}`} className="tap flex items-center gap-3 px-4 py-3.5 hover:bg-paper/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{c.name}</span>
                    {c.status !== "active" && <StatusChip>{c.status}</StatusChip>}
                  </div>
                  <div className="truncate text-sm text-ink-soft">{c.email ?? "No email"}</div>
                </div>
                <div className={`shrink-0 text-right ${balance > 0 ? "font-medium text-rust" : "text-ink-soft"}`}>
                  {balance > 0 ? money(balance) : "Settled"}
                </div>
              </Link>
            </li>
          );
        })}
        {!clients?.length && <EmptyState>No clients yet. Tap “Add client” to start.</EmptyState>}
      </Group>
    </div>
  );
}
