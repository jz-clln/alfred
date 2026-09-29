"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

export async function markReplyRead(id: string) {
  const supabase = await requireUser();
  await supabase
    .from("inbound_emails")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  revalidatePath("/outreach");
}

export async function markAllRepliesRead() {
  const supabase = await requireUser();
  await supabase
    .from("inbound_emails")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  revalidatePath("/outreach");
}
