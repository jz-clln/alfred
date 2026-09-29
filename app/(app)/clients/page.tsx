import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveApplicationId } from "@/lib/applications";
import { filterApplication, UNASSIGNED_APPLICATION } from "@/lib/application-scope";
import { PageTitle, Group, EmptyState, StatusChip } from "@/components/ui/kit";
import { FormDialog } from "@/components/ui/form-dialog";
import { AddClientForm } from "./AddClientForm";
import { ledgerCurrency } from "@/lib/money";
import { getDisplayCurrency } from "@/lib/currency-preference";
import { getExchangeRate } from "@/lib/exchange-rates";
import { Money, ExchangeRateNote } from "@/components/Money";

export default async function ClientsPage() {
  const supabase = createClient();
  const activeApplicationId = getActiveApplicationId();
  const displayCurrency = getDisplayCurrency();

  let clientsQuery = supabase
    .from("clients")
    .select("id, name, email, status, currency, application_id, client_balances(balance), applications(name)")
    .order("name");
  filterApplication(clientsQuery, activeApplicationId);

  const [{ data: clients }, { data: applications }, rate] = await Promise.all([
    clientsQuery,
    supabase.from("applications").select("id, name").order("created_at"),
    getExchangeRate(),
  ]);

  // Only bother labeling which application a client belongs to when you're
  // looking at everything at once — inside a single application it's redundant.
  const showAppBadge = !activeApplicationId && (applications?.length ?? 0) > 0;

  return (
    <div className="max-w-6xl">
      <PageTitle
        title="Clients"
        sub={clients?.length ? `${clients.length} in your book.` : undefined}
        action={
          <FormDialog triggerLabel="Add client" title="Add a client">
            <AddClientForm applications={applications ?? []} defaultApplicationId={activeApplicationId === UNASSIGNED_APPLICATION ? null : activeApplicationId} />
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
                    {showAppBadge && c.applications?.name && (
                      <StatusChip tone="neutral">{c.applications.name}</StatusChip>
                    )}
                  </div>
                  <div className="truncate text-sm text-ink-soft">{c.email ?? "No email"}</div>
                </div>
                <div className={`shrink-0 text-right ${balance > 0 ? "font-medium text-rust" : "text-ink-soft"}`}>
                  {balance > 0 ? <Money amount={balance} currency={ledgerCurrency(c.currency)} displayCurrency={displayCurrency} rate={rate} /> : "Settled"}
                </div>
              </Link>
            </li>
          );
        })}
        {!clients?.length && (
          <EmptyState>
            {activeApplicationId === UNASSIGNED_APPLICATION ? "No unassigned clients yet." : activeApplicationId
              ? "No clients in this application yet. Tap “Add client” to start."
              : "No clients yet. Tap “Add client” to start."}
          </EmptyState>
        )}
      </Group>
      <div className="mt-4"><ExchangeRateNote rate={rate} /></div>
    </div>
  );
}
