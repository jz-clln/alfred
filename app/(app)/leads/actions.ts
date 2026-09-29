"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkEmail } from "@/lib/email/validate";
import type { ActionState } from "@/lib/action-state";

async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createLead(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, message: "Name is required." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const email_status = email ? await checkEmail(email) : "unchecked";

  const { error } = await supabase.from("leads").insert({
    owner_id: user.id,
    name,
    email,
    email_status,
    company: String(formData.get("company") ?? "").trim() || null,
    source: String(formData.get("source") ?? "").trim() || null,
  });
  if (error) return { success: false, message: error.message };

  revalidatePath("/leads");
  return {
    success: true,
    message:
      email_status === "invalid"
        ? `${name} was added, but that email address can't receive mail.`
        : `${name} was added.`,
  };
}

export async function checkLeadEmail(leadId: string) {
  const { supabase } = await requireUser();
  const { data: lead } = await supabase.from("leads").select("email").eq("id", leadId).single();
  if (!lead?.email) return;
  const email_status = await checkEmail(lead.email);
  await supabase.from("leads").update({ email_status }).eq("id", leadId);
  revalidatePath("/leads");
}

export async function markLeadReplied(leadId: string) {
  const { supabase } = await requireUser();
  await supabase
    .from("leads")
    .update({ stage: "replied", last_replied_at: new Date().toISOString() })
    .eq("id", leadId);
  // A reply ends any follow-up sequence for this lead.
  await supabase
    .from("sequence_enrollments")
    .update({ status: "stopped" })
    .eq("lead_id", leadId)
    .eq("status", "active");
  revalidatePath("/leads");
  revalidatePath("/insights");
  revalidatePath("/dashboard");
}

export async function setLeadStage(leadId: string, stage: "meeting" | "lost" | "contacted") {
  const { supabase } = await requireUser();
  await supabase.from("leads").update({ stage }).eq("id", leadId);
  if (stage === "meeting" || stage === "lost") {
    await supabase
      .from("sequence_enrollments")
      .update({ status: "stopped" })
      .eq("lead_id", leadId)
      .eq("status", "active");
  }
  revalidatePath("/leads");
  revalidatePath("/insights");
}

export async function convertLeadToClient(leadId: string) {
  const { supabase, user } = await requireUser();
  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (!lead || lead.client_id) return;

  const { data: client } = await supabase
    .from("clients")
    .insert({ owner_id: user.id, name: lead.name, email: lead.email, notes: lead.company })
    .select("id")
    .single();
  if (!client) return;

  await supabase.from("leads").update({ stage: "won", client_id: client.id }).eq("id", leadId);
  await supabase
    .from("sequence_enrollments")
    .update({ status: "stopped" })
    .eq("lead_id", leadId)
    .eq("status", "active");

  revalidatePath("/leads");
  revalidatePath("/clients");
  revalidatePath("/insights");
  redirect(`/clients/${client.id}`);
}
