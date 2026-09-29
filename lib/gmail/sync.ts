// lib/gmail/sync.ts — SERVER-ONLY.
//
// Reads replies from your Gmail and files them under the matching lead or
// client. Privacy: Alfred only asks Gmail for mail FROM addresses that are in
// your leads and clients. It never lists or reads the rest of your inbox.
// Scope is gmail.readonly: it cannot send, delete or change anything.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken } from "@/lib/google/calendar";

const API = "https://gmail.googleapis.com/gmail/v1/users/me";
const FIRST_SYNC_DAYS = 30; // how far back the very first check looks
const OVERLAP_MS = 6 * 3_600_000; // re-check the last 6h, duplicates are ignored
const CHUNK = 20; // addresses per Gmail search
const MAX_NEW = 100; // new messages processed per run

export class GmailAccessError extends Error {}

// True when the fix is "reconnect Google" (missing permission, expired token).
export function isReconnectError(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  return e instanceof GmailAccessError || msg.includes("invalid_grant");
}

async function api<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401) throw new GmailAccessError("Google needs to be reconnected.");
  if (res.status === 403) {
    const text = await res.text();
    if (/insufficient|scope/i.test(text)) {
      throw new GmailAccessError("Google was connected without permission to read email.");
    }
    throw new Error("Gmail refused the request (403). Is the Gmail API enabled?");
  }
  if (!res.ok) throw new Error(`Gmail error ${res.status}`);
  return res.json() as Promise<T>;
}

interface Part {
  mimeType?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string };
  parts?: Part[];
}
interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: Part;
}

const decode = (data: string) =>
  Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");

function findPart(part: Part | undefined, mime: string): string | null {
  if (!part) return null;
  if (part.mimeType === mime && part.body?.data) return decode(part.body.data);
  for (const child of part.parts ?? []) {
    const hit = findPart(child, mime);
    if (hit) return hit;
  }
  return null;
}

function htmlToText(html: string) {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n");
}

function extractText(payload: Part | undefined) {
  const plain = findPart(payload, "text/plain");
  if (plain) return plain;
  const html = findPart(payload, "text/html");
  return html ? htmlToText(html) : "";
}

// Cuts the quoted history ("On Mon ... wrote:", "> ...") so you read only
// what they just wrote. Falls back to the full text if nothing is left.
function stripQuoted(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const next = (lines[i + 1] ?? "").trim();
    if (/^On .{5,200}wrote:$/i.test(line)) break;
    if (/^On /i.test(line) && /wrote:$/i.test(next)) break;
    if (/^-{2,}\s*(Original Message|Forwarded message)/i.test(line)) break;
    if (/^From:\s.+/i.test(line) && /^(Sent|Date):/i.test(next)) break;
    if (line.startsWith(">")) continue;
    out.push(lines[i]);
  }
  const cleaned = out.join("\n").trim();
  return cleaned || text.trim();
}

function parseFrom(value: string) {
  const m = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || null, email: m[2].trim().toLowerCase() };
  return { name: null as string | null, email: value.trim().toLowerCase() };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");
const SAFE_ADDRESS = /^[^\s()"]+@[^\s()"]+$/;

async function search(token: string, q: string): Promise<string[]> {
  const params = new URLSearchParams({ q, maxResults: "50" });
  const data = await api<{ messages?: { id: string }[] }>(token, `/messages?${params}`);
  return (data.messages ?? []).map((m) => m.id);
}

export interface SyncResult {
  added: number;
  checked: number;
  bounces: number;
}

export async function syncReplies(db: SupabaseClient, ownerId: string): Promise<SyncResult> {
  const token = await getValidAccessToken();
  if (!token) throw new GmailAccessError("Google isn't connected.");
  const startedAt = new Date();

  // Also proves the Gmail permission works before doing anything else.
  const profile = await api<{ emailAddress: string }>(token, "/profile");
  const own = profile.emailAddress.toLowerCase();

  const { data: tokenRow } = await db
    .from("google_tokens")
    .select("gmail_synced_at")
    .eq("owner_id", ownerId)
    .maybeSingle();
  const sinceMs = tokenRow?.gmail_synced_at
    ? new Date(tokenRow.gmail_synced_at).getTime() - OVERLAP_MS
    : Date.now() - FIRST_SYNC_DAYS * 86_400_000;
  const after = Math.floor(sinceMs / 1000);

  const [{ data: leads }, { data: clients }] = await Promise.all([
    db.from("leads").select("id, email, email_status, last_replied_at").eq("owner_id", ownerId).not("email", "is", null),
    db.from("clients").select("id, email").eq("owner_id", ownerId).not("email", "is", null),
  ]);
  const leadByEmail = new Map<string, NonNullable<typeof leads>[number]>();
  for (const l of leads ?? []) leadByEmail.set(String(l.email).trim().toLowerCase(), l);
  const clientByEmail = new Map<string, NonNullable<typeof clients>[number]>();
  for (const c of clients ?? []) clientByEmail.set(String(c.email).trim().toLowerCase(), c);

  const addresses = Array.from(
    new Set([...Array.from(leadByEmail.keys()), ...Array.from(clientByEmail.keys())])
  ).filter((a) => SAFE_ADDRESS.test(a));

  // ---------- replies ----------
  const found = new Set<string>();
  for (let i = 0; i < addresses.length; i += CHUNK) {
    const chunk = addresses.slice(i, i + CHUNK);
    const ids = await search(token, `in:inbox after:${after} from:(${chunk.join(" OR ")})`);
    ids.forEach((id) => found.add(id));
  }
  const foundIds = Array.from(found);

  let known = new Set<string>();
  if (foundIds.length) {
    const { data: existing } = await db
      .from("inbound_emails")
      .select("gmail_message_id")
      .eq("owner_id", ownerId)
      .in("gmail_message_id", foundIds);
    known = new Set((existing ?? []).map((r: { gmail_message_id: string }) => r.gmail_message_id));
  }
  const newIds = foundIds.filter((id) => !known.has(id)).slice(0, MAX_NEW);

  const rows: Record<string, unknown>[] = [];
  for (const id of newIds) {
    const msg = await api<GmailMessage>(token, `/messages/${id}?format=full`);
    const headers = msg.payload?.headers ?? [];
    const h = (name: string) => headers.find((x) => x.name.toLowerCase() === name)?.value ?? "";

    const from = parseFrom(h("from"));
    if (!from.email || from.email === own) continue;
    const auto = h("auto-submitted").toLowerCase();
    if (auto && auto !== "no") continue; // out-of-office and other auto replies
    if (["bulk", "junk", "auto_reply"].includes(h("precedence").toLowerCase())) continue;

    const lead = leadByEmail.get(from.email);
    const client = clientByEmail.get(from.email);
    if (!lead && !client) continue;

    rows.push({
      owner_id: ownerId,
      lead_id: lead?.id ?? null,
      client_id: client?.id ?? null,
      gmail_message_id: msg.id,
      gmail_thread_id: msg.threadId,
      from_email: from.email,
      from_name: from.name,
      subject: h("subject") || null,
      snippet: msg.snippet ?? null,
      body_text: stripQuoted(extractText(msg.payload)).slice(0, 20_000),
      received_at: new Date(Number(msg.internalDate) || Date.now()).toISOString(),
    });
  }

  let added = 0;
  if (rows.length) {
    const { data: inserted, error } = await db
      .from("inbound_emails")
      .upsert(rows, { onConflict: "owner_id,gmail_message_id", ignoreDuplicates: true })
      .select("lead_id, received_at");
    if (error) throw new Error(error.message);
    added = inserted?.length ?? 0;

    // A reply moves the lead to "replied" (only from new/contacted, never
    // backwards from meeting/won/lost) and ends its follow-up sequence.
    const latest = new Map<string, number>();
    for (const r of inserted ?? []) {
      if (!r.lead_id) continue;
      const t = new Date(r.received_at).getTime();
      if (t > (latest.get(r.lead_id) ?? 0)) latest.set(r.lead_id, t);
    }
    for (const [leadId, t] of Array.from(latest.entries())) {
      const prev = (leads ?? []).find((l) => l.id === leadId)?.last_replied_at;
      const when = Math.max(t, prev ? new Date(prev).getTime() : 0);
      await db.from("leads").update({ last_replied_at: new Date(when).toISOString() }).eq("id", leadId);
      await db.from("leads").update({ stage: "replied" }).eq("id", leadId).in("stage", ["new", "contacted"]);
      await db.from("sequence_enrollments").update({ status: "stopped" }).eq("lead_id", leadId).eq("status", "active");
    }
  }

  // ---------- bounces ----------
  // Gmail sends do not get Resend's bounce webhook, so read Gmail's own
  // "delivery failed" notices. Only messages from mailer-daemon/postmaster.
  let bounces = 0;
  try {
    const bounceIds = (await search(token, `in:inbox after:${after} from:(mailer-daemon OR postmaster)`)).slice(0, 20);
    for (const id of bounceIds) {
      const msg = await api<GmailMessage>(token, `/messages/${id}?format=metadata&metadataHeaders=X-Failed-Recipients`);
      const failed = (msg.payload?.headers ?? []).find((x) => x.name.toLowerCase() === "x-failed-recipients")?.value ?? "";
      for (const raw of failed.split(",")) {
        const addr = raw.trim().toLowerCase();
        if (!addr) continue;
        await db
          .from("email_messages")
          .update({ status: "bounced" })
          .eq("owner_id", ownerId)
          .eq("status", "sent")
          .ilike("to_email", escapeLike(addr));
        const lead = leadByEmail.get(addr);
        if (lead && lead.email_status !== "invalid") {
          await db.from("leads").update({ email_status: "invalid" }).eq("id", lead.id);
          await db.from("sequence_enrollments").update({ status: "stopped" }).eq("lead_id", lead.id).eq("status", "active");
          bounces++;
        }
      }
    }
  } catch {
    // Bounce handling is a bonus. Never let it fail the reply check.
  }

  await db.from("google_tokens").update({ gmail_synced_at: startedAt.toISOString() }).eq("owner_id", ownerId);
  return { added, checked: foundIds.length, bounces };
}

// For the daily cron, which has no signed-in user.
export async function syncRepliesForConnectedOwner() {
  const db = createAdminClient();
  const { data: row } = await db
    .from("google_tokens")
    .select("owner_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return null;
  return syncReplies(db, row.owner_id);
}
