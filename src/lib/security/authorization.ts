import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  kostListings,
  kostPhotos,
  kostRooms,
  roomOccupancies,
} from "@/lib/db/schema";
import { NotFoundError } from "@/lib/utils/api-error";

/**
 * Ownership checks always return 404 (not 403) for resources belonging to
 * another owner so existence is not leaked across accounts.
 */
export async function getOwnedKost(
  ownerId: string,
  kostId: string,
  options: { includeDeleted?: boolean } = {},
) {
  const conditions = [
    eq(kostListings.id, kostId),
    eq(kostListings.ownerId, ownerId),
  ];
  if (!options.includeDeleted) {
    conditions.push(isNull(kostListings.deletedAt));
  }

  const [kost] = await db
    .select()
    .from(kostListings)
    .where(and(...conditions))
    .limit(1);

  if (!kost) throw new NotFoundError("Listing tidak ditemukan");
  return kost;
}

export async function getOwnedRoom(ownerId: string, roomId: string) {
  const [row] = await db
    .select({ room: kostRooms, kost: kostListings })
    .from(kostRooms)
    .innerJoin(kostListings, eq(kostRooms.kostId, kostListings.id))
    .where(
      and(
        eq(kostRooms.id, roomId),
        eq(kostListings.ownerId, ownerId),
        isNull(kostListings.deletedAt),
      ),
    )
    .limit(1);

  if (!row) throw new NotFoundError("Kamar tidak ditemukan");
  return row;
}

export async function getOwnedOccupancy(
  ownerId: string,
  occupancyId: string,
) {
  const [row] = await db
    .select({ occupancy: roomOccupancies, kost: kostListings })
    .from(roomOccupancies)
    .innerJoin(kostListings, eq(roomOccupancies.kostId, kostListings.id))
    .where(
      and(
        eq(roomOccupancies.id, occupancyId),
        eq(kostListings.ownerId, ownerId),
        isNull(kostListings.deletedAt),
      ),
    )
    .limit(1);

  if (!row) throw new NotFoundError("Data penghuni tidak ditemukan");
  return row;
}

export async function getOwnedPhoto(ownerId: string, photoId: string) {
  const [row] = await db
    .select({ photo: kostPhotos, kost: kostListings })
    .from(kostPhotos)
    .innerJoin(kostListings, eq(kostPhotos.kostId, kostListings.id))
    .where(
      and(
        eq(kostPhotos.id, photoId),
        eq(kostListings.ownerId, ownerId),
        isNull(kostListings.deletedAt),
      ),
    )
    .limit(1);

  if (!row) throw new NotFoundError("Foto tidak ditemukan");
  return row;
}
