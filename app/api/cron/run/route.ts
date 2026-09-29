import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, renderTemplate } from "@/lib/email/send";
import { formatMoney, ledgerCurrency } from "@/lib/money";
import { syncRepliesForConnectedOwner } from "@/lib/gmail/sync";

// Runs once a day (vercel.json: 01:00 UTC = 9:00 AM in the Philippines).
// Vercel sends "Authorization: Bearer $CRON_SECRET" automatically when the
// CRON_SECRET env var is set. Anything else gets a 401.
export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const phtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "full",
    timeStyle: "short",
  });

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const summary = { followUps: 0, meetingReminders: 0, balanceReminders: 0 };
  const now = new Date();

  // ---------- 0. pull in replies from Gmail ----------
  // First, so anyone who answered overnight is skipped by the follow-ups below.
  // A Gmail problem (expired login, missing permission) must never stop the
  // rest of the run, so it is caught and reported in the response instead.
  let replies: { added: number; checked: number; bounces: number } | null = null;
  let repliesError: string | null = null;
  try {
    replies = await syncRepliesForConnectedOwner();
  } catch (e) {
    repliesError = e instanceof Error ? e.message : "Reply check failed.";
  }

  // ---------- 1. follow-up sequences ----------
  const { data: due } = await db
    .from("sequence_enrollments")
    .select("*, leads(*)")
    .eq("status", "active")
    .lte("next_send_at", now.toISOString())
    .limit(50);

  for (const enr of due ?? []) {
    const lead = (enr as any).leads;
    const stop = async () =>
      db.from("sequence_enrollments").update({ status: "stopped" }).eq("id", enr.id);

    // Anyone who replied, booked, converted, was lost, or bounced stops here.
    if (
      !lead?.email ||
      lead.email_status === "invalid" ||
      lead.last_replied_at ||
      ["replied", "meeting", "won", "lost"].includes(lead.stage)
    ) {
      await stop();
      continue;
    }

    const { data: steps } = await db
      .from("sequence_steps")
      .select("*")
      .eq("sequence_id", enr.sequence_id)
      .gte("step_no", enr.next_step_no)
      .order("step_no")
      .limit(2);

    const step = steps?.[0];
    if (!step) {
      await db.from("sequence_enrollments").update({ status: "completed" }).eq("id", enr.id);
      continue;
    }

    const subject = renderTemplate(step.subject, lead);
    const body = renderTemplate(step.body, lead);
    const result = await sendEmail({ to: lead.email, subject, body });

    await db.from("email_messages").insert({
      owner_id: enr.owner_id,
      lead_id: lead.id,
      to_email: lead.email,
      subject,
      body,
      kind: "follow_up",
      status: result.ok ? "sent" : "failed",
      provider_id: result.ok ? result.id : null,
      error: result.ok ? null : result.error,
      sequence_id: enr.sequence_id,
      step_no: step.step_no,
    });
    if (!result.ok) continue; // leave it due; tomorrow's run retries

    summary.followUps++;
    await db.from("leads").update({ last_contacted_at: now.toISOString() }).eq("id", lead.id);

    const next = steps?.[1];
    if (next) {
      await db
        .from("sequence_enrollments")
        .update({
          next_step_no: next.step_no,
          next_send_at: new Date(now.getTime() + next.delay_days * DAY).toISOString(),
        })
        .eq("id", enr.id);
    } else {
      await db.from("sequence_enrollments").update({ status: "completed" }).eq("id", enr.id);
    }
  }

  // ---------- 2. meeting reminders (meetings in the next 26 hours) ----------
  const { data: meetings } = await db
    .from("meetings")
    .select("*, clients(name, email)")
    .is("reminder_sent_at", null)
    .gt("starts_at", now.toISOString())
    .lte("starts_at", new Date(now.getTime() + 26 * 3_600_000).toISOString());

  for (const m of meetings ?? []) {
    const client = (m as any).clients;
    const to = client?.email ?? m.booker_email;
    if (!to) continue;
    const name = client?.name ?? m.booker_name ?? "";
    const subject = `Reminder: ${m.title}`;
    const body = `Hi ${name.split(" ")[0] || "there"},\n\nA quick reminder about our meeting:\n\n${m.title}\n${phtWhen(
      m.starts_at
    )} (Philippine time)\n\nIf you need to reschedule, just reply to this email.\n`;
    const result = await sendEmail({ to, subject, body });
    await db.from("email_messages").insert({
      owner_id: m.owner_id,
      client_id: m.client_id,
      to_email: to,
      subject,
      body,
      kind: "reminder",
      status: result.ok ? "sent" : "failed",
      provider_id: result.ok ? result.id : null,
      error: result.ok ? null : result.error,
    });
    if (result.ok) {
      summary.meetingReminders++;
      await db.from("meetings").update({ reminder_sent_at: now.toISOString() }).eq("id", m.id);
    }
  }

  // ---------- 3. overdue balance reminders ----------
  // Balance > 0, latest invoice at least 7 days old, and no reminder in the last 7 days.
  const { data: owing } = await db.from("client_balances").select("client_id, balance").gt("balance", 0);
  const ids = (owing ?? []).map((r) => r.client_id);
  if (ids.length) {
    const cutoff = new Date(now.getTime() - 7 * DAY);
    const [{ data: clients }, { data: invoices }] = await Promise.all([
      db.from("clients").select("*").in("id", ids).eq("status", "active").not("email", "is", null),
      db.from("balance_entries").select("client_id, entry_date").in("client_id", ids).eq("type", "invoice"),
    ]);
    const latestInvoice = new Map<string, string>();
    for (const inv of invoices ?? []) {
      const cur = latestInvoice.get(inv.client_id);
      if (!cur || inv.entry_date > cur) latestInvoice.set(inv.client_id, inv.entry_date);
    }

    for (const c of clients ?? []) {
      const last = latestInvoice.get(c.id);
      if (!last || new Date(last) > cutoff) continue;
      if (c.last_balance_reminder_at && new Date(c.last_balance_reminder_at) > cutoff) continue;

      const balance = formatMoney(Number(owing!.find((r) => r.client_id === c.id)!.balance), ledgerCurrency(c.currency));
      const subject = "Friendly reminder: outstanding balance";
      const body = `Hi ${c.name.split(" ")[0]},\n\nA friendly reminder that there is an outstanding balance of ${balance} on your account.\n\nIf you've already sent payment, thank you — please disregard this note. Otherwise, reply here and we'll sort out the details.\n`;
      const result = await sendEmail({ to: c.email, subject, body });
      await db.from("email_messages").insert({
        owner_id: c.owner_id,
        client_id: c.id,
        to_email: c.email,
        subject,
        body,
        kind: "reminder",
        status: result.ok ? "sent" : "failed",
        provider_id: result.ok ? result.id : null,
        error: result.ok ? null : result.error,
      });
      if (result.ok) {
        summary.balanceReminders++;
        await db.from("clients").update({ last_balance_reminder_at: now.toISOString() }).eq("id", c.id);
      }
    }
  }

  return NextResponse.json({ ok: true, ...summary, replies, repliesError });
}