import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL wajib diset. Jangan menjalankan test terhadap database development.",
    );
  }

  const client = postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 15,
  });
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client.end();
}
