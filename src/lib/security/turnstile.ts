import { env, isTest } from "@/lib/env";
import { AppError } from "@/lib/utils/api-error";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileResponse = {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

/**
 * Server-side Turnstile validation.
 *
 * The only bypass is the explicit test token when NODE_ENV=test. It cannot be
 * activated in production because `isTest` is derived from NODE_ENV.
 */
export async function verifyTurnstile(
  token: string,
  remoteIp?: string,
): Promise<void> {
  if (isTest && token === "test-bypass") return;

  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new AppError(
      "Konfigurasi Turnstile belum tersedia di server",
      503,
      null,
      "TURNSTILE_NOT_CONFIGURED",
    );
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  let response: Response;
  try {
    response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(10_000),
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
  } catch {
    throw new AppError(
      "Tidak dapat menghubungi layanan verifikasi keamanan",
      502,
      null,
      "TURNSTILE_UNAVAILABLE",
    );
  }

  if (!response.ok) {
    throw new AppError(
      "Layanan verifikasi keamanan sedang bermasalah",
      502,
      null,
      "TURNSTILE_UNAVAILABLE",
    );
  }

  const result = (await response.json()) as TurnstileResponse;

  if (!result.success) {
    throw new AppError(
      "Verifikasi keamanan gagal. Silakan coba lagi.",
      422,
      { codes: result["error-codes"] ?? [] },
      "TURNSTILE_FAILED",
    );
  }
}
