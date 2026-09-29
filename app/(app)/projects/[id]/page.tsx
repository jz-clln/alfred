import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateProjectStatus } from "../actions";

const STATUSES = ["active", "on_hold", "completed"] as const;

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(id, name)")
    .eq("id", params.id)
    .single();

  if (!project) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-3xl font-medium">{project.name}</h1>
      <p className="mb-8 text-ink-soft">
        for{" "}
        <Link href={`/clients/${project.clients.id}`} className="hover:underline">
          {project.clients.name}
        </Link>
      </p>

      <div className="mb-8">
        <div className="mb-2 text-xs text-ink-soft">Status</div>
        <div className="flex gap-2">
          {STATUSES.map((status) => (
            <form
              key={status}
              action={updateProjectStatus.bind(null, project.id, status)}
            >
              <button
                type="submit"
                className={`rounded-md border px-3 py-1.5 text-sm capitalize ${
                  project.status === status
                    ? "border-moss bg-moss-soft text-moss"
                    : "border-line text-ink-soft hover:bg-surface"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            </form>
          ))}
        </div>
      </div>

      {project.due_date && (
        <p className="text-sm text-ink-soft">Due {project.due_date}</p>
      )}
      {project.notes && <p className="mt-4 text-sm">{project.notes}</p>}
    </div>
  );
}
