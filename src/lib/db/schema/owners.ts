import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { ownerApprovalStatusEnum } from "./enums";

export const ownerProfiles = pgTable(
  "owner_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    businessName: text("business_name"),
    phone: text("phone"),
    address: text("address"),
    profilePhoto: text("profile_photo"),
    approvalStatus: ownerApprovalStatusEnum("approval_status")
      .default("pending")
      .notNull(),
    rejectionReason: text("rejection_reason"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("owner_profiles_user_id_unique").on(table.userId),
    index("owner_profiles_approval_status_idx").on(table.approvalStatus),
    check(
      "owner_profiles_phone_format_check",
      sql`${table.phone} IS NULL OR ${table.phone} ~ '^62[0-9]{8,15}$'`,
    ),
  ],
);
