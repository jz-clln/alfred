import Link from "next/link";
import { Group, EmptyState, StatusChip } from "@/components/ui/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckRepliesButton } from "./CheckRepliesButton";
import { markAllRepliesRead } from "./replies/actions";

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" });
}

export function RepliesPanel({
  rows,
  filter,
  lastChecked,
  connected,
  gmailMissing,
}: {
  rows: any[];
  filter: "all" | "unread";
  lastChecked: string | null;
  connected: boolean;
  gmailMissing: boolean;
}) {
  const unread = rows.filter((r) => !r.read_at);
  const onlyUnread = filter === "unread";
  const shown = onlyUnread ? unread : rows;

  return (
    <div>
      {gmailMissing && (
        <div role="alert" className="mb-5 rounded-2xl bg-rust-soft px-4 py-3 text-sm text-rust">
          Google was connected without permission to read email. Reconnect, and leave the Gmail box ticked.{" "}
          <a href="/api/google/connect" className="font-medium underline underline-offset-4">Reconnect Google</a>
        </div>
      )}
      {!connected && (
        <div className="mb-5 rounded-2xl bg-surface p-5">
          <p className="mb-4 text-ink-soft">Connect Google to read replies from your Gmail.</p>
          <Button asChild>
            <a href="/api/google/connect">Connect Google</a>
          </Button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button asChild size="pill" variant={onlyUnread ? "pill" : "default"} className="rounded-full">
            <Link href="/outreach?tab=replies" aria-current={!onlyUnread ? "page" : undefined}>All</Link>
          </Button>
          <Button asChild size="pill" variant={onlyUnread ? "default" : "pill"} className="rounded-full">
            <Link href="/outreach?tab=replies&f=unread" aria-current={onlyUnread ? "page" : undefined}>
              Unread <span className="opacity-70">{unread.length}</span>
            </Link>
          </Button>
          {unread.length > 0 && (
            <form action={markAllRepliesRead}>
              <Button type="submit" variant="ghost" size="sm">Mark all read</Button>
            </form>
          )}
        </div>
        <CheckRepliesButton lastChecked={lastChecked} />
      </div>

      <Group>
        {shown.map((r: any) => {
          const isUnread = !r.read_at;
          const who = r.leads?.name ?? r.clients?.name ?? r.from_name ?? r.from_email;
          return (
            <li key={r.id}>
              <Link
                href={`/outreach/replies/${r.id}`}
                className="tap flex min-h-16 items-start gap-3 px-4 py-3.5 hover:bg-paper/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
              >
                <span
                  aria-hidden="true"
                  className={cn("mt-2 size-2 shrink-0 rounded-full", isUnread ? "bg-primary" : "bg-transparent")}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={cn("truncate", isUnread && "font-medium")}>{who}</span>
                      <StatusChip>{r.lead_id ? "lead" : "client"}</StatusChip>
                    </span>
                    <span className="shrink-0 text-xs text-ink-soft">
                      {isUnread && <span className="sr-only">Unread, </span>}
                      {ago(r.received_at)}
                    </span>
                  </div>
                  <div className={cn("truncate text-sm", isUnread ? "text-ink" : "text-ink-soft")}>
                    {r.subject ?? "(no subject)"}
                  </div>
                  {r.snippet && <div className="truncate text-sm text-ink-soft">{r.snippet}</div>}
                </div>
              </Link>
            </li>
          );
        })}
        {!shown.length && (
          <EmptyState>
            {onlyUnread
              ? "No unread replies."
              : "No replies yet. When a lead or client answers, it shows up here. Alfred checks every few minutes while it's open."}
          </EmptyState>
        )}
      </Group>
    </div>
  );
}
