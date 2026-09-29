"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";

export async function createSequence(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, message: "Give the sequence a name." };

  const steps = [1, 2, 3]
    .map((n) => ({
      step_no: n,
      delay_days: Math.max(0, Number(formData.get(`delay_${n}`) ?? 0) || 0),
      subject: String(formData.get(`subject_${n}`) ?? "").trim(),
      body: String(formData.get(`body_${n}`) ?? "").trim(),
    }))
    .filter((s) => s.subject && s.body)
    .map((s, i) => ({ ...s, step_no: i + 1 }));

  if (!steps.length) return { success: false, message: "Add at least one follow-up email." };

  const { data: seq, error } = await supabase
    .from("sequences")
    .insert({ owner_id: user.id, name })
    .select("id")
    .single();
  if (error || !seq) return { success: false, message: error?.message ?? "Couldn't create it." };

  const { error: stepError } = await supabase
    .from("sequence_steps")
    .insert(steps.map((s) => ({ ...s, owner_id: user.id, sequence_id: seq.id })));
  if (stepError) return { success: false, message: stepError.message };

  revalidatePath("/outreach/sequences");
  revalidatePath("/outreach");
  return { success: true, message: `${name} is ready to use.` };
}
