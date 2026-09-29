"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";

export async function createProjectRecord(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "");
  if (!name || !clientId) {
    return { success: false, message: "Project name and client are required." };
  }

  const { error } = await supabase.from("projects").insert({
    owner_id: user.id,
    client_id: clientId,
    name,
    due_date: String(formData.get("due_date") ?? "").trim() || null,
  });

  if (error) return { success: false, message: error.message };

  revalidatePath("/projects");
  return { success: true, message: `${name} was created.` };
}

export async function updateProjectStatus(
  projectId: string,
  status: "active" | "on_hold" | "completed"
) {
  const supabase = createClient();
  await supabase.from("projects").update({ status }).eq("id", projectId);
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}