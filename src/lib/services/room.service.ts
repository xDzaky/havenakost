import { randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { kostRooms, roomOccupancies, reviews } from "@/lib/db/schema";
import { getOwnedKost, getOwnedRoom } from "@/lib/security/authorization";
import { AppError, ConflictError, NotFoundError } from "@/lib/utils/api-error";
import { offsetOf, paginationMeta } from "@/lib/utils/pagination";
import {
  buildReviewUrl,
  generateQrAssets,
  generateQrPng,
} from "@/lib/utils/qr-code";
import type {
  roomCreateSchema,
  roomUpdateSchema,
} from "@/lib/validators/room.schema";
import type { z } from "zod";

type RoomCreateInput = z.infer<typeof roomCreateSchema>;
type RoomUpdateInput = z.infer<typeof roomUpdateSchema>;

function newQrToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function listOwnerRooms(
  ownerId: string,
  kostId: string,
  query: {
    page: number;
    limit: number;
    status?: "available" | "occupied" | "unavailable";
  },
) {
  await getOwnedKost(ownerId, kostId);

  const conditions = [eq(kostRooms.kostId, kostId)];
  if (query.status) conditions.push(eq(kostRooms.roomStatus, query.status));
  const where = and(...conditions)!;

  const items = await db
    .select({
      id: kostRooms.id,
      roomCode: kostRooms.roomCode,
      roomName: kostRooms.roomName,
      description: kostRooms.description,
      monthlyPrice: kostRooms.monthlyPrice,
      roomStatus: kostRooms.roomStatus,
      qrEnabled: kostRooms.qrEnabled,
      hasQr: sql<boolean>`${kostRooms.qrPublicToken} IS NOT NULL`,
      createdAt: kostRooms.createdAt,
    })
    .from(kostRooms)
    .where(where)
    .orderBy(kostRooms.roomCode)
    .limit(query.limit)
    .offset(offsetOf(query.page, query.limit));

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(kostRooms)
    .where(where);

  return {
    items,
    meta: paginationMeta(query.page, query.limit, countRow?.count ?? 0),
  };
}

export async function createOwnerRoom(
  ownerId: string,
  kostId: string,
  input: RoomCreateInput,
) {
  await getOwnedKost(ownerId, kostId);

  const [room] = await db
    .insert(kostRooms)
    .values({
      kostId,
      roomCode: input.room_code,
      roomName: input.room_name,
      description: input.description,
      monthlyPrice: input.monthly_price.toFixed(2),
      roomStatus: input.room_status,
    })
    .returning();

  if (!room) throw new AppError("Gagal membuat kamar", 500);
  return room;
}

export async function getOwnerRoom(ownerId: string, roomId: string) {
  const { room } = await getOwnedRoom(ownerId, roomId);
  return room;
}

export async function updateOwnerRoom(
  ownerId: string,
  roomId: string,
  input: RoomUpdateInput,
) {
  await getOwnedRoom(ownerId, roomId);

  const values: Partial<typeof kostRooms.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.room_code !== undefined) values.roomCode = input.room_code;
  if (input.room_name !== undefined) values.roomName = input.room_name;
  if (input.description !== undefined) values.description = input.description;
  if (input.monthly_price !== undefined) {
    values.monthlyPrice = input.monthly_price.toFixed(2);
  }
  if (input.room_status !== undefined) values.roomStatus = input.room_status;

  const [updated] = await db
    .update(kostRooms)
    .set(values)
    .where(eq(kostRooms.id, roomId))
    .returning();

  if (!updated) throw new NotFoundError("Kamar tidak ditemukan");
  return updated;
}

export async function deleteOwnerRoom(ownerId: string, roomId: string) {
  await getOwnedRoom(ownerId, roomId);

  const [occupancyCount] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(roomOccupancies)
    .where(eq(roomOccupancies.roomId, roomId));
  const [reviewCount] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(reviews)
    .where(eq(reviews.roomId, roomId));

  if ((occupancyCount?.count ?? 0) > 0 || (reviewCount?.count ?? 0) > 0) {
    throw new ConflictError(
      "Kamar memiliki riwayat penghuni/review sehingga tidak dapat dihapus. Set status menjadi unavailable.",
    );
  }

  await db.delete(kostRooms).where(eq(kostRooms.id, roomId));
}

export async function ensureRoomQr(ownerId: string, roomId: string) {
  const { room } = await getOwnedRoom(ownerId, roomId);

  if (room.qrPublicToken && room.qrEnabled) {
    return buildQrPayload(room.id, room.roomCode, room.qrPublicToken, true);
  }
  if (room.qrPublicToken && !room.qrEnabled) {
    throw new ConflictError(
      "QR sudah ada tetapi dinonaktifkan. Gunakan endpoint regenerate untuk membuat token baru.",
    );
  }

  const token = newQrToken();
  await db
    .update(kostRooms)
    .set({ qrPublicToken: token, qrEnabled: true, updatedAt: new Date() })
    .where(eq(kostRooms.id, roomId));

  return buildQrPayload(room.id, room.roomCode, token, true);
}

export async function regenerateRoomQr(ownerId: string, roomId: string) {
  const { room } = await getOwnedRoom(ownerId, roomId);
  const token = newQrToken();
  await db
    .update(kostRooms)
    .set({ qrPublicToken: token, qrEnabled: true, updatedAt: new Date() })
    .where(eq(kostRooms.id, roomId));
  return buildQrPayload(room.id, room.roomCode, token, true);
}

export async function disableRoomQr(ownerId: string, roomId: string) {
  const { room } = await getOwnedRoom(ownerId, roomId);
  if (!room.qrPublicToken) {
    throw new NotFoundError("QR belum dibuat untuk kamar ini");
  }
  await db
    .update(kostRooms)
    .set({ qrEnabled: false, updatedAt: new Date() })
    .where(eq(kostRooms.id, roomId));
}

export async function getRoomQr(ownerId: string, roomId: string) {
  const { room } = await getOwnedRoom(ownerId, roomId);
  if (!room.qrPublicToken) {
    throw new NotFoundError("QR belum dibuat untuk kamar ini");
  }
  return buildQrPayload(
    room.id,
    room.roomCode,
    room.qrPublicToken,
    room.qrEnabled,
  );
}

export async function downloadRoomQr(
  ownerId: string,
  roomId: string,
  format: "png" | "svg",
): Promise<{ buffer: Buffer | string; token: string; roomCode: string }> {
  const qr = await getRoomQr(ownerId, roomId);
  if (!qr.enabled) {
    throw new ConflictError(
      "QR sedang dinonaktifkan. Aktifkan ulang sebelum mengunduh.",
    );
  }
  if (format === "png") {
    return {
      buffer: await generateQrPng(qr.reviewUrl),
      token: qr.token,
      roomCode: qr.roomCode,
    };
  }
  if (!qr.svg) {
    throw new AppError("Gagal membuat gambar QR", 500);
  }
  return { buffer: qr.svg, token: qr.token, roomCode: qr.roomCode };
}

async function buildQrPayload(
  roomId: string,
  roomCode: string,
  token: string,
  enabled: boolean,
) {
  const reviewUrl = buildReviewUrl(token);
  const assets =
    enabled
      ? await generateQrAssets(reviewUrl)
      : { dataUrl: null, svg: null };

  return {
    roomId,
    roomCode,
    token,
    reviewUrl,
    enabled,
    dataUrl: assets.dataUrl,
    svg: assets.svg,
  };
}

export async function getRoomById(roomId: string) {
  const [room] = await db
    .select()
    .from(kostRooms)
    .where(eq(kostRooms.id, roomId))
    .limit(1);
  if (!room) throw new NotFoundError("Kamar tidak ditemukan");
  return room;
}

export async function getRoomOccupancyList(roomId: string) {
  return db
    .select()
    .from(roomOccupancies)
    .where(eq(roomOccupancies.roomId, roomId))
    .orderBy(desc(roomOccupancies.checkInDate));
}
