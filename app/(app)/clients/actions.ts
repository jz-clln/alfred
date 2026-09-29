"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";
import { philippineDate } from "@/lib/time";

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

  const { error } = await supabase.from("clients").insert({
    owner_id: user.id,
    name,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
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
  if (!amount || amount <= 0 || (type !== "invoice" && type !== "payment")) {
    return { success: false, message: "Enter a valid amount and type." };
  }

  const { error } = await supabase.from("balance_entries").insert({
    owner_id: user.id,
    client_id: clientId,
    entry_date: philippineDate(),
    type,
    amount,
    memo: String(formData.get("memo") ?? "").trim() || null,
  });

  if (error) return { success: false, message: error.message };

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  return {
    success: true,
    message: type === "invoice" ? "Invoice logged." : "Payment logged.",
  };
}
