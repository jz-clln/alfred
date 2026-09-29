"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createClientRecord(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await supabase.from("clients").insert({
    owner_id: user.id,
    name,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
  });

  revalidatePath("/clients");
}

export async function addBalanceEntry(clientId: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const amount = Number(formData.get("amount"));
  const type = String(formData.get("type"));
  if (!amount || amount <= 0 || (type !== "invoice" && type !== "payment")) {
    return;
  }

  await supabase.from("balance_entries").insert({
    owner_id: user.id,
    client_id: clientId,
    type,
    amount,
    memo: String(formData.get("memo") ?? "").trim() || null,
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
}
