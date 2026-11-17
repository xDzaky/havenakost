import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { kostListings } from "./listings";
import { kostRooms, roomOccupancies } from "./rooms";
import {
  publicationStatusEnum,
  verificationStatusEnum,
} from "./enums";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kostId: uuid("kost_id")
      .notNull()
      .references(() => kostListings.id, { onDelete: "restrict" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => kostRooms.id, { onDelete: "restrict" }),
    matchedOccupancyId: uuid("matched_occupancy_id").references(
      () => roomOccupancies.id,
      { onDelete: "set null" },
    ),
    verifiedOccupancyId: uuid("verified_occupancy_id").references(
      () => roomOccupancies.id,
      { onDelete: "set null" },
    ),
    reviewerName: text("reviewer_name").notNull(),
    publicDisplayName: text("public_display_name"),
    claimedCheckInDate: date("claimed_check_in_date", {
      mode: "string",
    }).notNull(),
    claimedCheckOutDate: date("claimed_check_out_date", { mode: "string" }),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    verificationStatus: verificationStatusEnum("verification_status")
      .default("unmatched")
      .notNull(),
    publicationStatus: publicationStatusEnum("publication_status")
      .default("pending")
      .notNull(),
    ownerReviewedBy: text("owner_reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ownerReviewedAt: timestamp("owner_reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    moderatedBy: text("moderated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    moderationReason: text("moderation_reason"),
    ipHash: text("ip_hash"),
    userAgentHash: text("user_agent_hash"),
    overrideReason: text("override_reason"),
    isFlagged: boolean("is_flagged").default(false).notNull(),
    flagReason: text("flag_reason"),
    ownerReply: text("owner_reply"),
    ownerRepliedAt: timestamp("owner_replied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("reviews_kost_id_idx").on(table.kostId),
    index("reviews_room_id_idx").on(table.roomId),
    index("reviews_publication_status_idx").on(table.publicationStatus),
    index("reviews_verification_status_idx").on(table.verificationStatus),
    index("reviews_created_at_idx").on(table.createdAt),
    uniqueIndex("reviews_verified_occupancy_unique")
      .on(table.verifiedOccupancyId)
      .where(sql`${table.verifiedOccupancyId} IS NOT NULL`),
    check("reviews_rating_check", sql`${table.rating} BETWEEN 1 AND 5`),
    check(
      "reviews_claimed_date_order_check",
      sql`${table.claimedCheckOutDate} IS NULL OR ${table.claimedCheckOutDate} >= ${table.claimedCheckInDate}`,
    ),
  ],
);
