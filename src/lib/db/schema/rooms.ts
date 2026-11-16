import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { kostListings } from "./listings";
import {
  occupancyStatusEnum,
  roomStatusEnum,
} from "./enums";

export const kostRooms = pgTable(
  "kost_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kostId: uuid("kost_id")
      .notNull()
      .references(() => kostListings.id, { onDelete: "cascade" }),
    roomCode: text("room_code").notNull(),
    roomName: text("room_name"),
    description: text("description"),
    monthlyPrice: numeric("monthly_price", { precision: 12, scale: 2 })
      .notNull(),
    roomStatus: roomStatusEnum("room_status").default("available").notNull(),
    qrPublicToken: text("qr_public_token"),
    qrEnabled: boolean("qr_enabled").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("kost_rooms_kost_code_unique").on(
      table.kostId,
      table.roomCode,
    ),
    uniqueIndex("kost_rooms_qr_public_token_unique").on(table.qrPublicToken),
    index("kost_rooms_kost_id_idx").on(table.kostId),
    index("kost_rooms_room_status_idx").on(table.roomStatus),
    check(
      "kost_rooms_monthly_price_check",
      sql`${table.monthlyPrice} >= 0`,
    ),
  ],
);

export const roomOccupancies = pgTable(
  "room_occupancies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kostId: uuid("kost_id")
      .notNull()
      .references(() => kostListings.id, { onDelete: "restrict" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => kostRooms.id, { onDelete: "restrict" }),
    tenantName: text("tenant_name").notNull(),
    checkInDate: date("check_in_date", { mode: "string" }).notNull(),
    checkOutDate: date("check_out_date", { mode: "string" }),
    occupancyStatus: occupancyStatusEnum("occupancy_status")
      .default("active")
      .notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("room_occupancies_kost_id_idx").on(table.kostId),
    index("room_occupancies_room_id_idx").on(table.roomId),
    index("room_occupancies_occupancy_status_idx").on(table.occupancyStatus),
    uniqueIndex("room_occupancies_one_active_per_room")
      .on(table.roomId)
      .where(sql`${table.occupancyStatus} = 'active'`),
    check(
      "room_occupancies_date_order_check",
      sql`${table.checkOutDate} IS NULL OR ${table.checkOutDate} >= ${table.checkInDate}`,
    ),
  ],
);
