"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, renderTemplate } from "@/lib/email/send";
import type { ActionState } from "@/lib/action-state";

const DAY = 86_400_000;
const MAX_RECIPIENTS = 50;

export async function sendEmails(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const sequenceId = String(formData.get("sequence_id") ?? "");
  const picks = formData.getAll("recipients").map(String);

  if (!subject || !body) return { success: false, message: "Add a subject and a message." };
  if (!picks.length) return { success: false, message: "Pick at least one recipient." };
  if (picks.length > MAX_RECIPIENTS) {
    return { success: false, message: `Send to ${MAX_RECIPIENTS} people or fewer at a time.` };
  }

  const leadIds = picks.filter((p) => p.startsWith("lead:")).map((p) => p.slice(5));
  const clientIds = picks.filter((p) => p.startsWith("client:")).map((p) => p.slice(7));

  const [leadsRes, clientsRes] = await Promise.all([
    leadIds.length
      ? supabase.from("leads").select("id, name, email, company, email_status").in("id", leadIds)
      : Promise.resolve({ data: [] as any[] }),
    clientIds.length
      ? supabase.from("clients").select("id, name, email, notes").in("id", clientIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const targets = [
    ...(leadsRes.data ?? []).map((l: any) => ({ kind: "lead" as const, id: l.id, name: l.name, email: l.email, company: l.company, bad: l.email_status === "invalid" })),
    ...(clientsRes.data ?? []).map((c: any) => ({ kind: "client" as const, id: c.id, name: c.name, email: c.email, company: null, bad: false })),
  ];

  const sendable = targets.filter((t) => t.email && !t.bad);
  let sent = 0;
  let failed = 0;
  const sentLeadIds: string[] = [];
  let firstError = "";

  for (let i = 0; i < sendable.length; i += 5) {
    await Promise.all(
      sendable.slice(i, i + 5).map(async (t) => {
        const s = renderTemplate(subject, t);
        const b = renderTemplate(body, t);
        const result = await sendEmail({ to: t.email!, subject: s, body: b });
        await supabase.from("email_messages").insert({
          owner_id: user.id,
          lead_id: t.kind === "lead" ? t.id : null,
          client_id: t.kind === "client" ? t.id : null,
          to_email: t.email,
          subject: s,
          body: b,
          kind: "manual",
          status: result.ok ? "sent" : "failed",
          provider_id: result.ok ? result.id : null,
          error: result.ok ? null : result.error,
        });
        if (result.ok) {
          sent++;
          if (t.kind === "lead") sentLeadIds.push(t.id);
        } else {
          failed++;
          firstError ||= result.error;
        }
      })
    );
  }

  if (sentLeadIds.length) {
    const now = new Date().toISOString();
    await supabase.from("leads").update({ last_contacted_at: now }).in("id", sentLeadIds);
    await supabase.from("leads").update({ stage: "contacted" }).in("id", sentLeadIds).eq("stage", "new");

    if (sequenceId) {
      const { data: first } = await supabase
        .from("sequence_steps")
        .select("delay_days")
        .eq("sequence_id", sequenceId)
        .eq("step_no", 1)
        .maybeSingle();
      if (first) {
        await supabase.from("sequence_enrollments").upsert(
          sentLeadIds.map((lead_id) => ({
            owner_id: user.id,
            sequence_id: sequenceId,
            lead_id,
            next_step_no: 1,
            next_send_at: new Date(Date.now() + first.delay_days * DAY).toISOString(),
            status: "active",
          })),
          { onConflict: "sequence_id,lead_id" }
        );
      }
    }
  }

  revalidatePath("/outreach");
  revalidatePath("/leads");
  revalidatePath("/insights");

  const skipped = targets.length - sendable.length;
  if (!sent && failed) return { success: false, message: firstError || "Nothing was sent." };
  const parts = [`Sent ${sent} email${sent === 1 ? "" : "s"}`];
  if (skipped) parts.push(`${skipped} skipped (no working email)`);
  if (failed) parts.push(`${failed} failed`);
  return { success: true, message: parts.join(", ") + "." };
}
