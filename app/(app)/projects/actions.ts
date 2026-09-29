"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";

const STATUSES = ["active", "on_hold", "completed"] as const;
type ProjectStatus = (typeof STATUSES)[number];

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

// CHANGED: checks the session, validates the value, and throws on a database
// error. Before, a failed update looked like a success. The client control
// catches the throw, rolls back, and shows an error toast.
export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  if (!STATUSES.includes(status)) throw new Error("Invalid status.");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("projects").update({ status }).eq("id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}
