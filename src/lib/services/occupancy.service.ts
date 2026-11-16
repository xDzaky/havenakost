import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { kostRooms, roomOccupancies, reviews } from "@/lib/db/schema";
import {
  getOwnedOccupancy,
  getOwnedRoom,
} from "@/lib/security/authorization";
import { AppError, ConflictError, NotFoundError } from "@/lib/utils/api-error";
import { offsetOf, paginationMeta } from "@/lib/utils/pagination";
import type { z } from "zod";
import type {
  occupancyCreateSchema,
  occupancyUpdateSchema,
} from "@/lib/validators/room.schema";

type OccupancyCreateInput = z.infer<typeof occupancyCreateSchema>;
type OccupancyUpdateInput = z.infer<typeof occupancyUpdateSchema>;

export async function listOccupancies(
  ownerId: string,
  roomId: string,
  query: {
    page: number;
    limit: number;
    status?: "active" | "completed" | "cancelled";
  },
) {
  await getOwnedRoom(ownerId, roomId);

  const conditions = [eq(roomOccupancies.roomId, roomId)];
  if (query.status) {
    conditions.push(eq(roomOccupancies.occupancyStatus, query.status));
  }
  const where = and(...conditions)!;

  const items = await db
    .select()
    .from(roomOccupancies)
    .where(where)
    .orderBy(desc(roomOccupancies.checkInDate))
    .limit(query.limit)
    .offset(offsetOf(query.page, query.limit));

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(roomOccupancies)
    .where(where);

  return {
    items,
    meta: paginationMeta(query.page, query.limit, countRow?.count ?? 0),
  };
}

export async function createOccupancy(
  ownerId: string,
  roomId: string,
  input: OccupancyCreateInput,
) {
  const { room } = await getOwnedRoom(ownerId, roomId);

  return db.transaction(async (tx) => {
    if (input.occupancy_status === "active") {
      const [existing] = await tx
        .select({ id: roomOccupancies.id })
        .from(roomOccupancies)
        .where(
          and(
            eq(roomOccupancies.roomId, roomId),
            eq(roomOccupancies.occupancyStatus, "active"),
          ),
        )
        .limit(1);
      if (existing) {
        throw new ConflictError(
          "Kamar ini masih memiliki penghuni aktif. Selesaikan data penghuni lama terlebih dahulu.",
        );
      }
    }

    const [created] = await tx
      .insert(roomOccupancies)
      .values({
        kostId: room.kostId,
        roomId,
        tenantName: input.tenant_name,
        checkInDate: input.check_in_date,
        checkOutDate: input.check_out_date ?? null,
        occupancyStatus: input.occupancy_status,
        notes: input.notes ?? null,
      })
      .returning();

    if (!created) throw new AppError("Gagal menyimpan data penghuni", 500);

    if (input.occupancy_status === "active") {
      await tx
        .update(kostRooms)
        .set({ roomStatus: "occupied", updatedAt: new Date() })
        .where(eq(kostRooms.id, roomId));
    }

    return created;
  });
}

export async function updateOccupancy(
  ownerId: string,
  occupancyId: string,
  input: OccupancyUpdateInput,
) {
  const existing = await getOwnedOccupancy(ownerId, occupancyId);
  const occupancy = existing.occupancy;

  const nextCheckIn = input.check_in_date ?? occupancy.checkInDate;
  const nextCheckOut =
    input.check_out_date !== undefined
      ? input.check_out_date
      : occupancy.checkOutDate;

  if (nextCheckOut && nextCheckOut < nextCheckIn) {
    throw new AppError(
      "Tanggal keluar tidak boleh sebelum tanggal masuk",
      422,
    );
  }

  const nextStatus = input.occupancy_status ?? occupancy.occupancyStatus;

  return db.transaction(async (tx) => {
    if (nextStatus === "active" && occupancy.occupancyStatus !== "active") {
      const [otherActive] = await tx
        .select({ id: roomOccupancies.id })
        .from(roomOccupancies)
        .where(
          and(
            eq(roomOccupancies.roomId, occupancy.roomId),
            eq(roomOccupancies.occupancyStatus, "active"),
            ne(roomOccupancies.id, occupancyId),
          ),
        )
        .limit(1);
      if (otherActive) {
        throw new ConflictError(
          "Kamar ini sudah memiliki penghuni aktif lain.",
        );
      }
    }

    const values: Partial<typeof roomOccupancies.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.tenant_name !== undefined) values.tenantName = input.tenant_name;
    if (input.check_in_date !== undefined) {
      values.checkInDate = input.check_in_date;
    }
    if (input.check_out_date !== undefined) {
      values.checkOutDate = input.check_out_date;
    }
    if (input.occupancy_status !== undefined) {
      values.occupancyStatus = input.occupancy_status;
    }
    if (input.notes !== undefined) values.notes = input.notes;

    const [updated] = await tx
      .update(roomOccupancies)
      .set(values)
      .where(eq(roomOccupancies.id, occupancyId))
      .returning();

    if (!updated) throw new NotFoundError("Data penghuni tidak ditemukan");

    if (nextStatus === "active") {
      await tx
        .update(kostRooms)
        .set({ roomStatus: "occupied", updatedAt: new Date() })
        .where(eq(kostRooms.id, occupancy.roomId));
    } else if (occupancy.occupancyStatus === "active") {
      await tx
        .update(kostRooms)
        .set({ roomStatus: "available", updatedAt: new Date() })
        .where(eq(kostRooms.id, occupancy.roomId));
    }

    return updated;
  });
}

export async function deleteOccupancy(
  ownerId: string,
  occupancyId: string,
) {
  const { occupancy } = await getOwnedOccupancy(ownerId, occupancyId);

  const [reviewRef] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.verifiedOccupancyId, occupancyId))
    .limit(1);
  if (reviewRef) {
    throw new ConflictError(
      "Data penghuni sudah dipakai untuk verifikasi review dan tidak dapat dihapus.",
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(roomOccupancies)
      .where(eq(roomOccupancies.id, occupancyId));

    if (occupancy.occupancyStatus === "active") {
      await tx
        .update(kostRooms)
        .set({ roomStatus: "available", updatedAt: new Date() })
        .where(eq(kostRooms.id, occupancy.roomId));
    }
  });
}
