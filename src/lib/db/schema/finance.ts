import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { financialRecordTypeEnum } from "./enums";
import { kostListings } from "./listings";
import { kostRooms } from "./rooms";

export const financialRecords = pgTable(
  "financial_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    kostId: uuid("kost_id").references(() => kostListings.id, {
      onDelete: "restrict",
    }),
    roomId: uuid("room_id").references(() => kostRooms.id, {
      onDelete: "set null",
    }),
    recordType: financialRecordTypeEnum("record_type").notNull(),
    category: text("category").notNull(),
    description: text("description"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    transactionDate: date("transaction_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("financial_records_owner_id_idx").on(table.ownerId),
    index("financial_records_transaction_date_idx").on(table.transactionDate),
    index("financial_records_kost_id_idx").on(table.kostId),
    index("financial_records_type_idx").on(table.recordType),
    check("financial_records_amount_check", sql`${table.amount} > 0`),
  ],
);
