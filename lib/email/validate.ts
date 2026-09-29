// SERVER-ONLY (uses Node's dns). Checks that an address is well formed and
// that its domain can actually receive mail (MX lookup).
// It cannot prove a specific mailbox exists — only SMTP probing does, and
// that is unreliable. Bounces reported by the webhook are the final word.
import { promises as dns } from "dns";

export type EmailStatus = "valid" | "invalid" | "risky";

const SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "trashmail.com", "yopmail.com", "sharklasers.com",
]);

export async function checkEmail(email: string): Promise<EmailStatus> {
  const clean = email.trim().toLowerCase();
  if (!SHAPE.test(clean)) return "invalid";
  const domain = clean.split("@")[1];
  if (DISPOSABLE.has(domain)) return "risky";
  try {
    const mx = await dns.resolveMx(domain);
    return mx.length ? "valid" : "invalid";
  } catch (e: any) {
    if (e?.code === "ENOTFOUND" || e?.code === "ENODATA") return "invalid";
    return "risky"; // DNS timeout etc. — don't condemn the address
  }
}
