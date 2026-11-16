import "dotenv/config";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL belum diset");
}

// All test modules must hit the isolated test database, never development.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.APP_BASE_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "test-site-key";
process.env.TURNSTILE_SECRET_KEY =
  process.env.TURNSTILE_SECRET_KEY ?? "test-secret";
process.env.REVIEW_RATE_LIMIT_HMAC_SECRET =
  process.env.REVIEW_RATE_LIMIT_HMAC_SECRET ?? "test-rate-limit-secret";
