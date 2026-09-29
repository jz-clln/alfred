"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken, createCalendarEvent } from "@/lib/google/calendar";

// Runs with NO signed-in user — anyone with the /book link can hit this.
// It only ever touches your calendar and inserts a meeting row scoped to
// your owner_id (looked up server-side), so it can't read or change
// anything else in the app.
export async function bookMeeting(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const slot = String(formData.get("slot") ?? "");
  const [startISO, endISO] = slot.split("|");

  if (!name || !email || !startISO || !endISO) return;

  const accessToken = await getValidAccessToken();
  if (!accessToken) return;

  const event = await createCalendarEvent(accessToken, {
    summary: `Meeting with ${name}`,
    description: `Booked via the public booking page by ${name} (${email}).`,
    startISO,
    endISO,
    attendeeEmail: email,
  });

  const supabase = createAdminClient();
  const { data: ownerRow } = await supabase
    .from("google_tokens")
    .select("owner_id")
    .limit(1)
    .maybeSingle();

  await supabase.from("meetings").insert({
    owner_id: ownerRow?.owner_id,
    google_event_id: event.id,
    title: `Meeting with ${name}`,
    starts_at: startISO,
    ends_at: endISO,
    booked_by_client: true,
    booker_name: name,
    booker_email: email,
  });

  redirect("/book/confirmed");
}