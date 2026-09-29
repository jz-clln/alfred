import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPhilippineDateTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MarkRead } from "./MarkRead";

interface Entry {
  id: string;
  direction: "in" | "out";
  subject: string;
  body: string;
  at: string;
}

export default async function ReplyDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: reply } = await supabase
    .from("inbound_emails")
    .select("*, leads(id, name), clients(id, name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!reply) notFound();

  // The whole conversation with this person: what you sent and what they sent.
  const col = reply.lead_id ? "lead_id" : "client_id";
  const contactId = reply.lead_id ?? reply.client_id;
  const [{ data: sent }, { data: received }] = contactId
    ? await Promise.all([
        supabase.from("email_messages").select("id, subject, body, sent_at").eq(col, contactId),
        supabase.from("inbound_emails").select("id, subject, body_text, received_at").eq(col, contactId),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }];

  const thread: Entry[] = [
    ...(sent ?? []).map((m: any) => ({
      id: `s-${m.id}`, direction: "out" as const, subject: m.subject, body: m.body, at: m.sent_at,
    })),
    ...(received ?? []).map((m: any) => ({
      id: m.id, direction: "in" as const, subject: m.subject ?? "(no subject)", body: m.body_text ?? "", at: m.received_at,
    })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const who = reply.leads?.name ?? reply.clients?.name ?? reply.from_name ?? reply.from_email;
  const composeTo = reply.lead_id ? `lead:${reply.lead_id}` : `client:${reply.client_id}`;

  return (
    <div className="max-w-6xl">
      <MarkRead id={reply.id} alreadyRead={!!reply.read_at} />
      <Link href="/outreach?tab=replies" className="text-sm text-moss">Replies</Link>

      <h1 className="mb-1.5 mt-2 text-3xl font-medium md:text-4xl">{reply.subject ?? "(no subject)"}</h1>
      <p className="mb-6 text-ink-soft">
        From {who} ({reply.from_email}) · {formatPhilippineDateTime(reply.received_at)}
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/outreach?to=${composeTo}`}>Reply</Link>
        </Button>
        {reply.lead_id && (
          <Button asChild variant="secondary">
            <Link href={`/leads?q=${encodeURIComponent(reply.leads?.name ?? "")}`}>View lead</Link>
          </Button>
        )}
        {reply.client_id && (
          <Button asChild variant="secondary">
            <Link href={`/clients/${reply.client_id}`}>View client</Link>
          </Button>
        )}
        {reply.gmail_thread_id && (
          <Button asChild variant="ghost">
            <a
              href={`https://mail.google.com/mail/u/0/#inbox/${reply.gmail_thread_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Gmail <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        )}
      </div>

      {/* Plain text only, never HTML, so a hostile email can't run anything here. */}
      <Card className="p-5">
        <p className="whitespace-pre-wrap break-words leading-relaxed">{reply.body_text || reply.snippet || "(empty message)"}</p>
      </Card>
      <p className="mt-2 text-xs text-ink-soft">Quoted earlier messages are hidden. Open in Gmail to see everything.</p>

      {thread.length > 1 && (
        <section aria-labelledby="thread-title" className="mt-10">
          <h2 id="thread-title" className="mb-3 text-lg">Conversation</h2>
          <Card className="divide-y divide-border/70 overflow-hidden">
            {thread.map((m) => (
              <details key={m.id} open={m.id === reply.id} className="group px-4 py-3">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{m.direction === "out" ? "You" : who}</span>
                    <span className="text-ink-soft"> · {m.subject}</span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-soft">{formatPhilippineDateTime(m.at)}</span>
                </summary>
                <p className="mt-2 whitespace-pre-wrap break-words pb-2 text-sm leading-relaxed">{m.body}</p>
              </details>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
