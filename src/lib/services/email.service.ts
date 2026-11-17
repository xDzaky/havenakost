import { env, isProduction } from "@/lib/env";

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const { to, subject, html } = options;

  if (!env.RESEND_API_KEY) {
    if (isProduction) {
      throw new Error(
        "RESEND_API_KEY wajib dikonfigurasi di lingkungan produksi untuk pengiriman email",
      );
    }
    console.log(`[email mock] To: ${to} | Subject: ${subject}\n${html}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM ?? "Havena Kost <noreply@havenakost.com>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[email error] Resend API error:", errorText);
    throw new Error("Gagal mengirim email melalui Resend");
  }
}
