import { Group, EmptyState } from "@/components/ui/kit";

const kindLabel: Record<string, string> = { manual: "Email", follow_up: "Follow-up", reminder: "Reminder" };

export function SentPanel({ rows }: { rows: any[] }) {
  return (
    <Group>
      {rows.map((m) => (
        <li key={m.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
          <div className="min-w-0">
            <div className="truncate">{m.subject}</div>
            <div className="truncate text-xs text-ink-soft">{m.to_email}</div>
          </div>
          <div className="shrink-0 text-right text-xs text-ink-soft">
            <div className={m.status === "failed" || m.status === "bounced" ? "text-rust" : ""}>
              {kindLabel[m.kind] ?? "Email"} · {m.status}
            </div>
            {m.opened_at && <div className="text-moss">Opened</div>}
          </div>
        </li>
      ))}
      {!rows.length && <EmptyState>Nothing sent yet.</EmptyState>}
    </Group>
  );
}
