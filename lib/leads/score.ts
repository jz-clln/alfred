// Pure function: lead + its email history in, temperature out.
export type Temperature = "hot" | "warm" | "cold";

export interface ScoreLead {
  stage: string;
  email_status: string;
  last_contacted_at: string | null;
  last_replied_at: string | null;
}
export interface ScoreMessage {
  status: string;
  opened_at: string | null;
  clicked_at: string | null;
  sent_at: string;
}

const DAY = 86_400_000;
const daysAgo = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY);

export function scoreLead(lead: ScoreLead, messages: ScoreMessage[]) {
  const reasons: string[] = [];

  if (lead.email_status === "invalid" || messages.some((m) => m.status === "bounced")) {
    return { score: 0, temperature: "cold" as Temperature, reasons: ["Email doesn't work"] };
  }
  if (lead.stage === "won") return { score: 100, temperature: "hot" as Temperature, reasons: ["Became a client"] };
  if (lead.stage === "lost") return { score: 0, temperature: "cold" as Temperature, reasons: ["Marked lost"] };

  let score = lead.stage === "new" ? 10 : 15;

  if (lead.stage === "meeting") { score += 35; reasons.push("Meeting booked"); }
  if (lead.last_replied_at) {
    score += 30;
    const d = daysAgo(lead.last_replied_at);
    reasons.push(`Replied ${d === 0 ? "today" : `${d}d ago`}`);
    if (d <= 7) score += 10;
  }

  const opens = messages.filter((m) => m.opened_at).length;
  if (opens) { score += Math.min(opens * 4, 12); reasons.push(`${opens} open${opens > 1 ? "s" : ""}`); }
  if (messages.some((m) => m.clicked_at)) { score += 10; reasons.push("Clicked a link"); }

  if (!lead.last_replied_at && lead.last_contacted_at) {
    const d = daysAgo(lead.last_contacted_at);
    if (d > 14) { score -= 15; reasons.push(`Quiet for ${d}d`); }
    if (messages.length >= 3) { score -= 10; reasons.push(`${messages.length} emails, no reply`); }
  }
  if (lead.stage === "new") reasons.push("Not contacted yet");

  score = Math.max(0, Math.min(100, score));
  const temperature: Temperature = score >= 60 ? "hot" : score >= 30 ? "warm" : "cold";
  return { score, temperature, reasons };
}
