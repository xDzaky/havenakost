import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL belum diset");
}

const globalForDb = globalThis as unknown as {
  havenakostSqlClient?: ReturnType<typeof postgres>;
};

/**
 * postgres.js is used instead of the Neon HTTP driver because several flows
 * (review verification, subscription approval) need interactive transactions.
 * `prepare: false` keeps compatibility with Neon's pooled endpoint.
 */
export const sqlClient =
  globalForDb.havenakostSqlClient ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.havenakostSqlClient = sqlClient;
}

export const db = drizzle(sqlClient, { schema });
export { schema };
export type Database = typeof db;
export type Transaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];
