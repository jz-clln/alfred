"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";
import { ACTIVE_APPLICATION_COOKIE } from "@/lib/applications";
import { UNASSIGNED_APPLICATION } from "@/lib/application-scope";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function createApplication(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, message: "Give it a name." };

  const { data, error } = await supabase
    .from("applications")
    .insert({ owner_id: user.id, name })
    .select("id")
    .single();
  if (error || !data) return { success: false, message: error?.message ?? "Couldn't create it." };

  // Creating an application switches you into it, the same way Notion drops
  // you into a new workspace right after you make one.
  cookies().set(ACTIVE_APPLICATION_COOKIE, data.id, { path: "/", maxAge: ONE_YEAR });
  revalidatePath("/", "layout");

  return { success: true, message: `${name} created.` };
}

export async function setActiveApplication(applicationId: string | null) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (applicationId) {
    if (applicationId !== UNASSIGNED_APPLICATION) {
      const { data, error } = await supabase.from("applications").select("id")
        .eq("id", applicationId).eq("owner_id", user.id).maybeSingle();
      if (error || !data) throw new Error("Application unavailable.");
    }
    cookies().set(ACTIVE_APPLICATION_COOKIE, applicationId, { path: "/", maxAge: ONE_YEAR });
  } else {
    cookies().delete(ACTIVE_APPLICATION_COOKIE);
  }
  revalidatePath("/", "layout");
}

export async function renameApplication(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, message: "Enter an application name." };
  const { data, error } = await supabase.from("applications").update({ name })
    .eq("id", id).eq("owner_id", user.id).select("id").maybeSingle();
  if (error || !data) return { success: false, message: "Couldn't rename this application." };
  revalidatePath("/", "layout");
  return { success: true, message: "Application renamed." };
}

export async function deleteApplication(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const confirmation = String(formData.get("confirmation") ?? "");
  const { data: application, error: lookupError } = await supabase.from("applications").select("name")
    .eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (lookupError || !application) return { success: false, message: "Application unavailable." };
  if (confirmation !== application.name) return { success: false, message: "Type the exact application name to confirm deletion." };

  // Existing foreign keys SET NULL, preserving clients, leads and their history.
  // Matching the name again also protects against a rename during confirmation.
  const { data, error } = await supabase.from("applications").delete()
    .eq("id", id).eq("owner_id", user.id).eq("name", confirmation).select("id").maybeSingle();
  if (error || !data) return { success: false, message: "Couldn't delete this application. Refresh and try again." };
  if (cookies().get(ACTIVE_APPLICATION_COOKIE)?.value === id) {
    cookies().set(ACTIVE_APPLICATION_COOKIE, UNASSIGNED_APPLICATION, { path: "/", maxAge: ONE_YEAR });
  }
  revalidatePath("/", "layout");
  return { success: true, message: "Application deleted. Its clients and leads are now Unassigned." };
}
