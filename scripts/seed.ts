import "dotenv/config";
import { db, sqlClient } from "@/lib/db";
import { facilities } from "@/lib/db/schema";
import { slugify } from "@/lib/utils/slug";

const FACILITIES = [
  "WiFi",
  "Parkir motor",
  "Parkir mobil",
  "Kamar mandi dalam",
  "Kamar mandi luar",
  "AC",
  "Lemari",
  "Kasur",
  "Meja belajar",
  "Dapur",
  "Laundry",
  "CCTV",
  "Akses 24 jam",
];

async function main() {
  for (const name of FACILITIES) {
    await db
      .insert(facilities)
      .values({ name, slug: slugify(name) })
      .onConflictDoNothing();
  }

  const rows = await db.select().from(facilities);
  console.log(`Seed selesai. Total fasilitas: ${rows.length}`);
  await sqlClient.end();
}

main().catch(async (error) => {
  console.error("Seed gagal", error);
  await sqlClient.end();
  process.exit(1);
});
