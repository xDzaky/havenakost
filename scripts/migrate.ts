import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

/**
 * Reliable migration runner for local/CI/production.
 *
 * Drizzle Kit is used to generate SQL (`npm run db:generate`); this script
 * applies the versioned SQL with Drizzle's migrator. It avoids the
 * interactive prompts of `drizzle-kit migrate` in non-TTY environments.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diset");

  const client = postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 15,
  });

  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    console.log("Migrasi database selesai.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Migrasi database gagal", error);
  process.exit(1);
});
