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

export async function resetDatabase() {
  await sqlClient.unsafe(`
    TRUNCATE TABLE
      "user",
      "session",
      "account",
      "verification",
      "owner_profiles",
      "kost_listings",
      "kost_listing_facilities",
      "kost_photos",
      "kost_rooms",
      "room_occupancies",
      "reviews",
      "financial_records",
      "notifications",
      "owner_subscriptions",
      "subscription_payments",
      "subscription_plans",
      "admin_logs",
      "rate_limit_buckets",
      "facilities"
    RESTART IDENTITY CASCADE
  `);

  await db
    .insert(facilities)
    .values(FACILITIES.map((name) => ({ name, slug: slugify(name) })))
    .onConflictDoNothing();
}
