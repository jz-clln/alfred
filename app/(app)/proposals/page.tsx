import { createClient } from "@/lib/supabase/server";
import { getActiveApplicationId } from "@/lib/applications";
import { filterApplication } from "@/lib/application-scope";
import { formatMoney } from "@/lib/money";
import { philippineDate } from "@/lib/time";
import type { Proposal } from "@/lib/proposals";
import { PageTitle, StatusChip } from "@/components/ui/kit";
import { Card } from "@/components/ui/card";
import { FormDialog } from "@/components/ui/form-dialog";
import { ProposalForm } from "./ProposalForm";
import { ProposalActions } from "./ProposalActions";

export default async function ProposalsPage() {
  const db = createClient();
  const scope = getActiveApplicationId();
  const proposalsQuery = db.from("proposals").select("*, leads(name, email), clients(name, email)").order("created_at", { ascending: false }).limit(100);
  const clientsQuery = db.from("clients").select("id, name").order("name");
  const leadsQuery = db.from("leads").select("id, name").not("stage", "in", "(won,lost)").order("name");
  for (const query of [proposalsQuery, clientsQuery, leadsQuery]) filterApplication(query, scope);
  const [proposals, clients, leads] = await Promise.all([proposalsQuery, clientsQuery, leadsQuery]);
  const recipients = [
    ...(clients.data ?? []).map((c) => ({ value: `client:${c.id}`, label: `${c.name} (client)` })),
    ...(leads.data ?? []).map((l) => ({ value: `lead:${l.id}`, label: `${l.name} (lead)` })),
  ];
  const today = philippineDate();
  return <div className="max-w-6xl">
    <PageTitle title="Proposals & quotes" sub="Draft, send, and turn accepted work into projects."
      action={<FormDialog triggerLabel="New draft" title="New proposal or quote" wide>
        <ProposalForm key={scope ?? "all"} scope={scope} recipients={recipients} />
      </FormDialog>} />
    {proposals.error ? <Card className="p-6"><p role="alert">Couldn't load proposals. Please try again.</p></Card> :
      <div className="grid gap-4">
        {(proposals.data ?? []).map((row) => {
          const proposal = row as unknown as Proposal;
          const recipient = row.leads ?? row.clients;
          return <Card key={proposal.id} className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs capitalize text-ink-soft">{proposal.kind} · {recipient?.name ?? "Recipient unavailable"}</p>
                <h2 className="mt-1 break-words text-xl">{proposal.title}</h2>
                <p className="mt-1 text-sm text-ink-soft">{recipient?.email ?? "No email address"}</p>
              </div>
              <div className="text-right">
                <p className="mb-2 font-display text-2xl">{formatMoney(Number(proposal.amount), proposal.currency)} <span className="text-xs">{proposal.currency}</span></p>
                <StatusChip tone={proposal.status === "accepted" ? "moss" : proposal.status === "declined" ? "rust" : "neutral"}>{proposal.status}</StatusChip>
              </div>
            </div>
            <details className="rounded-xl bg-fill/40 p-3">
              <summary className="cursor-pointer text-sm font-medium">Review scope & terms</summary>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{proposal.description}</p>
              {proposal.valid_until && <p className="mt-3 text-xs text-ink-soft">Valid until {proposal.valid_until}</p>}
            </details>
            <ProposalActions id={proposal.id} scope={scope} status={proposal.status} projectId={proposal.project_id}
              recipientEmail={recipient?.email ?? null} expired={!!proposal.valid_until && proposal.valid_until < today} />
          </Card>;
        })}
        {!proposals.data?.length && <Card className="p-8 text-center text-ink-soft">No proposals or quotes in this view. Create a draft to get started.</Card>}
        {(proposals.data?.length ?? 0) >= 100 && <p className="text-xs text-ink-soft">Showing the latest 100 documents in this view.</p>}
      </div>}
  </div>;
}
