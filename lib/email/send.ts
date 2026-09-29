// lib/email/send.ts — SERVER-ONLY. Replace the whole file.
//
// Which provider is used is decided by your environment variables:
//   1. RESEND_API_KEY + EMAIL_FROM set  -> Resend (open/click/bounce tracking)
//   2. otherwise GMAIL_USER + GMAIL_APP_PASSWORD set -> your Gmail
// So today you set only the Gmail variables. When you buy your domain and
// verify it in Resend, add RESEND_API_KEY and it takes over automatically;
// the webhook route (/api/webhooks/resend) is already in place for tracking.

import nodemailer from "nodemailer";

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function bodyToHtml(body: string) {
  return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#141F1A">${escapeHtml(
    body
  ).replace(/\n/g, "<br>")}</div>`;
}

type Input = { to: string; subject: string; body: string };

async function sendWithResend(input: Input): Promise<SendResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        text: input.body,
        html: bodyToHtml(input.body),
        reply_to: process.env.OWNER_EMAIL || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.message ?? `Resend error ${res.status}` };
    return { ok: true, id: data.id as string };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Network error while sending." };
  }
}

async function sendWithGmail(input: Input): Promise<SendResult> {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    const info = await transporter.sendMail({
      // Gmail rewrites the address to your own account, but the display name is kept.
      from: process.env.EMAIL_FROM || process.env.GMAIL_USER,
      to: input.to,
      subject: input.subject,
      text: input.body,
      html: bodyToHtml(input.body),
    });
    return { ok: true, id: info.messageId };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Gmail couldn't send this email." };
  }
}

export async function sendEmail(input: Input): Promise<SendResult> {
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    return sendWithResend(input);
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return sendWithGmail(input);
  }
  return {
    ok: false,
    error: "Email isn't set up. Add GMAIL_USER and GMAIL_APP_PASSWORD to your environment.",
  };
}

// {{name}}, {{first_name}}, {{company}} merge fields.
export function renderTemplate(
  text: string,
  vars: { name?: string | null; company?: string | null }
) {
  const name = (vars.name ?? "").trim();
  return text
    .replace(/{{\s*first_name\s*}}/gi, name.split(" ")[0] || "there")
    .replace(/{{\s*name\s*}}/gi, name || "there")
    .replace(/{{\s*company\s*}}/gi, (vars.company ?? "").trim() || "your company");
}