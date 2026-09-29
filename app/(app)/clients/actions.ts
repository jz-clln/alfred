"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";
import { philippineDate } from "@/lib/time";
import { isCurrency } from "@/lib/money";

export async function createClientRecord(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, message: "Name is required." };
  const currency = formData.get("currency");
  if (!isCurrency(currency)) return { success: false, message: "Choose PHP or USD." };

  const { error } = await supabase.from("clients").insert({
    owner_id: user.id,
    name,
    currency,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    application_id: String(formData.get("application_id") ?? "").trim() || null,
  });

  if (error) return { success: false, message: error.message };

  revalidatePath("/clients");
  return { success: true, message: `${name} was added.` };
}

export async function addBalanceEntry(
  clientId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const amount = Number(formData.get("amount"));
  const type = String(formData.get("type"));
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 10_000_000_000 || (type !== "invoice" && type !== "payment")) {
    return { success: false, message: "Enter a valid amount and type." };
  }

  const currency = formData.get("currency");
  const { data: client, error: clientError } = await supabase.from("clients").select("currency")
    .eq("id", clientId).eq("owner_id", user.id).maybeSingle();
  if (clientError || !client || !isCurrency(currency) || client.currency !== currency) {
    return { success: false, message: "Client currency changed or is unavailable. Reload before adding an entry." };
  }

  const { error } = await supabase.from("balance_entries").insert({
    owner_id: user.id,
    client_id: clientId,
    entry_date: philippineDate(),
    type,
    amount,
    currency,
    memo: String(formData.get("memo") ?? "").trim() || null,
  });

  if (error) return { success: false, message: error.message };

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  revalidatePath("/clients");
  return {
    success: true,
    message: type === "invoice" ? "Invoice logged." : "Payment logged.",
  };
}

export async function setClientCurrency(clientId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const currency = formData.get("currency");
  if (!isCurrency(currency)) return { success: false, message: "Choose PHP or USD." };
  // The database also rejects changing currency once ledger entries exist.
  const { data, error } = await supabase.from("clients").update({ currency })
    .eq("id", clientId).eq("owner_id", user.id).select("id").maybeSingle();
  if (error || !data) return { success: false, message: "Couldn't change currency. Clients with ledger entries must keep their original currency." };
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { success: true, message: "Billing currency updated." };
}
