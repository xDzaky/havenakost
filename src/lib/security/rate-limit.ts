import { createHmac, timingSafeEqual } from "node:crypto";
import { sqlClient } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError } from "@/lib/utils/api-error";

export function hashIdentifier(value: string): string {
  const secret =
    env.REVIEW_RATE_LIMIT_HMAC_SECRET ??
    env.BETTER_AUTH_SECRET ??
    "development-only-rate-limit-secret";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function rateLimitKey(
  scope: string,
  identifier: string,
): string {
  return `${scope}:${hashIdentifier(identifier)}`;
}

export function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Database-backed fixed-window limiter. The stored key is an HMAC fingerprint,
 * so raw IP addresses are never persisted.
 */
export async function enforceRateLimit(options: {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}): Promise<void> {
  const { scope, identifier, limit, windowSeconds } = options;
  const key = rateLimitKey(scope, identifier);

  const rows = await sqlClient<{ count: number; expires_at: Date }[]>`
    INSERT INTO rate_limit_buckets (key, window_start, count, expires_at)
    VALUES (${key}, now(), 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limit_buckets.window_start <= now() - make_interval(secs => ${windowSeconds})
        THEN 1
        ELSE rate_limit_buckets.count + 1
      END,
      window_start = CASE
        WHEN rate_limit_buckets.window_start <= now() - make_interval(secs => ${windowSeconds})
        THEN now()
        ELSE rate_limit_buckets.window_start
      END,
      expires_at = CASE
        WHEN rate_limit_buckets.window_start <= now() - make_interval(secs => ${windowSeconds})
        THEN now() + make_interval(secs => ${windowSeconds})
        ELSE rate_limit_buckets.expires_at
      END
    RETURNING count, expires_at
  `;

  const bucket = rows[0];
  if (!bucket) return;

  if (bucket.count > limit) {
    const retryAfter = Math.max(
      1,
      Math.ceil((new Date(bucket.expires_at).getTime() - Date.now()) / 1000),
    );
    throw new AppError(
      "Terlalu banyak permintaan. Coba lagi nanti.",
      429,
      { retry_after_seconds: retryAfter },
      "RATE_LIMITED",
    );
  }

  if (Math.random() < 0.02) {
    void sqlClient`
      DELETE FROM rate_limit_buckets WHERE expires_at < now() - interval '1 hour'
    `.catch(() => undefined);
  }
}

/**
 * Check if the rate limit bucket has reached or exceeded its limit without incrementing.
 * Throws AppError 429 with retry_after_seconds if limit is reached.
 */
export async function checkRateLimit(options: {
  scope: string;
  identifier: string;
  limit: number;
}): Promise<void> {
  const { scope, identifier, limit } = options;
  const key = rateLimitKey(scope, identifier);

  const rows = await sqlClient<{ count: number; expires_at: Date }[]>`
    SELECT count, expires_at FROM rate_limit_buckets
    WHERE key = ${key} AND expires_at > now()
    LIMIT 1
  `;
  const bucket = rows[0];
  if (bucket && bucket.count >= limit) {
    const retryAfter = Math.max(
      1,
      Math.ceil((new Date(bucket.expires_at).getTime() - Date.now()) / 1000),
    );
    throw new AppError(
      "Terlalu banyak percobaan gagal. Silakan coba lagi nanti.",
      429,
      { retry_after_seconds: retryAfter },
      "RATE_LIMITED",
    );
  }
}

/**
 * Reset / clear rate limit bucket for an identifier (e.g., after successful login).
 */
export async function resetRateLimit(
  scope: string,
  identifier: string,
): Promise<void> {
  const key = rateLimitKey(scope, identifier);
  await sqlClient`DELETE FROM rate_limit_buckets WHERE key = ${key}`;
}
