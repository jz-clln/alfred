import { formatMoney, isCurrency, type Currency } from "@/lib/money";

export type ProposalStatus = "draft" | "sending" | "sent" | "accepted" | "declined";
export interface Proposal {
  id: string; owner_id: string; application_id: string | null;
  lead_id: string | null; client_id: string | null;
  kind: "proposal" | "quote"; title: string; description: string;
  amount: number; currency: Currency; valid_until: string | null;
  status: ProposalStatus; project_id: string | null;
  sent_at: string | null; accepted_at: string | null;
}

export function parseProposal(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const amountText = String(form.get("amount") ?? "").trim();
  const amount = Number(amountText);
  const currency = form.get("currency");
  const kind = form.get("kind");
  const valid_until = String(form.get("valid_until") ?? "").trim() || null;
  if (!title || title.length > 200 || !description || description.length > 20000 ||
      !/^\d+(\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount <= 0 || amount >= 10_000_000_000 ||
      !isCurrency(currency) || (kind !== "proposal" && kind !== "quote")) return null;
  if (valid_until && (!/^\d{4}-\d{2}-\d{2}$/.test(valid_until) ||
      !Number.isFinite(Date.parse(valid_until)) || new Date(valid_until).toISOString().slice(0, 10) !== valid_until)) return null;
  return { title, description, amount, currency, kind, valid_until };
}

export function proposalEmail(proposal: Proposal, name: string) {
  const heading = proposal.kind === "quote" ? "Quote" : "Proposal";
  return {
    subject: `${heading}: ${proposal.title}`,
    body: `Hi ${name},\n\n${heading}: ${proposal.title}\n\n${proposal.description}\n\nTotal: ${formatMoney(Number(proposal.amount), proposal.currency)} (${proposal.currency})${proposal.valid_until ? `\nValid until: ${proposal.valid_until}` : ""}\n\nPlease reply to this email to accept or discuss any changes.\n\nReference: ${proposal.id}`,
  };
}
