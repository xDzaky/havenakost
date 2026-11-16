import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  notifications,
  ownerSubscriptions,
  subscriptionPayments,
  subscriptionPlans,
  user,
} from "@/lib/db/schema";
import { AppError, ConflictError, NotFoundError } from "@/lib/utils/api-error";
import { offsetOf, paginationMeta } from "@/lib/utils/pagination";
import { notifyAdmins, createNotification } from "./notification.service";
import { logAdmin } from "./audit.service";
import type { z } from "zod";
import type {
  planCreateSchema,
  planUpdateSchema,
} from "@/lib/validators/subscription.schema";

type PlanCreateInput = z.infer<typeof planCreateSchema>;
type PlanUpdateInput = z.infer<typeof planUpdateSchema>;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export async function listPlans(options: { activeOnly: boolean }) {
  if (options.activeOnly) {
    return db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.price);
  }
  return db
    .select()
    .from(subscriptionPlans)
    .orderBy(subscriptionPlans.price);
}

export async function getOwnerSubscription(ownerId: string) {
  const [active] = await db
    .select({ subscription: ownerSubscriptions, plan: subscriptionPlans })
    .from(ownerSubscriptions)
    .innerJoin(
      subscriptionPlans,
      eq(ownerSubscriptions.planId, subscriptionPlans.id),
    )
    .where(
      and(
        eq(ownerSubscriptions.ownerId, ownerId),
        eq(ownerSubscriptions.status, "active"),
      ),
    )
    .limit(1);

  let current:
    | {
        subscription: typeof ownerSubscriptions.$inferSelect;
        plan: typeof subscriptionPlans.$inferSelect;
      }
    | undefined = active;
  if (active && active.subscription.endDate < today()) {
    await db
      .update(ownerSubscriptions)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(ownerSubscriptions.id, active.subscription.id));
    current = undefined;
  }

  const payments = await db
    .select({
      id: subscriptionPayments.id,
      planId: subscriptionPayments.planId,
      planName: subscriptionPlans.name,
      paymentMethod: subscriptionPayments.paymentMethod,
      paymentAmount: subscriptionPayments.paymentAmount,
      paymentProof: subscriptionPayments.paymentProof,
      status: subscriptionPayments.status,
      rejectionReason: subscriptionPayments.rejectionReason,
      createdAt: subscriptionPayments.createdAt,
      reviewedAt: subscriptionPayments.reviewedAt,
    })
    .from(subscriptionPayments)
    .innerJoin(
      subscriptionPlans,
      eq(subscriptionPayments.planId, subscriptionPlans.id),
    )
    .where(eq(subscriptionPayments.ownerId, ownerId))
    .orderBy(desc(subscriptionPayments.createdAt))
    .limit(20);

  return {
    subscription: current?.subscription ?? null,
    plan: current?.plan ?? null,
    payments,
  };
}

export async function createSubscriptionPayment(
  ownerId: string,
  input: {
    plan_id: string;
    payment_method: string;
    payment_amount: number;
    payment_proof?: string;
  },
) {
  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(
      and(
        eq(subscriptionPlans.id, input.plan_id),
        eq(subscriptionPlans.isActive, true),
      ),
    )
    .limit(1);

  if (!plan) throw new NotFoundError("Paket langganan tidak ditemukan");

  if (Math.abs(Number(plan.price) - input.payment_amount) > 0.001) {
    throw new AppError(
      `Nominal pembayaran harus sama dengan harga paket (${plan.price})`,
      422,
    );
  }

  const [payment] = await db
    .insert(subscriptionPayments)
    .values({
      ownerId,
      planId: plan.id,
      paymentMethod: input.payment_method,
      paymentAmount: input.payment_amount.toFixed(2),
      paymentProof: input.payment_proof ?? null,
      status: "pending",
    })
    .returning();

  if (!payment) throw new AppError("Gagal membuat pengajuan pembayaran", 500);

  await notifyAdmins({
    type: "subscription_payment_pending",
    title: "Pembayaran langganan menunggu verifikasi",
    message: `Ada pengajuan pembayaran paket ${plan.name} sebesar ${input.payment_amount}.`,
    relatedEntityType: "subscription_payment",
    relatedEntityId: payment.id,
  });

  return payment;
}

export async function listAdminPlans(query: {
  page: number;
  limit: number;
}) {
  const items = await db
    .select()
    .from(subscriptionPlans)
    .orderBy(subscriptionPlans.price)
    .limit(query.limit)
    .offset(offsetOf(query.page, query.limit));

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(subscriptionPlans);

  return {
    items,
    meta: paginationMeta(query.page, query.limit, countRow?.count ?? 0),
  };
}

export async function createPlan(adminId: string, input: PlanCreateInput) {
  const [created] = await db
    .insert(subscriptionPlans)
    .values({
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      price: input.price.toFixed(2),
      durationDays: input.duration_days,
      maxListings: input.max_listings ?? null,
      features: input.features ?? null,
      isActive: input.is_active,
    })
    .returning();

  if (!created) throw new AppError("Gagal membuat paket", 500);

  try {
    await logAdmin(adminId, {
      action: "subscription_plan.create",
      entityType: "subscription_plan",
      entityId: created.id,
      description: `Membuat paket ${created.name}`,
    });
  } catch (error) {
    console.error("[audit] gagal mencatat pembuatan paket", error);
  }

  return created;
}

export async function updatePlan(
  adminId: string,
  planId: string,
  input: PlanUpdateInput,
) {
  const values: Partial<typeof subscriptionPlans.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.code !== undefined) values.code = input.code;
  if (input.name !== undefined) values.name = input.name;
  if (input.description !== undefined) values.description = input.description;
  if (input.price !== undefined) values.price = input.price.toFixed(2);
  if (input.duration_days !== undefined) {
    values.durationDays = input.duration_days;
  }
  if (input.max_listings !== undefined) values.maxListings = input.max_listings;
  if (input.features !== undefined) values.features = input.features;
  if (input.is_active !== undefined) values.isActive = input.is_active;

  const [updated] = await db
    .update(subscriptionPlans)
    .set(values)
    .where(eq(subscriptionPlans.id, planId))
    .returning();

  if (!updated) throw new NotFoundError("Paket langganan tidak ditemukan");

  try {
    await logAdmin(adminId, {
      action: "subscription_plan.update",
      entityType: "subscription_plan",
      entityId: planId,
      description: `Mengubah paket ${updated.name}`,
    });
  } catch (error) {
    console.error("[audit] gagal mencatat perubahan paket", error);
  }

  return updated;
}

export async function deletePlan(adminId: string, planId: string) {
  const [existing] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.id, planId))
    .limit(1);
  if (!existing) throw new NotFoundError("Paket langganan tidak ditemukan");

  const [used] = await db
    .select({ id: ownerSubscriptions.id })
    .from(ownerSubscriptions)
    .where(eq(ownerSubscriptions.planId, planId))
    .limit(1);
  const [usedPayment] = await db
    .select({ id: subscriptionPayments.id })
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.planId, planId))
    .limit(1);

  if (used || usedPayment) {
    const [updated] = await db
      .update(subscriptionPlans)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(subscriptionPlans.id, planId))
      .returning();
    return {
      deactivated: true,
      plan: updated,
      message:
        "Paket sudah pernah dipakai sehingga dinonaktifkan, bukan dihapus.",
    };
  }

  await db
    .delete(subscriptionPlans)
    .where(eq(subscriptionPlans.id, planId));

  try {
    await logAdmin(adminId, {
      action: "subscription_plan.delete",
      entityType: "subscription_plan",
      entityId: planId,
      description: `Menghapus paket ${existing.name}`,
    });
  } catch (error) {
    console.error("[audit] gagal mencatat penghapusan paket", error);
  }

  return { deactivated: false, plan: null };
}

export async function listAdminPayments(query: {
  page: number;
  limit: number;
  status?: "pending" | "approved" | "rejected";
  owner_id?: string;
}) {
  const conditions = [];
  if (query.status) conditions.push(eq(subscriptionPayments.status, query.status));
  if (query.owner_id) {
    conditions.push(eq(subscriptionPayments.ownerId, query.owner_id));
  }
  const where = conditions.length > 0 ? and(...conditions)! : undefined;

  const items = await db
    .select({
      id: subscriptionPayments.id,
      ownerId: subscriptionPayments.ownerId,
      ownerEmail: user.email,
      planId: subscriptionPayments.planId,
      planName: subscriptionPlans.name,
      paymentMethod: subscriptionPayments.paymentMethod,
      paymentAmount: subscriptionPayments.paymentAmount,
      paymentProof: subscriptionPayments.paymentProof,
      status: subscriptionPayments.status,
      rejectionReason: subscriptionPayments.rejectionReason,
      reviewedBy: subscriptionPayments.reviewedBy,
      reviewedAt: subscriptionPayments.reviewedAt,
      createdAt: subscriptionPayments.createdAt,
    })
    .from(subscriptionPayments)
    .innerJoin(user, eq(subscriptionPayments.ownerId, user.id))
    .innerJoin(
      subscriptionPlans,
      eq(subscriptionPayments.planId, subscriptionPlans.id),
    )
    .where(where)
    .orderBy(desc(subscriptionPayments.createdAt))
    .limit(query.limit)
    .offset(offsetOf(query.page, query.limit));

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(subscriptionPayments)
    .where(where);

  return {
    items,
    meta: paginationMeta(query.page, query.limit, countRow?.count ?? 0),
  };
}

export async function listAdminSubscriptions(query: {
  page: number;
  limit: number;
}) {
  const items = await db
    .select({
      id: ownerSubscriptions.id,
      ownerId: ownerSubscriptions.ownerId,
      ownerEmail: user.email,
      planId: ownerSubscriptions.planId,
      planName: subscriptionPlans.name,
      startDate: ownerSubscriptions.startDate,
      endDate: ownerSubscriptions.endDate,
      status: ownerSubscriptions.status,
      createdAt: ownerSubscriptions.createdAt,
    })
    .from(ownerSubscriptions)
    .innerJoin(user, eq(ownerSubscriptions.ownerId, user.id))
    .innerJoin(
      subscriptionPlans,
      eq(ownerSubscriptions.planId, subscriptionPlans.id),
    )
    .orderBy(desc(ownerSubscriptions.createdAt))
    .limit(query.limit)
    .offset(offsetOf(query.page, query.limit));

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(ownerSubscriptions);

  return {
    items,
    meta: paginationMeta(query.page, query.limit, countRow?.count ?? 0),
  };
}

export async function approvePayment(
  adminId: string,
  paymentId: string,
) {
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM subscription_payments WHERE id = ${paymentId} FOR UPDATE`,
    );

    const [payment] = await tx
      .select({ payment: subscriptionPayments, plan: subscriptionPlans })
      .from(subscriptionPayments)
      .innerJoin(
        subscriptionPlans,
        eq(subscriptionPayments.planId, subscriptionPlans.id),
      )
      .where(eq(subscriptionPayments.id, paymentId))
      .limit(1);

    if (!payment) throw new NotFoundError("Pembayaran tidak ditemukan");
    if (payment.payment.status !== "pending") {
      throw new ConflictError("Pembayaran ini sudah diproses");
    }

    const startDate = today();
    const [current] = await tx
      .select()
      .from(ownerSubscriptions)
      .where(
        and(
          eq(ownerSubscriptions.ownerId, payment.payment.ownerId),
          eq(ownerSubscriptions.status, "active"),
        ),
      )
      .limit(1);

    let subscriptionId: string;
    let endDate: string;

    if (current && current.endDate >= startDate) {
      endDate = addDays(
        current.endDate,
        payment.plan.durationDays,
      );
      await tx
        .update(ownerSubscriptions)
        .set({
          endDate,
          planId: payment.plan.id,
          updatedAt: new Date(),
        })
        .where(eq(ownerSubscriptions.id, current.id));
      subscriptionId = current.id;
    } else {
      if (current) {
        await tx
          .update(ownerSubscriptions)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(ownerSubscriptions.id, current.id));
      }
      endDate = addDays(startDate, payment.plan.durationDays);
      const [created] = await tx
        .insert(ownerSubscriptions)
        .values({
          ownerId: payment.payment.ownerId,
          planId: payment.plan.id,
          startDate,
          endDate,
          status: "active",
        })
        .returning();
      if (!created) throw new AppError("Gagal membuat langganan", 500);
      subscriptionId = created.id;
    }

    const [updated] = await tx
      .update(subscriptionPayments)
      .set({
        status: "approved",
        subscriptionId,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPayments.id, paymentId))
      .returning();

    if (!updated) throw new AppError("Gagal menyetujui pembayaran", 500);

    await tx.insert(notifications).values({
      recipientUserId: payment.payment.ownerId,
      type: "subscription_approved",
      title: "Pembayaran langganan disetujui",
      message: `Langganan ${payment.plan.name} aktif sampai ${endDate}.`,
      relatedEntityType: "subscription_payment",
      relatedEntityId: paymentId,
    });

    return { payment: updated, subscriptionId, endDate };
  });

  try {
    await logAdmin(adminId, {
      action: "subscription_payment.approve",
      entityType: "subscription_payment",
      entityId: paymentId,
      description: "Menyetujui pembayaran langganan",
      metadata: {
        subscriptionId: result.subscriptionId,
        endDate: result.endDate,
      },
    });
  } catch (error) {
    console.error("[audit] gagal mencatat approval pembayaran", error);
  }

  return result;
}

export async function rejectPayment(
  adminId: string,
  paymentId: string,
  reason: string,
) {
  const [updated] = await db
    .update(subscriptionPayments)
    .set({
      status: "rejected",
      rejectionReason: reason,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(subscriptionPayments.id, paymentId),
        eq(subscriptionPayments.status, "pending"),
      ),
    )
    .returning();

  if (!updated) {
    throw new ConflictError(
      "Pembayaran tidak ditemukan atau sudah diproses",
    );
  }

  await createNotification({
    recipientUserId: updated.ownerId,
    type: "subscription_rejected",
    title: "Pembayaran langganan ditolak",
    message: `Pembayaran ditolak: ${reason}`,
    relatedEntityType: "subscription_payment",
    relatedEntityId: paymentId,
  });

  try {
    await logAdmin(adminId, {
      action: "subscription_payment.reject",
      entityType: "subscription_payment",
      entityId: paymentId,
      description: "Menolak pembayaran langganan",
      metadata: { reason },
    });
  } catch (error) {
    console.error("[audit] gagal mencatat penolakan pembayaran", error);
  }

  return updated;
}
