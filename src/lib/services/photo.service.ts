import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { kostListings, kostPhotos } from "@/lib/db/schema";
import { getOwnedKost, getOwnedPhoto } from "@/lib/security/authorization";
import {
  createPresignedPhotoUpload,
  deleteObject,
  headObject,
  isAllowedImageType,
  isObjectKeyForKost,
  publicUrlForKey,
  verifyImageMagicBytes,
} from "@/lib/storage/r2";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { AppError, ConflictError, NotFoundError } from "@/lib/utils/api-error";
import type { z } from "zod";
import type {
  photoConfirmSchema,
  photoPresignSchema,
  photoUpdateSchema,
} from "@/lib/validators/photo.schema";

type PresignInput = z.infer<typeof photoPresignSchema>;
type ConfirmInput = z.infer<typeof photoConfirmSchema>;
type UpdateInput = z.infer<typeof photoUpdateSchema>;

export const MAX_PHOTOS_PER_LISTING = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function presignListingPhoto(
  ownerId: string,
  kostId: string,
  input: PresignInput,
) {
  await getOwnedKost(ownerId, kostId);

  await enforceRateLimit({
    scope: "photo-presign",
    identifier: ownerId,
    limit: 30,
    windowSeconds: 3600,
  });

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(kostPhotos)
    .where(eq(kostPhotos.kostId, kostId));

  if ((countRow?.count ?? 0) >= MAX_PHOTOS_PER_LISTING) {
    throw new ConflictError(
      `Maksimal ${MAX_PHOTOS_PER_LISTING} foto per listing`,
    );
  }

  return createPresignedPhotoUpload({
    kostId,
    contentType: input.content_type,
    size: input.size,
  });
}

export async function confirmListingPhoto(
  ownerId: string,
  kostId: string,
  input: ConfirmInput,
) {
  await getOwnedKost(ownerId, kostId);

  if (!isObjectKeyForKost(input.object_key, kostId)) {
    throw new AppError(
      "Object key tidak valid untuk listing ini",
      422,
    );
  }

  const head = await headObject(input.object_key);
  if (!head.contentType || !isAllowedImageType(head.contentType)) {
    throw new AppError("File yang diunggah bukan gambar yang diizinkan", 422);
  }
  if (!head.contentLength || head.contentLength > MAX_IMAGE_BYTES) {
    throw new AppError("Ukuran file melebihi batas 10 MB", 422);
  }

  const magicValid = await verifyImageMagicBytes(
    input.object_key,
    head.contentType,
  );
  if (!magicValid) {
    throw new AppError(
      "Format isi file tidak sesuai dengan tipe gambar yang dideklarasikan",
      422,
    );
  }

  return db.transaction(async (tx) => {
    const [lockedListing] = await tx
      .select({ id: kostListings.id })
      .from(kostListings)
      .where(eq(kostListings.id, kostId))
      .for("update");

    if (!lockedListing) {
      throw new NotFoundError("Listing tidak ditemukan");
    }

    const [existing] = await tx
      .select({ id: kostPhotos.id })
      .from(kostPhotos)
      .where(eq(kostPhotos.objectKey, input.object_key))
      .limit(1);
    if (existing) throw new ConflictError("Foto ini sudah dikonfirmasi");

    const [countRow] = await tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(kostPhotos)
      .where(eq(kostPhotos.kostId, kostId));
    if ((countRow?.count ?? 0) >= MAX_PHOTOS_PER_LISTING) {
      throw new ConflictError(
        `Maksimal ${MAX_PHOTOS_PER_LISTING} foto per listing`,
      );
    }

    if (input.is_cover) {
      await tx
        .update(kostPhotos)
        .set({ isCover: false })
        .where(eq(kostPhotos.kostId, kostId));
    }

    const [created] = await tx
      .insert(kostPhotos)
      .values({
        kostId,
        objectKey: input.object_key,
        imageUrl: publicUrlForKey(input.object_key),
        altText: input.alt_text ?? null,
        sortOrder: input.sort_order,
        isCover: input.is_cover,
      })
      .returning();

    if (!created) throw new AppError("Gagal menyimpan metadata foto", 500);
    return created;
  });
}

export async function updateListingPhoto(
  ownerId: string,
  photoId: string,
  input: UpdateInput,
) {
  const { photo } = await getOwnedPhoto(ownerId, photoId);

  return db.transaction(async (tx) => {
    if (input.is_cover === true) {
      await tx
        .update(kostPhotos)
        .set({ isCover: false })
        .where(
          and(
            eq(kostPhotos.kostId, photo.kostId),
            ne(kostPhotos.id, photoId),
          ),
        );
    }

    const values: Partial<typeof kostPhotos.$inferInsert> = {};
    if (input.alt_text !== undefined) values.altText = input.alt_text;
    if (input.sort_order !== undefined) values.sortOrder = input.sort_order;
    if (input.is_cover !== undefined) values.isCover = input.is_cover;

    const [updated] = await tx
      .update(kostPhotos)
      .set(values)
      .where(eq(kostPhotos.id, photoId))
      .returning();

    if (!updated) throw new NotFoundError("Foto tidak ditemukan");
    return updated;
  });
}

export async function deleteListingPhoto(ownerId: string, photoId: string) {
  const { photo } = await getOwnedPhoto(ownerId, photoId);

  await db.delete(kostPhotos).where(eq(kostPhotos.id, photoId));

  if (photo.isCover) {
    const [next] = await db
      .select({ id: kostPhotos.id })
      .from(kostPhotos)
      .where(eq(kostPhotos.kostId, photo.kostId))
      .orderBy(kostPhotos.sortOrder, desc(kostPhotos.createdAt))
      .limit(1);
    if (next) {
      await db
        .update(kostPhotos)
        .set({ isCover: true })
        .where(eq(kostPhotos.id, next.id));
    }
  }

  try {
    await deleteObject(photo.objectKey);
  } catch (error) {
    console.error("[r2] gagal menghapus object setelah metadata dihapus", error);
  }
}
