import { sql } from "drizzle-orm";
import { apiRoute } from "@/lib/utils/route";
import { jsonSuccess, jsonError } from "@/lib/utils/api-response";
import { db } from "@/lib/db";

export const GET = apiRoute(async () => {
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
    console.error("[health] database check failed", error);
    return jsonError("Database tidak dapat diakses", 503);
  }
});
