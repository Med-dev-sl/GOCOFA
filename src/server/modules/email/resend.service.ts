import { Resend } from "resend";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendEmail(input: SendEmailInput) {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL || "GOCOFA <noreply@connectsierraleone.com>";

  return resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}
