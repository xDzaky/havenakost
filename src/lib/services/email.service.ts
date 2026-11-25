import { env, isProduction } from "@/lib/env";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

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
    if (process.env.NODE_ENV !== "production") {
      // Pada mode dev/testing, jangan gagalkan autentikasi bila domain Resend free tier membatasi penerima
      return;
    }
    throw new Error("Gagal mengirim email melalui Resend");
  }
}
