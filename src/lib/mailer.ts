import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Gmail SMTP via App Password. When SMTP_USER + SMTP_PASS are unset, the mailer
// is a no-op (logs and returns { skipped: true }) so the app runs keyless in demos.
const USER = process.env.SMTP_USER?.trim();
const PASS = process.env.SMTP_PASS?.replace(/\s+/g, ""); // app passwords are shown with spaces
export const MAIL_ENABLED = Boolean(USER && PASS);
export const LEADS_NOTIFY = process.env.LEADS_NOTIFY_EMAIL?.trim() || USER || "";
const FROM = process.env.MAIL_FROM?.trim() || (USER ? `emeinfotech.ai <${USER}>` : "");

let _tx: Transporter | null = null;
function transport(): Transporter | null {
  if (!MAIL_ENABLED) return null;
  if (!_tx) _tx = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: USER, pass: PASS } });
  return _tx;
}

export type MailResult = { ok: true; id: string } | { skipped: true } | { error: string };

export async function sendMail(opts: { to: string; subject: string; html: string; replyTo?: string }): Promise<MailResult> {
  const tx = transport();
  if (!tx || !opts.to) { console.log(`[mail:skipped] ${opts.subject} → ${opts.to || "(no recipient)"}`); return { skipped: true }; }
  try {
    const info = await tx.sendMail({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html, replyTo: opts.replyTo });
    return { ok: true, id: info.messageId };
  } catch (e) {
    console.error("[mail:error]", e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

const BRAND = "Hunt property";
function shell(body: string): string {
  return `<div style="font-family:system-ui,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
    <div style="background:#1f3a5f;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;font-weight:600">${BRAND}</div>
    <div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 8px 8px;padding:20px">${body}
      <p style="margin-top:24px;font-size:12px;color:#9ca3af">You're receiving this from ${BRAND}. Reply to this email to reach an agent directly.</p>
    </div>
  </div>`;
}

// Confirmation to the consumer who submitted an enquiry / viewing request.
export function leadConfirmationEmail(name: string, opts: { listingTitle?: string; viewing?: boolean }): { subject: string; html: string } {
  const what = opts.viewing ? "viewing request" : "enquiry";
  const re = opts.listingTitle ? ` for <strong>${opts.listingTitle}</strong>` : "";
  return {
    subject: `We received your ${what} — ${BRAND}`,
    html: shell(`<p>Hi ${name},</p>
      <p>Thanks for your ${what}${re}. A licensed agent will be in touch shortly to help with your next step.</p>
      <p>In the meantime you can browse listings, save favourites, and set up listing alerts from your account.</p>
      <p style="margin-top:16px">— The ${BRAND} team</p>`),
  };
}

// Notification to the brokerage/agent that a new lead arrived.
export function leadNotifyEmail(lead: { name: string; email: string; phone?: string | null; message?: string | null; type: string; listingTitle?: string; sourcePage?: string | null }): { subject: string; html: string } {
  const rows = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone || "—"],
    ["Type", lead.type],
    ["Listing", lead.listingTitle || "—"],
    ["Source", lead.sourcePage || "—"],
    ["Message", lead.message || "—"],
  ].map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;vertical-align:top">${k}</td><td style="padding:4px 0;font-weight:500">${v}</td></tr>`).join("");
  return {
    subject: `New ${lead.type} lead: ${lead.name}`,
    html: shell(`<p style="font-weight:600;margin-top:0">A new lead just came in.</p>
      <table style="font-size:14px;border-collapse:collapse">${rows}</table>`),
  };
}
