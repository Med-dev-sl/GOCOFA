import { sendEmail } from "@/src/server/modules/email/resend.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const to = typeof body.to === "string" ? body.to : "";

    if (!to) {
      return Response.json({ error: "Recipient email is required" }, { status: 400 });
    }

    const result = await sendEmail({
      to,
      subject: "GOCOFA email integration test",
      html: "<h1>GOCOFA</h1><p>Your Resend email integration is working.</p>",
      text: "GOCOFA: Your Resend email integration is working.",
    });

    return Response.json({ ok: true, id: result.data?.id ?? null }, { status: 202 });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Email service unavailable" },
      { status: 503 },
    );
  }
}
