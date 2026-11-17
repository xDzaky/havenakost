import { sql } from "drizzle-orm";
import { apiRoute } from "@/lib/utils/route";
import { jsonSuccess, jsonError } from "@/lib/utils/api-response";
import { db } from "@/lib/db";

let cachedResult: { database: string; postgis: string | null } | null = null;
let lastCheck = 0;
const CACHE_TTL_MS = 15_000;

export const GET = apiRoute(async () => {
  const now = Date.now();
  if (cachedResult && now - lastCheck < CACHE_TTL_MS) {
    return jsonSuccess({
      status: "ok",
      ...cachedResult,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const [row] = await db.execute<{ postgis: string | null }>(
      sql`SELECT postgis_version() AS postgis`,
    );
    cachedResult = {
      database: "connected",
      postgis: row?.postgis ?? null,
    };
    lastCheck = now;

    return jsonSuccess({
      status: "ok",
      ...cachedResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[health] database check failed", error);
    return jsonError("Database tidak dapat diakses", 503);
  }
});
