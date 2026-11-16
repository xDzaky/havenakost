import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const adminLogs = pgTable(
  "admin_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: text("admin_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    description: text("description"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("admin_logs_admin_id_idx").on(table.adminId),
    index("admin_logs_created_at_idx").on(table.createdAt),
    index("admin_logs_entity_idx").on(table.entityType, table.entityId),
  ],
);
