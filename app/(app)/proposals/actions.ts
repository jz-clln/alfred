"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveApplicationId } from "@/lib/applications";
import { filterApplication } from "@/lib/application-scope";
import { philippineDate } from "@/lib/time";
import { parseProposal, proposalEmail, type Proposal } from "@/lib/proposals";
import type { ActionState } from "@/lib/action-state";
import { sendEmail } from "@/lib/email/send";

async function context(scope: string | null) {
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  if (scope !== getActiveApplicationId()) throw new Error("Application changed. Reload this page before continuing.");
  return { db, user };
}

function refresh() {
  for (const path of ["/proposals", "/projects", "/clients", "/leads", "/dashboard", "/insights", "/outreach"]) revalidatePath(path);
}

export async function createProposal(scope: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  if (scope !== getActiveApplicationId()) return { success: false, message: "Application changed. Reload before saving this draft." };
  const { db, user } = await context(scope);
  const values = parseProposal(form);
  if (!values) return { success: false, message: "Enter a title, scope of work, positive amount (up to 2 decimals), and PHP or USD." };
  if (values.valid_until && values.valid_until < philippineDate()) return { success: false, message: "Choose a validity date today or later." };
  const match = /^(lead|client):([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.exec(String(form.get("recipient") ?? ""));
  if (!match) return { success: false, message: "Choose a recipient." };
  const [, kind, id] = match;
  const query = db.from(kind === "lead" ? "leads" : "clients").select("id, application_id")
    .eq("id", id).eq("owner_id", user.id);
  filterApplication(query, scope);
  const { data: recipient, error } = await query.maybeSingle();
  if (error || !recipient) return { success: false, message: "Recipient unavailable in this application." };
  const { error: insertError } = await db.from("proposals").insert({
    ...values, owner_id: user.id, application_id: recipient.application_id,
    lead_id: kind === "lead" ? id : null, client_id: kind === "client" ? id : null,
  });
  if (insertError) return { success: false, message: "Couldn't save the draft. Check that the proposals migration is applied." };
  revalidatePath("/proposals");
  return { success: true, message: "Draft saved. Review it before sending." };
}

async function loadProposal(scope: string | null, id: string) {
  const { db, user } = await context(scope);
  const query = db.from("proposals").select("*").eq("id", id).eq("owner_id", user.id);
  filterApplication(query, scope);
  const { data, error } = await query.maybeSingle();
  if (error || !data) throw new Error("Proposal unavailable in this application.");
  return { db, user, proposal: data as Proposal };
}

export async function sendProposal(scope: string | null, id: string): Promise<string> {
  const { db, user, proposal } = await loadProposal(scope, id);
  if (proposal.status !== "draft") throw new Error("This draft has already been sent or is being processed.");
  if (proposal.valid_until && proposal.valid_until < philippineDate()) throw new Error("This draft has expired. Create a new one.");
  const { data: recipient, error } = await db.from(proposal.lead_id ? "leads" : "clients")
    .select("*").eq("id", proposal.lead_id ?? proposal.client_id!).eq("owner_id", user.id).maybeSingle();
  if (error || !recipient || recipient.application_id !== proposal.application_id || !recipient.email || recipient.email_status === "invalid") {
    throw new Error("Recipient email or application is unavailable. Nothing was sent.");
  }
  // Claim the draft before calling the provider to prevent double clicks sending twice.
  const { data: claimed, error: claimError } = await db.from("proposals").update({ status: "sending" })
    .eq("id", id).eq("owner_id", user.id).eq("status", "draft").select("id").maybeSingle();
  if (claimError || !claimed) throw new Error("This draft is already being processed. Refresh the page.");
  const content = proposalEmail(proposal, recipient.name);
  const result = await sendEmail({ to: recipient.email, ...content });
  if (!result.ok) {
    await db.from("proposals").update({ status: "draft" }).eq("id", id).eq("status", "sending");
    revalidatePath("/proposals");
    throw new Error(result.error);
  }
  const { error: saveError } = await db.from("proposals").update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id).eq("status", "sending");
  await db.from("email_messages").insert({
    owner_id: user.id, lead_id: proposal.lead_id, client_id: proposal.client_id,
    to_email: recipient.email, ...content, kind: "manual", status: "sent", provider_id: result.id,
  });
  refresh();
  if (saveError) throw new Error("Email was sent, but its status couldn't be saved. Do not resend; check your sent mail.");
  return "Sent. Record acceptance here after the customer agrees.";
}

export async function acceptProposal(scope: string | null, id: string): Promise<string> {
  const { db } = await loadProposal(scope, id);
  const { data, error } = await db.rpc("accept_proposal", { proposal_id: id });
  if (error || !data) throw new Error(error?.message ?? "Couldn't create the project.");
  refresh();
  return data as string;
}

export async function declineProposal(scope: string | null, id: string): Promise<void> {
  const { db, user } = await loadProposal(scope, id);
  const { data, error } = await db.from("proposals").update({ status: "declined" })
    .eq("id", id).eq("owner_id", user.id).eq("status", "sent").select("id").maybeSingle();
  if (error || !data) throw new Error("Only a sent proposal can be marked declined.");
  refresh();
}
