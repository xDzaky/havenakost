import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import {
  genderPolicyEnum,
  listingStatusEnum,
} from "./enums";

/**
 * PostGIS geography column. The value is maintained by a database trigger
 * from `latitude`/`longitude`; application code never writes it directly.
 */
export const geographyPoint = customType<{ data: string }>({
  dataType() {
    return "geography";
  },
});

export const facilities = pgTable(
  "facilities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    icon: text("icon"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("facilities_name_unique").on(table.name),
    uniqueIndex("facilities_slug_unique").on(table.slug),
  ],
);

export const kostListings = pgTable(
  "kost_listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    address: text("address").notNull(),
    province: text("province").notNull(),
    city: text("city").notNull(),
    district: text("district").notNull(),
    subdistrict: text("subdistrict"),
    postalCode: text("postal_code"),
    location: geographyPoint("location"),
    latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
    genderPolicy: genderPolicyEnum("gender_policy").notNull(),
    priceMin: integer("price_min").notNull(),
    priceMax: integer("price_max").notNull(),
    contactPhone: text("contact_phone").notNull(),
    status: listingStatusEnum("status").default("draft").notNull(),
    rejectionReason: text("rejection_reason"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("kost_listings_slug_unique").on(table.slug),
    index("kost_listings_owner_id_idx").on(table.ownerId),
    index("kost_listings_status_idx").on(table.status),
    index("kost_listings_city_idx").on(table.city),
    index("kost_listings_district_idx").on(table.district),
    index("kost_listings_deleted_at_idx").on(table.deletedAt),
    check(
      "kost_listings_latitude_check",
      sql`${table.latitude} BETWEEN -90 AND 90`,
    ),
    check(
      "kost_listings_longitude_check",
      sql`${table.longitude} BETWEEN -180 AND 180`,
    ),
    check(
      "kost_listings_price_check",
      sql`${table.priceMin} >= 0 AND ${table.priceMax} >= ${table.priceMin}`,
    ),
    check(
      "kost_listings_contact_phone_check",
      sql`${table.contactPhone} ~ '^62[0-9]{8,15}$'`,
    ),
  ],
);

export const kostListingFacilities = pgTable(
  "kost_listing_facilities",
  {
    kostId: uuid("kost_id")
      .notNull()
      .references(() => kostListings.id, { onDelete: "cascade" }),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("kost_listing_facilities_pk").on(
      table.kostId,
      table.facilityId,
    ),
    index("kost_listing_facilities_facility_id_idx").on(table.facilityId),
  ],
);

export const kostPhotos = pgTable(
  "kost_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kostId: uuid("kost_id")
      .notNull()
      .references(() => kostListings.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    imageUrl: text("image_url").notNull(),
    altText: text("alt_text"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isCover: boolean("is_cover").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("kost_photos_object_key_unique").on(table.objectKey),
    index("kost_photos_kost_id_idx").on(table.kostId),
    uniqueIndex("kost_photos_one_cover_per_kost")
      .on(table.kostId)
      .where(sql`${table.isCover} = true`),
  ],
);
