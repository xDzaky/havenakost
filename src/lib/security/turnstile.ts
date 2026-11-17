import { env, isProduction, isTest } from "@/lib/env";
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
  expectedAction?: string,
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
      null,
      "TURNSTILE_FAILED",
    );
  }

  if (result.hostname) {
    let allowedHostnames: string[] = [];
    try {
      allowedHostnames.push(new URL(env.APP_BASE_URL).hostname);
    } catch {
      // ignore parse failure
    }
    if (!isProduction) {
      allowedHostnames.push("localhost", "127.0.0.1");
    }

    if (!allowedHostnames.includes(result.hostname)) {
      throw new AppError(
        "Verifikasi keamanan gagal: domain tidak sesuai.",
        422,
        null,
        "TURNSTILE_HOSTNAME_MISMATCH",
      );
    }
  }

  if (expectedAction && result.action && result.action !== expectedAction) {
    throw new AppError(
      "Verifikasi keamanan gagal: aksi tidak sesuai.",
      422,
      null,
      "TURNSTILE_ACTION_MISMATCH",
    );
  }
}
