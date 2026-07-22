const RESEND_API_URL = "https://api.resend.com/emails";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(
  options: SendEmailOptions,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");

  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not configured." };
  }

  if (!from) {
    return { ok: false, error: "RESEND_FROM_EMAIL is not configured." };
  }

  const to = Array.isArray(options.to) ? options.to : [options.to];

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: options.subject,
        html: options.html,
        reply_to: options.replyTo,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof payload?.message === "string"
          ? payload.message
          : `Resend API error (${response.status})`;
      return { ok: false, error: message };
    }

    const id = typeof payload?.id === "string" ? payload.id : "unknown";
    return { ok: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resend request failed.";
    return { ok: false, error: message };
  }
}
