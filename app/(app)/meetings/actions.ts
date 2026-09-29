"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, createCalendarEvent } from "@/lib/google/calendar";

export async function scheduleMeeting(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accessToken = await getValidAccessToken();
  if (!accessToken) redirect("/api/google/connect");

  const clientId = String(formData.get("client_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const duration = Number(formData.get("duration") ?? 30);

  if (!clientId || !title || !date || !time) return;

  const start = new Date(`${date}T${time}`);
  const end = new Date(start.getTime() + duration * 60_000);

  const { data: client } = await supabase
    .from("clients")
    .select("email")
    .eq("id", clientId)
    .single();

  const event = await createCalendarEvent(accessToken, {
    summary: title,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    attendeeEmail: client?.email ?? undefined,
  });

  await supabase.from("meetings").insert({
    owner_id: user.id,
    client_id: clientId,
    google_event_id: event.id,
    title,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
  });

  revalidatePath("/meetings");
}