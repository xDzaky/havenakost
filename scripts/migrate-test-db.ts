import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL belum diset");

  const client = postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 15,
  });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrasi database test selesai.");
  await client.end();
}

main().catch((error) => {
  console.error("Migrasi database test gagal", error);
  process.exit(1);
});
