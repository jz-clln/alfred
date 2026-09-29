import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, Group, EmptyState, StatusChip } from "@/components/ui/kit";
import { FormDialog } from "@/components/ui/form-dialog";
import { philippineDate } from "@/lib/time";
import { AddProjectForm } from "./AddProjectForm";

export default async function ProjectsPage() {
  const supabase = createClient();
  const [{ data: projects }, { data: clients }] = await Promise.all([
    supabase.from("projects").select("id, name, status, due_date, clients(name)").order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").order("name"),
  ]);
  const today = philippineDate();

  return (
    <div className="max-w-3xl">
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
        {!projects?.length && <EmptyState>No projects yet. Tap “Add project” to start.</EmptyState>}
      </Group>
    </div>
  );
}
