import nodemailer from "nodemailer";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** True when reviewer/author outbound mail can be sent (not log-only). */
export function isOutboundSmtpConfigured(): boolean {
  const host = Boolean(process.env.SMTP_HOST?.trim());
  if (!host) return false;
  const allowNoAuth =
    process.env.SMTP_ALLOW_NO_AUTH === "true" || process.env.SMTP_ALLOW_NO_AUTH === "1";
  if (allowNoAuth) return true;
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = (process.env.SMTP_PASSWORD ?? "").trim();
  return Boolean(user && pass);
}

export async function sendOutboundEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    return {
      ok: false,
      error:
        "SMTP is not configured. Set SMTP_HOST (and usually SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM) in .env.local.",
    };
  }

  const to = params.to.trim();
  if (!to) {
    return { ok: false, error: "Recipient address is empty." };
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER?.trim() ?? "";
  const passRaw = process.env.SMTP_PASSWORD ?? "";
  const pass = passRaw.trim();
  const allowNoAuth =
    process.env.SMTP_ALLOW_NO_AUTH === "true" || process.env.SMTP_ALLOW_NO_AUTH === "1";
  const secure =
    process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1" || port === 465;

  const hasCredentials = Boolean(user && pass);

  if (!allowNoAuth && !hasCredentials) {
    return {
      ok: false,
      error:
        'SMTP login is missing. Set SMTP_USER to your mailbox address and SMTP_PASSWORD to the account password (Gmail: use an "App password", not your normal password — Google Account → Security → 2-Step Verification → App passwords). If you use a local relay with no auth (e.g. Mailpit), set SMTP_ALLOW_NO_AUTH=true.',
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: hasCredentials ? { user, pass } : undefined,
  });

  const from =
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    user ||
    "noreply@localhost";

  try {
    await transporter.sendMail({
      from,
      to,
      subject: params.subject,
      text: params.text,
      html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${escapeHtml(params.text)}</pre>`,
    });
    return { ok: true };
  } catch (e) {
    console.error("[sendOutboundEmail]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("PLAIN") || msg.includes("credentials")) {
      return {
        ok: false,
        error:
          `${msg} — Check SMTP_USER and SMTP_PASSWORD in .env.local (both required for Gmail and most providers).`,
      };
    }
    return { ok: false, error: msg };
  }
}
