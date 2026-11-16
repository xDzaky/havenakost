import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, user } from "@/lib/db/schema";
import { offsetOf, paginationMeta } from "@/lib/utils/pagination";
import { NotFoundError } from "@/lib/utils/api-error";

export async function createNotification(input: {
  recipientUserId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  const [created] = await db
    .insert(notifications)
    .values({
      recipientUserId: input.recipientUserId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
    })
    .returning();
  return created;
}

export async function notifyAdmins(input: {
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  const admins = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "admin"));

  if (admins.length === 0) return;
  await db.insert(notifications).values(
    admins.map((admin) => ({
      recipientUserId: admin.id,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
    })),
  );
}

export async function listNotifications(
  userId: string,
  query: { page: number; limit: number; unreadOnly?: boolean },
) {
  const conditions = [eq(notifications.recipientUserId, userId)];
  if (query.unreadOnly) conditions.push(eq(notifications.isRead, false));
  const where = and(...conditions)!;

  const [items, countRow, unreadRow] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(query.limit)
      .offset(offsetOf(query.page, query.limit)),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notifications)
      .where(where),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, userId),
          eq(notifications.isRead, false),
        ),
      ),
  ]);

  return {
    items,
    unreadCount: unreadRow[0]?.count ?? 0,
    meta: paginationMeta(query.page, query.limit, countRow[0]?.count ?? 0),
  };
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
) {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientUserId, userId),
      ),
    )
    .returning();

  if (!updated) throw new NotFoundError("Notifikasi tidak ditemukan");
  return updated;
}

export async function markAllNotificationsRead(userId: string) {
  const updated = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientUserId, userId),
        eq(notifications.isRead, false),
      ),
    )
    .returning({ id: notifications.id });

  return { updated: updated.length };
}
