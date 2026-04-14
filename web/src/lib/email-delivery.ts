import { Resend } from "resend";

type CodePayload = {
  email: string;
  code: string;
  ttlSeconds: number;
};

function resendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function resendFrom(): string | null {
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  return from || null;
}

export async function sendLoginCodeWithResend(payload: CodePayload): Promise<boolean> {
  const client = resendClient();
  const from = resendFrom();
  if (!client || !from) return false;

  const minutes = Math.max(1, Math.floor(payload.ttlSeconds / 60));
  const code = payload.code.trim();
  const subject = `[OpenClaw Soul] Verification code: ${code}`;
  const text = [
    "OpenClaw Soul verification code",
    "",
    `Code: ${code}`,
    `Expires in: ${minutes} minute(s)`,
    "",
    "If you did not request this code, you can ignore this email.",
    "Do not reply to this message.",
  ].join("\n");
  const html = [
    "<div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#111827;\">",
    "<p style=\"margin:0 0 12px;font-size:14px;font-weight:600;\">OpenClaw Soul verification code</p>",
    `<p style=\"margin:0 0 12px;font-size:13px;\">Use this code to continue signing in:</p>`,
    `<p style=\"margin:0 0 16px;font-size:28px;font-weight:700;letter-spacing:4px;\">${code}</p>`,
    `<p style=\"margin:0 0 12px;font-size:13px;color:#4b5563;\">Expires in ${minutes} minute(s).</p>`,
    "<p style=\"margin:0;font-size:12px;color:#6b7280;\">If you did not request this code, you can ignore this email.</p>",
    "</div>",
  ].join("");
  const result = await client.emails.send({
    from,
    to: payload.email,
    subject,
    text,
    html,
  });

  return !result.error;
}
