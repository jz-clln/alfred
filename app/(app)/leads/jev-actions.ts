"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveApplicationId } from "@/lib/applications";
import { filterApplication } from "@/lib/application-scope";
import { evaluateLead } from "@/lib/leads/jev";

export async function analyzeLeadWithJev(leadId: string, context: string) {
  if (typeof context !== "string" || context.length > 12000) return { error: "Keep the conversation under 12,000 characters." };
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: "Please sign in again." };
  const query = db.from("leads").select("id, notes, last_replied_at, jev_assessment, jev_input_hash").eq("id", leadId).eq("owner_id", user.id);
  filterApplication(query, getActiveApplicationId());
  const { data: lead, error } = await query.maybeSingle();
  if (error || !lead) return { error: "Lead unavailable. Check the application filter and database migration 0008." };
  const replies = await db.from("inbound_emails").select("body_text, snippet, received_at")
    .eq("owner_id", user.id).eq("lead_id", leadId).order("received_at", { ascending: false }).limit(5);
  if (replies.error) return { error: "Couldn't load the lead's replies. Please try again." };
  const state = JSON.stringify({
    supplied_conversation: context.trim(),
    saved_notes: (lead.notes ?? "").slice(0, 4000),
    replies_newest_first: (replies.data ?? []).map(r => ({ received_at: r.received_at, text: (r.body_text || r.snippet || "").slice(0, 4000) })),
  });
  if (!context.trim() && !lead.notes?.trim() && !(replies.data ?? []).some(r => (r.body_text || r.snippet || "").trim())) return { error: "Paste a lead message first, or sync their email replies." };
  const hash = createHash("sha256").update("jev-rubric-v1:" + state).digest("hex");
  if (hash === lead.jev_input_hash && lead.jev_assessment) return { success: true };
  if (!process.env.TYPESAFE_API_KEY) return { error: "Add TYPESAFE_API_KEY to the server environment to enable JEV." };
  try {
    const assessment = await evaluateLead(state);
    const update = db.from("leads").update({ jev_assessment: assessment, jev_input_hash: hash })
      .eq("id", leadId).eq("owner_id", user.id);
    filterApplication(update, getActiveApplicationId());
    // A newer reply or another analysis must not be overwritten by this request.
    if (lead.last_replied_at) update.eq("last_replied_at", lead.last_replied_at); else update.is("last_replied_at", null);
    if (lead.jev_input_hash) update.eq("jev_input_hash", lead.jev_input_hash); else update.is("jev_input_hash", null);
    const saved = await update.select("id").maybeSingle();
    if (saved.error || !saved.data) return { error: "The lead changed or couldn't be saved. Please analyze again." };
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "JEV couldn't complete the analysis. Your previous temperature is unchanged. Check your API key or try again shortly." };
  }
}
