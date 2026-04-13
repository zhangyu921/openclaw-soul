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
  const result = await client.emails.send({
    from,
    to: payload.email,
    subject: "Your OpenClaw Soul login code",
    text: `Your login code is ${payload.code}. It expires in ${minutes} minutes.`,
  });

  return !result.error;
}
