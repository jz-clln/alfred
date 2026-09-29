import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProjectRecord } from "./actions";

export default async function ProjectsPage() {
  const supabase = createClient();

  const [{ data: projects }, { data: clients }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status, due_date, clients(name)")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").order("name"),
  ]);

  return (
    <div>
      <h1 className="mb-8 text-3xl font-medium">Projects</h1>

      <div className="mb-8 overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-left text-ink-soft">
              <th className="px-4 py-3 font-normal">Project</th>
              <th className="px-4 py-3 font-normal">Client</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Due</th>
            </tr>
          </thead>
          <tbody>
            {projects?.map((p: any) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/projects/${p.id}`} className="hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">{p.clients?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-soft capitalize">
                  {p.status.replace("_", " ")}
                </td>
                <td className="px-4 py-3 text-ink-soft">{p.due_date ?? "—"}</td>
              </tr>
            ))}
            {!projects?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-soft">
                  No projects yet — add your first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form
        action={createProjectRecord}
        className="flex max-w-2xl flex-wrap items-end gap-3"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs text-ink-soft">Project name</label>
          <input
            name="name"
            required
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-moss"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Client</label>
          <select
            name="client_id"
            required
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Due date</label>
          <input
            name="due_date"
            type="date"
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-ink px-4 py-2 text-sm text-paper hover:opacity-90"
        >
          Add project
        </button>
      </form>
    </div>
  );
}
