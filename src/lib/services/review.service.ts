import { createHash } from "node:crypto";
import {
  and,
  desc,
  eq,
  isNull,
  ne,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  kostListings,
  kostRooms,
  notifications,
  roomOccupancies,
  reviews,
  user,
} from "@/lib/db/schema";
import type { ReviewSubmitInput } from "@/lib/validators/review.schema";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  AppError,
} from "@/lib/utils/api-error";
import { offsetOf, paginationMeta } from "@/lib/utils/pagination";
import { normalizeName, toPublicDisplayName } from "@/lib/utils/slug";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { enforceRateLimit, hashIdentifier } from "@/lib/security/rate-limit";
import { logAdmin } from "./audit.service";

type ReviewRow = typeof reviews.$inferSelect;

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function periodsOverlap(input: {
  claimedIn: string;
  claimedOut?: string | null;
  occupancyIn: string;
  occupancyOut?: string | null;
}): boolean {
  const claimedOut = input.claimedOut ?? addDays(input.claimedIn, 30);
  const occupancyOut = input.occupancyOut ?? "9999-12-31";
  return input.occupancyIn <= claimedOut && occupancyOut >= input.claimedIn;
}

async function findMatchingCandidates(input: {
  roomId: string;
  reviewerName: string;
  claimedIn: string;
  claimedOut?: string | null;
}) {
  const normalized = normalizeName(input.reviewerName);
  if (!normalized) return [];

  const rows = await db
    .select()
    .from(roomOccupancies)
    .where(
      and(
        eq(roomOccupancies.roomId, input.roomId),
        ne(roomOccupancies.occupancyStatus, "cancelled"),
      ),
    );

  const used = await db
    .select({ occupancyId: reviews.verifiedOccupancyId })
    .from(reviews)
    .where(
      and(
        eq(reviews.roomId, input.roomId),
        sql`${reviews.verifiedOccupancyId} IS NOT NULL`,
      ),
    );

  const usedIds = new Set(
    used.map((row) => row.occupancyId).filter((id): id is string => Boolean(id)),
  );

  return rows.filter(
    (occupancy) =>
      !usedIds.has(occupancy.id) &&
      normalizeName(occupancy.tenantName) === normalized &&
      periodsOverlap({
        claimedIn: input.claimedIn,
        claimedOut: input.claimedOut,
        occupancyIn: occupancy.checkInDate,
        occupancyOut: occupancy.checkOutDate,
      }),
  );
}

/**
 * Public review submission. The response intentionally never reveals the
 * matching result (unmatched/possible/ambiguous) to the visitor.
 */
export async function submitPublicReview(
  input: ReviewSubmitInput,
  context: { ip: string; userAgent?: string },
) {
  await enforceRateLimit({
    scope: "review-ip",
    identifier: context.ip,
    limit: 20,
    windowSeconds: 60 * 60,
  });

  await verifyTurnstile(input.turnstile_token, context.ip);

  const [target] = await db
    .select({ room: kostRooms, kost: kostListings })
    .from(kostRooms)
    .innerJoin(kostListings, eq(kostRooms.kostId, kostListings.id))
    .where(eq(kostRooms.qrPublicToken, input.qr_token))
    .limit(1);

  if (!target || !target.room.qrEnabled) {
    throw new NotFoundError("QR tidak valid atau sudah dinonaktifkan");
  }
  if (
    target.kost.status !== "published" ||
    target.kost.deletedAt !== null
  ) {
    throw new ConflictError("Kost ini sedang tidak menerima review");
  }

  await enforceRateLimit({
    scope: "review-token",
    identifier: input.qr_token,
    limit: 10,
    windowSeconds: 24 * 60 * 60,
  });

  const ipHash = hashIdentifier(context.ip);
  const userAgentHash = context.userAgent
    ? createHash("sha256").update(context.userAgent).digest("hex")
    : null;

  const candidates = await findMatchingCandidates({
    roomId: target.room.id,
    reviewerName: input.reviewer_name,
    claimedIn: input.claimed_check_in_date,
    claimedOut: input.claimed_check_out_date,
  });

  const verificationStatus =
    candidates.length === 0
      ? "unmatched"
      : candidates.length === 1
        ? "possible_match"
        : "ambiguous";
  const matchedOccupancyId =
    candidates.length === 1 ? candidates[0]!.id : null;

  const created = await db.transaction(async (tx) => {
    const [review] = await tx
      .insert(reviews)
      .values({
        kostId: target.kost.id,
        roomId: target.room.id,
        matchedOccupancyId,
        reviewerName: input.reviewer_name,
        publicDisplayName: toPublicDisplayName(
          input.reviewer_name,
          input.public_display_name,
        ),
        claimedCheckInDate: input.claimed_check_in_date,
        claimedCheckOutDate: input.claimed_check_out_date ?? null,
        rating: input.rating,
        comment: input.comment,
        verificationStatus,
        publicationStatus: "pending",
        ipHash,
        userAgentHash,
      })
      .returning();

    if (!review) throw new AppError("Gagal menyimpan review", 500);

    await tx.insert(notifications).values({
      recipientUserId: target.kost.ownerId,
      type: "review_pending",
      title: "Review baru menunggu verifikasi",
      message: `Ada review baru untuk kamar ${target.room.roomCode} di ${target.kost.name}.`,
      relatedEntityType: "review",
      relatedEntityId: review.id,
    });

    return review;
  });

  return {
    id: created.id,
    publication_status: created.publicationStatus,
    message:
      "Review diterima dan menunggu verifikasi pemilik kost. Review belum tampil di halaman publik.",
  };
}

export async function listOwnerReviews(
  ownerId: string,
  query: {
    page: number;
    limit: number;
    publication_status?:
      | "pending"
      | "published"
      | "rejected"
      | "hidden"
      | "owner_rejected";
    verification_status?:
      | "unmatched"
      | "possible_match"
      | "ambiguous"
      | "verified"
      | "rejected";
    kost_id?: string;
    room_id?: string;
  },
) {
  const conditions = [eq(kostListings.ownerId, ownerId)];
  if (query.publication_status) {
    conditions.push(eq(reviews.publicationStatus, query.publication_status));
  }
  if (query.verification_status) {
    conditions.push(
      eq(reviews.verificationStatus, query.verification_status),
    );
  }
  if (query.kost_id) conditions.push(eq(reviews.kostId, query.kost_id));
  if (query.room_id) conditions.push(eq(reviews.roomId, query.room_id));

  const where = and(...conditions)!;

  const items = await db
    .select({
      id: reviews.id,
      kostId: reviews.kostId,
      kostName: kostListings.name,
      roomId: reviews.roomId,
      roomCode: kostRooms.roomCode,
      reviewerName: reviews.reviewerName,
      publicDisplayName: reviews.publicDisplayName,
      claimedCheckInDate: reviews.claimedCheckInDate,
      claimedCheckOutDate: reviews.claimedCheckOutDate,
      rating: reviews.rating,
      comment: reviews.comment,
      verificationStatus: reviews.verificationStatus,
      publicationStatus: reviews.publicationStatus,
      matchedOccupancyId: reviews.matchedOccupancyId,
      verifiedOccupancyId: reviews.verifiedOccupancyId,
      rejectionReason: reviews.rejectionReason,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(kostListings, eq(reviews.kostId, kostListings.id))
    .innerJoin(kostRooms, eq(reviews.roomId, kostRooms.id))
    .where(where)
    .orderBy(desc(reviews.createdAt))
    .limit(query.limit)
    .offset(offsetOf(query.page, query.limit));

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(reviews)
    .innerJoin(kostListings, eq(reviews.kostId, kostListings.id))
    .where(where);

  return {
    items,
    meta: paginationMeta(query.page, query.limit, countRow?.count ?? 0),
  };
}

async function getReviewForOwner(ownerId: string, reviewId: string) {
  const [row] = await db
    .select({ review: reviews, kost: kostListings, room: kostRooms })
    .from(reviews)
    .innerJoin(kostListings, eq(reviews.kostId, kostListings.id))
    .innerJoin(kostRooms, eq(reviews.roomId, kostRooms.id))
    .where(
      and(
        eq(reviews.id, reviewId),
        eq(kostListings.ownerId, ownerId),
        isNull(kostListings.deletedAt),
      ),
    )
    .limit(1);

  if (!row) throw new NotFoundError("Review tidak ditemukan");
  return row;
}

async function candidateOccupanciesForRoom(roomId: string) {
  const rows = await db
    .select({
      id: roomOccupancies.id,
      tenantName: roomOccupancies.tenantName,
      checkInDate: roomOccupancies.checkInDate,
      checkOutDate: roomOccupancies.checkOutDate,
      occupancyStatus: roomOccupancies.occupancyStatus,
    })
    .from(roomOccupancies)
    .where(
      and(
        eq(roomOccupancies.roomId, roomId),
        ne(roomOccupancies.occupancyStatus, "cancelled"),
      ),
    )
    .orderBy(desc(roomOccupancies.checkInDate));

  const used = await db
    .select({ occupancyId: reviews.verifiedOccupancyId })
    .from(reviews)
    .where(
      and(
        eq(reviews.roomId, roomId),
        sql`${reviews.verifiedOccupancyId} IS NOT NULL`,
      ),
    );
  const usedIds = new Set(
    used.map((row) => row.occupancyId).filter((id): id is string => Boolean(id)),
  );

  return rows.map((row) => ({
    ...row,
    already_used_for_verification: usedIds.has(row.id),
  }));
}

export async function getOwnerReviewDetail(
  ownerId: string,
  reviewId: string,
) {
  const row = await getReviewForOwner(ownerId, reviewId);
  const candidates = await candidateOccupanciesForRoom(row.room.id);

  return {
    ...row.review,
    kost: { id: row.kost.id, name: row.kost.name, slug: row.kost.slug },
    room: {
      id: row.room.id,
      roomCode: row.room.roomCode,
      roomName: row.room.roomName,
    },
    candidate_occupancies: candidates,
    note: "Gunakan data penghuni untuk mencocokkan, lalu konfirmasi secara manual.",
  };
}

async function lockReview(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], reviewId: string) {
  await tx.execute(
    sql`SELECT id FROM reviews WHERE id = ${reviewId} FOR UPDATE`,
  );
}

async function assertOccupancyForRoom(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  occupancyId: string,
  roomId: string,
  kostId: string,
) {
  const [occupancy] = await tx
    .select()
    .from(roomOccupancies)
    .where(
      and(
        eq(roomOccupancies.id, occupancyId),
        eq(roomOccupancies.roomId, roomId),
        eq(roomOccupancies.kostId, kostId),
        ne(roomOccupancies.occupancyStatus, "cancelled"),
      ),
    )
    .limit(1);

  if (!occupancy) {
    throw new NotFoundError("Data penghuni tidak ditemukan pada kamar ini");
  }
  return occupancy;
}

async function assertOccupancyNotUsed(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  occupancyId: string,
  reviewId: string,
) {
  const [duplicate] = await tx
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(
        eq(reviews.verifiedOccupancyId, occupancyId),
        ne(reviews.id, reviewId),
      ),
    )
    .limit(1);

  if (duplicate) {
    throw new ConflictError(
      "Data penghuni ini sudah dipakai untuk verifikasi review lain.",
    );
  }
}

export async function verifyOwnerReview(
  ownerId: string,
  reviewId: string,
  occupancyId?: string,
  overrideReason?: string,
) {
  const result = await db.transaction(async (tx) => {
    await lockReview(tx, reviewId);

    const [row] = await tx
      .select({ review: reviews, kost: kostListings })
      .from(reviews)
      .innerJoin(kostListings, eq(reviews.kostId, kostListings.id))
      .where(
        and(
          eq(reviews.id, reviewId),
          eq(kostListings.ownerId, ownerId),
          isNull(kostListings.deletedAt),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundError("Review tidak ditemukan");
    if (row.review.moderatedBy !== null) {
      throw new ForbiddenError(
        "Review ini sudah dimoderasi admin dan tidak dapat diubah pemilik.",
      );
    }
    if (row.review.publicationStatus === "hidden") {
      throw new ForbiddenError(
        "Review sedang disembunyikan admin dan tidak dapat diverifikasi pemilik.",
      );
    }
    if (
      row.review.verificationStatus === "verified" &&
      row.review.publicationStatus === "published"
    ) {
      throw new ConflictError("Review sudah terverifikasi dan published");
    }

    const chosenOccupancyId =
      occupancyId ?? row.review.matchedOccupancyId ?? null;
    if (!chosenOccupancyId) {
      throw new AppError(
        "Pilih data penghuni yang sesuai sebelum memverifikasi review",
        422,
      );
    }

    const occupancy = await assertOccupancyForRoom(
      tx,
      chosenOccupancyId,
      row.review.roomId,
      row.review.kostId,
    );
    await assertOccupancyNotUsed(tx, chosenOccupancyId, reviewId);

    const normReviewer = normalizeName(row.review.reviewerName);
    const normTenant = normalizeName(occupancy.tenantName);
    const namesMatch = normReviewer === normTenant;

    if (!namesMatch) {
      if (!overrideReason || overrideReason.trim().length < 5) {
        throw new AppError(
          "Nama penghuni tidak cocok dengan nama pengulas. Wajib sertakan alasan override (minimal 5 karakter).",
          422,
        );
      }
    }

    const [updated] = await tx
      .update(reviews)
      .set({
        verificationStatus: "verified",
        publicationStatus: "published",
        matchedOccupancyId: chosenOccupancyId,
        verifiedOccupancyId: chosenOccupancyId,
        overrideReason: !namesMatch ? overrideReason?.trim() : null,
        ownerReviewedBy: ownerId,
        ownerReviewedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, reviewId))
      .returning();

    if (!updated) throw new AppError("Gagal memverifikasi review", 500);
    return updated;
  });

  return result;
}

export async function rejectOwnerReview(
  ownerId: string,
  reviewId: string,
  reason: string,
) {
  const result = await db.transaction(async (tx) => {
    await lockReview(tx, reviewId);

    const [row] = await tx
      .select({ review: reviews, kost: kostListings })
      .from(reviews)
      .innerJoin(kostListings, eq(reviews.kostId, kostListings.id))
      .where(
        and(
          eq(reviews.id, reviewId),
          eq(kostListings.ownerId, ownerId),
          isNull(kostListings.deletedAt),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundError("Review tidak ditemukan");
    if (row.review.moderatedBy !== null) {
      throw new ForbiddenError(
        "Review ini sudah dimoderasi admin dan tidak dapat diubah pemilik.",
      );
    }
    if (
      row.review.verificationStatus === "verified" ||
      row.review.publicationStatus === "published"
    ) {
      throw new ConflictError(
        "Review yang sudah published hanya dapat dimoderasi admin.",
      );
    }
    if (row.review.publicationStatus === "hidden") {
      throw new ForbiddenError("Review sedang disembunyikan admin.");
    }

    const [updated] = await tx
      .update(reviews)
      .set({
        verificationStatus: "rejected",
        publicationStatus: "owner_rejected",
        rejectionReason: reason,
        ownerReviewedBy: ownerId,
        ownerReviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, reviewId))
      .returning();

    if (!updated) throw new AppError("Gagal menolak review", 500);
    return updated;
  });

  return result;
}

export async function listAdminReviews(query: {
  page: number;
  limit: number;
  publication_status?: "pending" | "published" | "rejected" | "hidden";
  verification_status?:
    | "unmatched"
    | "possible_match"
    | "ambiguous"
    | "verified"
    | "rejected";
  kost_id?: string;
  q?: string;
}) {
  const conditions = [];
  if (query.publication_status) {
    conditions.push(eq(reviews.publicationStatus, query.publication_status));
  }
  if (query.verification_status) {
    conditions.push(
      eq(reviews.verificationStatus, query.verification_status),
    );
  }
  if (query.kost_id) conditions.push(eq(reviews.kostId, query.kost_id));
  if (query.q) {
    conditions.push(
      sql`(${reviews.reviewerName} ILIKE ${`%${query.q}%`} OR ${reviews.comment} ILIKE ${`%${query.q}%`})`,
    );
  }
  const where = conditions.length > 0 ? and(...conditions)! : undefined;

  const items = await db
    .select({
      id: reviews.id,
      kostId: reviews.kostId,
      kostName: kostListings.name,
      roomCode: kostRooms.roomCode,
      reviewerName: reviews.reviewerName,
      rating: reviews.rating,
      comment: reviews.comment,
      verificationStatus: reviews.verificationStatus,
      publicationStatus: reviews.publicationStatus,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(kostListings, eq(reviews.kostId, kostListings.id))
    .innerJoin(kostRooms, eq(reviews.roomId, kostRooms.id))
    .where(where)
    .orderBy(desc(reviews.createdAt))
    .limit(query.limit)
    .offset(offsetOf(query.page, query.limit));

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(reviews)
    .innerJoin(kostListings, eq(reviews.kostId, kostListings.id))
    .innerJoin(kostRooms, eq(reviews.roomId, kostRooms.id))
    .where(where);

  return {
    items,
    meta: paginationMeta(query.page, query.limit, countRow?.count ?? 0),
  };
}

export async function getAdminReviewDetail(reviewId: string) {
  const [row] = await db
    .select({
      review: reviews,
      kost: kostListings,
      room: kostRooms,
      ownerEmail: user.email,
    })
    .from(reviews)
    .innerJoin(kostListings, eq(reviews.kostId, kostListings.id))
    .innerJoin(kostRooms, eq(reviews.roomId, kostRooms.id))
    .innerJoin(user, eq(kostListings.ownerId, user.id))
    .where(eq(reviews.id, reviewId))
    .limit(1);

  if (!row) throw new NotFoundError("Review tidak ditemukan");

  const candidates = await candidateOccupanciesForRoom(row.room.id);
  return {
    ...row.review,
    kost: { id: row.kost.id, name: row.kost.name, slug: row.kost.slug },
    room: {
      id: row.room.id,
      roomCode: row.room.roomCode,
      roomName: row.room.roomName,
    },
    owner: { email: row.ownerEmail },
    candidate_occupancies: candidates,
  };
}

async function adminReviewAction(
  adminId: string,
  reviewId: string,
  action: "publish" | "hide" | "verify" | "reject",
  options: { reason?: string; occupancyId?: string },
): Promise<ReviewRow> {
  const result = await db.transaction(async (tx) => {
    await lockReview(tx, reviewId);

    const [row] = await tx
      .select({ review: reviews, kost: kostListings })
      .from(reviews)
      .innerJoin(kostListings, eq(reviews.kostId, kostListings.id))
      .where(eq(reviews.id, reviewId))
      .limit(1);

    if (!row) throw new NotFoundError("Review tidak ditemukan");

    if (action === "verify") {
      const chosenOccupancyId =
        options.occupancyId ?? row.review.matchedOccupancyId ?? null;
      if (!chosenOccupancyId) {
        throw new AppError(
          "Pilih data penghuni yang sesuai sebelum verifikasi",
          422,
        );
      }
      await assertOccupancyForRoom(
        tx,
        chosenOccupancyId,
        row.review.roomId,
        row.review.kostId,
      );
      await assertOccupancyNotUsed(tx, chosenOccupancyId, reviewId);

      const [updated] = await tx
        .update(reviews)
        .set({
          verificationStatus: "verified",
          publicationStatus: "published",
          matchedOccupancyId: chosenOccupancyId,
          verifiedOccupancyId: chosenOccupancyId,
          moderatedBy: adminId,
          moderatedAt: new Date(),
          moderationReason: options.reason ?? null,
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, reviewId))
        .returning();
      if (!updated) throw new AppError("Gagal memverifikasi review", 500);
      return updated;
    }

    if (action === "publish") {
      const [updated] = await tx
        .update(reviews)
        .set({
          publicationStatus: "published",
          moderatedBy: adminId,
          moderatedAt: new Date(),
          moderationReason: options.reason ?? null,
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, reviewId))
        .returning();
      if (!updated) throw new AppError("Gagal mempublikasikan review", 500);
      return updated;
    }

    if (action === "hide") {
      if (!options.reason) {
        throw new AppError("Alasan moderasi wajib diisi", 422);
      }
      const [updated] = await tx
        .update(reviews)
        .set({
          publicationStatus: "hidden",
          moderatedBy: adminId,
          moderatedAt: new Date(),
          moderationReason: options.reason,
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, reviewId))
        .returning();
      if (!updated) throw new AppError("Gagal menyembunyikan review", 500);
      return updated;
    }

    if (!options.reason) {
      throw new AppError("Alasan penolakan wajib diisi", 422);
    }
    const [updated] = await tx
      .update(reviews)
      .set({
        verificationStatus: "rejected",
        publicationStatus: "rejected",
        rejectionReason: options.reason,
        moderatedBy: adminId,
        moderatedAt: new Date(),
        moderationReason: options.reason,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, reviewId))
      .returning();
    if (!updated) throw new AppError("Gagal menolak review", 500);
    return updated;
  });

  try {
    await logAdmin(adminId, {
      action: `review.${action}`,
      entityType: "review",
      entityId: reviewId,
      description: `Admin melakukan ${action} pada review`,
      metadata: {
        reason: options.reason ?? null,
        occupancyId: options.occupancyId ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] gagal mencatat aksi admin", error);
  }

  return result;
}

export function publishReview(adminId: string, reviewId: string, reason?: string) {
  return adminReviewAction(adminId, reviewId, "publish", { reason });
}

export function hideReview(adminId: string, reviewId: string, reason: string) {
  return adminReviewAction(adminId, reviewId, "hide", { reason });
}

export function verifyReviewAsAdmin(
  adminId: string,
  reviewId: string,
  options: { occupancyId?: string; reason?: string },
) {
  return adminReviewAction(adminId, reviewId, "verify", options);
}

export function rejectReviewAsAdmin(
  adminId: string,
  reviewId: string,
  reason: string,
) {
  return adminReviewAction(adminId, reviewId, "reject", { reason });
}

export async function overrideOwnerRejectReview(
  adminId: string,
  reviewId: string,
  action: "publish" | "reject",
  reason?: string,
) {
  const [row] = await db
    .select({ review: reviews, kost: kostListings })
    .from(reviews)
    .innerJoin(kostListings, eq(reviews.kostId, kostListings.id))
    .where(eq(reviews.id, reviewId))
    .limit(1);

  if (!row) throw new NotFoundError("Review tidak ditemukan");

  const [updated] = await db
    .update(reviews)
    .set({
      publicationStatus: action === "publish" ? "published" : "rejected",
      verificationStatus: action === "publish" ? "verified" : "rejected",
      moderatedBy: adminId,
      moderatedAt: new Date(),
      moderationReason: reason ?? `Admin override owner rejection: ${action}`,
      updatedAt: new Date(),
    })
    .where(eq(reviews.id, reviewId))
    .returning();

  await logAdmin(adminId, {
    action: "review.override_owner_reject",
    entityType: "review",
    entityId: reviewId,
    description: `Admin override penolakan owner menjadi ${action}`,
    metadata: { reason },
  });

  return updated;
}

export async function reportPublicReview(
  reviewId: string,
  reason: string,
  context: { ip: string },
) {
  await enforceRateLimit({
    scope: "review-report",
    identifier: context.ip,
    limit: 10,
    windowSeconds: 3600,
  });

  const [row] = await db
    .select({ id: reviews.id, isFlagged: reviews.isFlagged })
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1);

  if (!row) throw new NotFoundError("Review tidak ditemukan");

  await db
    .update(reviews)
    .set({
      isFlagged: true,
      flagReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(reviews.id, reviewId));

  return { message: "Laporan review diterima dan akan ditinjau admin." };
}

export async function replyOwnerReview(
  ownerId: string,
  reviewId: string,
  replyText: string,
) {
  const [row] = await db
    .select({ review: reviews, kost: kostListings })
    .from(reviews)
    .innerJoin(kostListings, eq(reviews.kostId, kostListings.id))
    .where(
      and(
        eq(reviews.id, reviewId),
        eq(kostListings.ownerId, ownerId),
        isNull(kostListings.deletedAt),
      ),
    )
    .limit(1);

  if (!row) throw new NotFoundError("Review tidak ditemukan");
  if (row.review.publicationStatus !== "published") {
    throw new ForbiddenError(
      "Hanya review yang sudah dipublikasikan yang dapat dibalas.",
    );
  }

  const [updated] = await db
    .update(reviews)
    .set({
      ownerReply: replyText,
      ownerRepliedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(reviews.id, reviewId))
    .returning();

  return updated;
}
