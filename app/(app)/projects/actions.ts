"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createProjectRecord(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "");
  if (!name || !clientId) return;

  await supabase.from("projects").insert({
    owner_id: user.id,
    client_id: clientId,
    name,
    due_date: String(formData.get("due_date") ?? "").trim() || null,
  });

  revalidatePath("/projects");
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
