import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateProjectStatus } from "../actions";

const STATUSES = ["active", "on_hold", "completed"] as const;

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(id, name)")
    .eq("id", params.id)
    .single();
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/projects" className="text-sm text-moss">Projects</Link>
      <h1 className="mb-1.5 mt-2 text-4xl font-medium">{project.name}</h1>
      <p className="mb-8 text-ink-soft">
        for{" "}
        <Link href={`/clients/${project.clients.id}`} className="text-moss hover:underline">
          {project.clients.name}
        </Link>
        {project.due_date && <> · due {project.due_date}</>}
      </p>

      {/* Segmented control: the current status is the raised segment. */}
      <div role="group" aria-label="Status" className="inline-flex rounded-xl bg-fill p-1">
        {STATUSES.map((status) => (
          <form key={status} action={updateProjectStatus.bind(null, project.id, status)}>
            <button
              type="submit"
              aria-pressed={project.status === status}
              className={`tap rounded-lg px-4 py-1.5 text-sm capitalize transition-colors ${
                project.status === status ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {status.replace("_", " ")}
            </button>
          </form>
        ))}
      </div>

      {project.notes && <p className="mt-8 max-w-prose leading-relaxed">{project.notes}</p>}
    </div>
  );
}
