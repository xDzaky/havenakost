import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
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
  paymentStatusEnum,
  subscriptionStatusEnum,
} from "./enums";

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    price: numeric("price", { precision: 14, scale: 2 }).notNull(),
    durationDays: integer("duration_days").notNull(),
    maxListings: integer("max_listings"),
    features: text("features"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("subscription_plans_code_unique").on(table.code),
    index("subscription_plans_is_active_idx").on(table.isActive),
    check("subscription_plans_price_check", sql`${table.price} >= 0`),
    check(
      "subscription_plans_duration_check",
      sql`${table.durationDays} > 0`,
    ),
  ],
);

export const ownerSubscriptions = pgTable(
  "owner_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    status: subscriptionStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("owner_subscriptions_owner_id_idx").on(table.ownerId),
    index("owner_subscriptions_status_idx").on(table.status),
    uniqueIndex("owner_subscriptions_one_active_per_owner")
      .on(table.ownerId)
      .where(sql`${table.status} = 'active'`),
    check(
      "owner_subscriptions_date_order_check",
      sql`${table.endDate} >= ${table.startDate}`,
    ),
  ],
);

export const subscriptionPayments = pgTable(
  "subscription_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
    subscriptionId: uuid("subscription_id").references(
      () => ownerSubscriptions.id,
      { onDelete: "set null" },
    ),
    paymentMethod: text("payment_method").notNull(),
    paymentAmount: numeric("payment_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),
    paymentProof: text("payment_proof"),
    status: paymentStatusEnum("status").default("pending").notNull(),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("subscription_payments_owner_id_idx").on(table.ownerId),
    index("subscription_payments_status_idx").on(table.status),
    index("subscription_payments_plan_id_idx").on(table.planId),
    check(
      "subscription_payments_amount_check",
      sql`${table.paymentAmount} > 0`,
    ),
  ],
);
