import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProjectStatusControl } from "./ProjectStatusControl";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(id, name)")
    .eq("id", params.id)
    .single();
  if (!project) notFound();

  return (
    <div className="max-w-6xl">
      <Link href="/projects" className="text-sm text-moss">Projects</Link>
      <h1 className="mb-1.5 mt-2 text-4xl font-medium">{project.name}</h1>
      <p className="mb-8 text-ink-soft">
        {project.clients ? (
          <>
            for{" "}
            <Link href={`/clients/${project.clients.id}`} className="text-moss hover:underline">
              {project.clients.name}
            </Link>
          </>
        ) : (
          "No client"
        )}
        {project.due_date && <> · due {project.due_date}</>}
      </p>

      <ProjectStatusControl projectId={project.id} status={project.status} />

      {project.notes && <p className="mt-8 max-w-prose leading-relaxed">{project.notes}</p>}
    </div>
  );
}
