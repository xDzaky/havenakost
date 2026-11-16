import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  financialRecords,
  kostListings,
  kostRooms,
} from "@/lib/db/schema";
import { getOwnedKost, getOwnedRoom } from "@/lib/security/authorization";
import { AppError, NotFoundError } from "@/lib/utils/api-error";
import { offsetOf, paginationMeta } from "@/lib/utils/pagination";
import type { z } from "zod";
import type {
  financeCreateSchema,
  financeQuerySchema,
  financeSummaryQuerySchema,
  financeUpdateSchema,
} from "@/lib/validators/finance.schema";

type FinanceCreateInput = z.infer<typeof financeCreateSchema>;
type FinanceUpdateInput = z.infer<typeof financeUpdateSchema>;
type FinanceQuery = z.infer<typeof financeQuerySchema>;
type FinanceSummaryQuery = z.infer<typeof financeSummaryQuerySchema>;

async function assertKostRoomOwnership(
  ownerId: string,
  kostId?: string | null,
  roomId?: string | null,
) {
  if (kostId) await getOwnedKost(ownerId, kostId);
  if (roomId) {
    const { room } = await getOwnedRoom(ownerId, roomId);
    if (kostId && room.kostId !== kostId) {
      throw new AppError("Kamar tidak berada pada kost yang dipilih", 422);
    }
    return room;
  }
  return null;
}

export async function listFinancialRecords(
  ownerId: string,
  query: FinanceQuery,
) {
  const conditions = [eq(financialRecords.ownerId, ownerId)];
  if (query.from) {
    conditions.push(gte(financialRecords.transactionDate, query.from));
  }
  if (query.to) conditions.push(lte(financialRecords.transactionDate, query.to));
  if (query.category) {
    conditions.push(eq(financialRecords.category, query.category));
  }
  if (query.record_type) {
    conditions.push(eq(financialRecords.recordType, query.record_type));
  }
  if (query.kost_id) {
    conditions.push(eq(financialRecords.kostId, query.kost_id));
  }
  if (query.room_id) {
    conditions.push(eq(financialRecords.roomId, query.room_id));
  }
  const where = and(...conditions)!;

  const items = await db
    .select({
      id: financialRecords.id,
      kostId: financialRecords.kostId,
      kostName: kostListings.name,
      roomId: financialRecords.roomId,
      roomCode: kostRooms.roomCode,
      recordType: financialRecords.recordType,
      category: financialRecords.category,
      description: financialRecords.description,
      amount: financialRecords.amount,
      transactionDate: financialRecords.transactionDate,
      createdAt: financialRecords.createdAt,
    })
    .from(financialRecords)
    .leftJoin(kostListings, eq(financialRecords.kostId, kostListings.id))
    .leftJoin(kostRooms, eq(financialRecords.roomId, kostRooms.id))
    .where(where)
    .orderBy(
      desc(financialRecords.transactionDate),
      desc(financialRecords.createdAt),
    )
    .limit(query.limit)
    .offset(offsetOf(query.page, query.limit));

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(financialRecords)
    .where(where);

  return {
    items,
    meta: paginationMeta(query.page, query.limit, countRow?.count ?? 0),
  };
}

export async function getFinancialRecord(ownerId: string, recordId: string) {
  const [record] = await db
    .select()
    .from(financialRecords)
    .where(
      and(
        eq(financialRecords.id, recordId),
        eq(financialRecords.ownerId, ownerId),
      ),
    )
    .limit(1);

  if (!record) throw new NotFoundError("Catatan keuangan tidak ditemukan");
  return record;
}

export async function createFinancialRecord(
  ownerId: string,
  input: FinanceCreateInput,
) {
  const room = await assertKostRoomOwnership(
    ownerId,
    input.kost_id,
    input.room_id,
  );

  const [created] = await db
    .insert(financialRecords)
    .values({
      ownerId,
      kostId: input.kost_id ?? room?.kostId ?? null,
      roomId: input.room_id ?? null,
      recordType: input.record_type,
      category: input.category,
      description: input.description ?? null,
      amount: input.amount.toFixed(2),
      transactionDate: input.transaction_date,
    })
    .returning();

  if (!created) throw new AppError("Gagal menyimpan catatan keuangan", 500);
  return created;
}

export async function updateFinancialRecord(
  ownerId: string,
  recordId: string,
  input: FinanceUpdateInput,
) {
  const existing = await getFinancialRecord(ownerId, recordId);

  const nextKostId =
    input.kost_id !== undefined ? input.kost_id : existing.kostId;
  const nextRoomId =
    input.room_id !== undefined ? input.room_id : existing.roomId;
  const linkedRoom = await assertKostRoomOwnership(
    ownerId,
    nextKostId,
    nextRoomId,
  );

  const values: Partial<typeof financialRecords.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.kost_id !== undefined) {
    values.kostId = input.kost_id ?? linkedRoom?.kostId ?? null;
  }
  if (input.room_id !== undefined) values.roomId = input.room_id;
  if (input.record_type !== undefined) values.recordType = input.record_type;
  if (input.category !== undefined) values.category = input.category;
  if (input.description !== undefined) {
    values.description = input.description;
  }
  if (input.amount !== undefined) values.amount = input.amount.toFixed(2);
  if (input.transaction_date !== undefined) {
    values.transactionDate = input.transaction_date;
  }

  const [updated] = await db
    .update(financialRecords)
    .set(values)
    .where(eq(financialRecords.id, recordId))
    .returning();

  if (!updated) throw new NotFoundError("Catatan keuangan tidak ditemukan");
  return updated;
}

export async function deleteFinancialRecord(
  ownerId: string,
  recordId: string,
) {
  await getFinancialRecord(ownerId, recordId);
  await db
    .delete(financialRecords)
    .where(eq(financialRecords.id, recordId));
}

export async function getFinanceSummary(
  ownerId: string,
  query: FinanceSummaryQuery,
) {
  const conditions = [eq(financialRecords.ownerId, ownerId)];
  if (query.from) {
    conditions.push(gte(financialRecords.transactionDate, query.from));
  }
  if (query.to) conditions.push(lte(financialRecords.transactionDate, query.to));
  if (query.kost_id) {
    conditions.push(eq(financialRecords.kostId, query.kost_id));
  }
  const where = and(...conditions)!;

  const [totals, monthly, categories] = await Promise.all([
    db
      .select({
        recordType: financialRecords.recordType,
        total: sql<number>`COALESCE(SUM(${financialRecords.amount}), 0)::float8`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(financialRecords)
      .where(where)
      .groupBy(financialRecords.recordType),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${financialRecords.transactionDate}), 'YYYY-MM')`,
        income: sql<number>`COALESCE(SUM(CASE WHEN ${financialRecords.recordType} = 'income' THEN ${financialRecords.amount} ELSE 0 END), 0)::float8`,
        expense: sql<number>`COALESCE(SUM(CASE WHEN ${financialRecords.recordType} = 'expense' THEN ${financialRecords.amount} ELSE 0 END), 0)::float8`,
      })
      .from(financialRecords)
      .where(where)
      .groupBy(sql`date_trunc('month', ${financialRecords.transactionDate})`)
      .orderBy(sql`date_trunc('month', ${financialRecords.transactionDate})`),
    db
      .select({
        category: financialRecords.category,
        recordType: financialRecords.recordType,
        total: sql<number>`COALESCE(SUM(${financialRecords.amount}), 0)::float8`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(financialRecords)
      .where(where)
      .groupBy(financialRecords.category, financialRecords.recordType)
      .orderBy(financialRecords.category),
  ]);

  const income =
    totals.find((row) => row.recordType === "income")?.total ?? 0;
  const expense =
    totals.find((row) => row.recordType === "expense")?.total ?? 0;

  return {
    totals: {
      income,
      expense,
      balance: income - expense,
      income_count:
        totals.find((row) => row.recordType === "income")?.count ?? 0,
      expense_count:
        totals.find((row) => row.recordType === "expense")?.count ?? 0,
    },
    monthly: monthly.map((row) => ({
      ...row,
      balance: row.income - row.expense,
    })),
    categories,
    period: { from: query.from ?? null, to: query.to ?? null },
  };
}
