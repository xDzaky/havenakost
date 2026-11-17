import { sql } from "drizzle-orm";
import { adminRoute } from "@/lib/auth/guards";
import { jsonSuccess, jsonError } from "@/lib/utils/api-response";
import { db } from "@/lib/db";

export const GET = adminRoute(async () => {
  try {
    const [row] = await db.execute<{ postgis: string | null }>(
      sql`SELECT postgis_version() AS postgis`,
    );
    return jsonSuccess({
      status: "ok",
      database: "connected",
      postgis: row?.postgis ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/health] database check failed", error);
    return jsonError("Database tidak dapat diakses", 503);
  }
});
