import { getServiceUser } from "../../../../lib/server-auth";

export const runtime = "edge";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const user = await getServiceUser(request);
    if (!user) return Response.json({ error: "Sign in is required" }, { status: 401 });
    const body = (await request.json()) as { to?: string; subject?: string; message?: string };
    if (!body.to || !validEmail(body.to)) return Response.json({ error: "Enter a valid notification email" }, { status: 400 });
    if (user.provider !== "development" && body.to.trim().toLowerCase() !== user.email) {
      return Response.json({ error: "Email reminders can only be sent to your verified account address" }, { status: 403 });
    }

    const { env } = await import("cloudflare:workers");
    const bindings = env as unknown as { RESEND_API_KEY?: string; NOTIFICATION_FROM_EMAIL?: string };
    if (!bindings.RESEND_API_KEY || !bindings.NOTIFICATION_FROM_EMAIL) {
      return Response.json({
        delivered: false,
        preview: true,
        message: "Email preferences are saved. Configure RESEND_API_KEY and NOTIFICATION_FROM_EMAIL on your server to deliver messages.",
      });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${bindings.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: bindings.NOTIFICATION_FROM_EMAIL,
        to: [body.to],
        subject: body.subject || "Your Plateful study reminder",
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#18362b"><h1 style="font-size:26px">Plateful</h1><p style="line-height:1.6">${(body.message || "Your next study session is ready.").replace(/[<>&]/g, "")}</p><p style="font-size:12px;color:#66756d">You enabled this reminder in your private Plateful workspace.</p></div>`,
      }),
    });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
    const result = (await response.json()) as { id?: string };
    return Response.json({ delivered: true, id: result.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
