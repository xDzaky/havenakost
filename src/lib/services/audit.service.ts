import { db } from "@/lib/db";
import { adminLogs } from "@/lib/db/schema";

const SENSITIVE_KEYS = new Set([
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "access_token",
  "refresh_token",
  "secret_key",
  "api_key",
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) continue;
      output[key] = sanitize(item, depth + 1);
    }
    return output;
  }
  return value;
}

export async function logAdmin(
  adminId: string,
  entry: {
    action: string;
    entityType: string;
    entityId?: string | null;
    description?: string | null;
    metadata?: unknown;
    ipHash?: string | null;
    userAgent?: string | null;
    before?: unknown;
    after?: unknown;
  },
  tx?: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<void> {
  const client = tx ?? db;
  await client.insert(adminLogs).values({
    adminId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    description: entry.description ?? null,
    metadata:
      entry.metadata === undefined ? null : (sanitize(entry.metadata) as object),
    ipHash: entry.ipHash ?? null,
    userAgent: entry.userAgent ?? null,
    before: entry.before === undefined ? null : (sanitize(entry.before) as object),
    after: entry.after === undefined ? null : (sanitize(entry.after) as object),
  });
}
