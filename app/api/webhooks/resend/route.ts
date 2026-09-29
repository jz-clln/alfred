import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Point Resend's webhook at:
//   https://YOUR-APP/api/webhooks/resend?secret=YOUR_WEBHOOK_SECRET
// and enable: email.delivered, email.opened, email.clicked, email.bounced.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.WEBHOOK_SECRET;
  const given = new URL(request.url).searchParams.get("secret");
  if (!secret || given !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await request.json().catch(() => null);
  const providerId = event?.data?.email_id as string | undefined;
  if (!event?.type || !providerId) return NextResponse.json({ ok: true });

  const db = createAdminClient();
  const now = new Date().toISOString();

  if (event.type === "email.delivered") {
    await db.from("email_messages").update({ status: "delivered" }).eq("provider_id", providerId).eq("status", "sent");
  } else if (event.type === "email.opened") {
    await db.from("email_messages").update({ opened_at: now }).eq("provider_id", providerId).is("opened_at", null);
  } else if (event.type === "email.clicked") {
    await db.from("email_messages").update({ clicked_at: now }).eq("provider_id", providerId).is("clicked_at", null);
  } else if (event.type === "email.bounced") {
    const { data: msg } = await db
      .from("email_messages")
      .update({ status: "bounced" })
      .eq("provider_id", providerId)
      .select("lead_id")
      .maybeSingle();
    if (msg?.lead_id) {
      await db.from("leads").update({ email_status: "invalid" }).eq("id", msg.lead_id);
      await db.from("sequence_enrollments").update({ status: "stopped" }).eq("lead_id", msg.lead_id).eq("status", "active");
    }
  }

  return NextResponse.json({ ok: true });
}
