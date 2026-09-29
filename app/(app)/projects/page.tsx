import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveApplicationId } from "@/lib/applications";
import { filterApplication, UNASSIGNED_APPLICATION } from "@/lib/application-scope";
import { PageTitle, Group, EmptyState, StatusChip } from "@/components/ui/kit";
import { FormDialog } from "@/components/ui/form-dialog";
import { philippineDate } from "@/lib/time";
import { AddProjectForm } from "./AddProjectForm";

export default async function ProjectsPage() {
  const supabase = createClient();
  const activeApplicationId = getActiveApplicationId();

  // clients!inner turns the embed into an inner join, which is what lets
  // PostgREST filter by the embedded table's column below.
  let projectsQuery = supabase
    .from("projects")
    .select("id, name, status, due_date, clients!inner(name, application_id)")
    .order("created_at", { ascending: false });
  filterApplication(projectsQuery, activeApplicationId, "clients.application_id");

  let clientsQuery = supabase.from("clients").select("id, name").order("name");
  filterApplication(clientsQuery, activeApplicationId);

  const [{ data: projects }, { data: clients }] = await Promise.all([projectsQuery, clientsQuery]);
  const today = philippineDate();

  return (
    <div className="max-w-6xl">
      <PageTitle
        title="Projects"
        action={
          <FormDialog triggerLabel="Add project" title="Add a project">
            <AddProjectForm clients={clients ?? []} />
          </FormDialog>
        }
      />

      <Group>
        {projects?.map((p: any) => {
          const overdue = p.status === "active" && p.due_date && p.due_date < today;
          return (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="tap flex items-center gap-3 px-4 py-3.5 hover:bg-paper/60">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="truncate text-sm text-ink-soft">
                    {p.clients?.name ?? "No client"}
                    {p.due_date && (
                      <span className={overdue ? "text-rust" : ""}> · {overdue ? "Overdue" : "Due"} {p.due_date}</span>
                    )}
                  </div>
                </div>
                <StatusChip tone={p.status === "active" ? "moss" : p.status === "on_hold" ? "brass" : "neutral"}>
                  {p.status.replace("_", " ")}
                </StatusChip>
              </Link>
            </li>
          );
        })}
        {!projects?.length && (
          <EmptyState>
            {activeApplicationId === UNASSIGNED_APPLICATION ? "No projects linked to unassigned clients yet." : activeApplicationId
              ? "No projects in this application yet. Tap “Add project” to start."
              : "No projects yet. Tap “Add project” to start."}
          </EmptyState>
        )}
      </Group>
    </div>
  );
}
