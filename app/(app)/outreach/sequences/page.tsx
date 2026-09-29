import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, Group, EmptyState } from "@/components/ui/kit";
import { SequenceForm } from "./SequenceForm";

export default async function SequencesPage() {
  const supabase = createClient();
  const [{ data: sequences }, { data: steps }, { data: enrollments }] = await Promise.all([
    supabase.from("sequences").select("id, name").order("created_at"),
    supabase.from("sequence_steps").select("sequence_id"),
    supabase.from("sequence_enrollments").select("sequence_id").eq("status", "active"),
  ]);
  const count = (rows: any[] | null, id: string) => (rows ?? []).filter((r) => r.sequence_id === id).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Follow-ups"
        sub="Automatic nudges for leads who haven't answered."
        action={<Link href="/outreach" className="tap rounded-full bg-fill px-3.5 py-1.5 text-sm text-ink-soft hover:text-ink">Back to outreach</Link>}
      />
      <Group>
        {sequences?.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-4 py-3.5 text-sm">
            <span className="font-medium">{s.name}</span>
            <span className="text-ink-soft">
              {count(steps, s.id)} follow-up{count(steps, s.id) === 1 ? "" : "s"} · {count(enrollments, s.id)} active
            </span>
          </li>
        ))}
        {!sequences?.length && <EmptyState>No sequences yet. Create one below.</EmptyState>}
      </Group>
      <h2 className="mb-3 mt-10 text-lg">New sequence</h2>
      <SequenceForm />
    </div>
  );
}
