import {
  and,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  adminLogs,
  facilities,
  financialRecords,
  kostListingFacilities,
  kostListings,
  kostPhotos,
  kostRooms,
  notifications,
  ownerProfiles,
  ownerSubscriptions,
  reviews,
  session,
  user,
} from "@/lib/db/schema";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/utils/api-error";
import { offsetOf, paginationMeta } from "@/lib/utils/pagination";
import { createNotification } from "./notification.service";
import { logAdmin } from "./audit.service";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getAdminDashboard(days: number) {
  const since = new Date(Date.now() - days * DAY_MS);

  const [
    ownerCount,
    listingCount,
    roomCount,
    reviewCount,
    pendingReviews,
    pendingListings,
    pendingOwners,
    activeSubscriptions,
    ownerGrowth,
    listingGrowth,
    reviewGrowth,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(user)
      .where(eq(user.role, "owner")),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(kostListings)
      .where(isNull(kostListings.deletedAt)),
    db.select({ count: sql<number>`COUNT(*)::int` }).from(kostRooms),
    db.select({ count: sql<number>`COUNT(*)::int` }).from(reviews),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(reviews)
      .where(eq(reviews.publicationStatus, "pending")),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(kostListings)
      .where(eq(kostListings.status, "pending")),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(ownerProfiles)
      .where(eq(ownerProfiles.approvalStatus, "pending")),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(ownerSubscriptions)
      .where(eq(ownerSubscriptions.status, "active")),
    db
      .select({
        date: sql<string>`to_char(${user.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(user)
      .where(and(eq(user.role, "owner"), gte(user.createdAt, since)))
      .groupBy(sql`to_char(${user.createdAt}, 'YYYY-MM-DD')`),
    db
      .select({
        date: sql<string>`to_char(${kostListings.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(kostListings)
      .where(
        and(
          gte(kostListings.createdAt, since),
          isNull(kostListings.deletedAt),
        ),
      )
      .groupBy(sql`to_char(${kostListings.createdAt}, 'YYYY-MM-DD')`),
    db
      .select({
        date: sql<string>`to_char(${reviews.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(reviews)
      .where(gte(reviews.createdAt, since))
      .groupBy(sql`to_char(${reviews.createdAt}, 'YYYY-MM-DD')`),
  ]);

  const ownerMap = new Map(ownerGrowth.map((row) => [row.date, row.count]));
  const listingMap = new Map(
    listingGrowth.map((row) => [row.date, row.count]),
  );
  const reviewMap = new Map(reviewGrowth.map((row) => [row.date, row.count]));

  const series: Array<{
    date: string;
    owners: number;
    listings: number;
    reviews: number;
  }> = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(Date.now() - index * DAY_MS)
      .toISOString()
      .slice(0, 10);
    series.push({
      date,
      owners: ownerMap.get(date) ?? 0,
      listings: listingMap.get(date) ?? 0,
      reviews: reviewMap.get(date) ?? 0,
    });
  }

  return {
    totals: {
      owners: ownerCount[0]?.count ?? 0,
      listings: listingCount[0]?.count ?? 0,
      rooms: roomCount[0]?.count ?? 0,
      reviews: reviewCount[0]?.count ?? 0,
      activeSubscriptions: activeSubscriptions[0]?.count ?? 0,
    },
    pending: {
      reviews: pendingReviews[0]?.count ?? 0,
      listings: pendingListings[0]?.count ?? 0,
      owners: pendingOwners[0]?.count ?? 0,
    },
    growth: {
      period_days: days,
      series,
    },
  };
}

export async function listAdminOwners(query: {
  page: number;
  limit: number;
  q?: string;
  approval_status?: "pending" | "approved" | "rejected" | "suspended";
}) {
  const conditions = [eq(user.role, "owner")];
  if (query.q) {
    conditions.push(
      sql`(${user.email} ILIKE ${`%${query.q}%`} OR ${user.name} ILIKE ${`%${query.q}%`} OR ${ownerProfiles.businessName} ILIKE ${`%${query.q}%`})`,
    );
  }
  if (query.approval_status) {
    conditions.push(eq(ownerProfiles.approvalStatus, query.approval_status));
  }
  const where = and(...conditions)!;

  const items = await db
    .select({
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      profileId: ownerProfiles.id,
      fullName: ownerProfiles.fullName,
      businessName: ownerProfiles.businessName,
      phone: ownerProfiles.phone,
      approvalStatus: ownerProfiles.approvalStatus,
      verifiedAt: ownerProfiles.verifiedAt,
      rejectionReason: ownerProfiles.rejectionReason,
    })
    .from(user)
    .leftJoin(ownerProfiles, eq(ownerProfiles.userId, user.id))
    .where(where)
    .orderBy(desc(user.createdAt))
    .limit(query.limit)
    .offset(offsetOf(query.page, query.limit));

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(user)
    .leftJoin(ownerProfiles, eq(ownerProfiles.userId, user.id))
    .where(where);

  return {
    items,
    meta: paginationMeta(query.page, query.limit, countRow?.count ?? 0),
  };
}

export async function getAdminOwnerDetail(ownerUserId: string) {
  const [owner] = await db
    .select({
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      profile: ownerProfiles,
    })
    .from(user)
    .leftJoin(ownerProfiles, eq(ownerProfiles.userId, user.id))
    .where(and(eq(user.id, ownerUserId), eq(user.role, "owner")))
    .limit(1);

  if (!owner) throw new NotFoundError("Pemilik tidak ditemukan");

  const [listings, roomCount, reviewCount, financeCount, subscription] =
    await Promise.all([
      db
        .select({
          id: kostListings.id,
          name: kostListings.name,
          slug: kostListings.slug,
          status: kostListings.status,
          createdAt: kostListings.createdAt,
        })
        .from(kostListings)
        .where(
          and(
            eq(kostListings.ownerId, ownerUserId),
            isNull(kostListings.deletedAt),
          ),
        )
        .orderBy(desc(kostListings.createdAt)),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(kostRooms)
        .innerJoin(kostListings, eq(kostRooms.kostId, kostListings.id))
        .where(eq(kostListings.ownerId, ownerUserId)),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(reviews)
        .innerJoin(kostListings, eq(reviews.kostId, kostListings.id))
        .where(eq(kostListings.ownerId, ownerUserId)),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(financialRecords)
        .where(eq(financialRecords.ownerId, ownerUserId)),
      db
        .select({
          id: ownerSubscriptions.id,
          status: ownerSubscriptions.status,
          startDate: ownerSubscriptions.startDate,
          endDate: ownerSubscriptions.endDate,
        })
        .from(ownerSubscriptions)
        .where(eq(ownerSubscriptions.ownerId, ownerUserId))
        .orderBy(desc(ownerSubscriptions.createdAt))
        .limit(1),
    ]);

  return {
    ...owner,
    stats: {
      listings: listings.length,
      rooms: roomCount[0]?.count ?? 0,
      reviews: reviewCount[0]?.count ?? 0,
      financial_records: financeCount[0]?.count ?? 0,
    },
    listings,
    subscription: subscription[0] ?? null,
  };
}

export async function approveOwner(adminId: string, ownerUserId: string) {
  const result = await updateOwnerApproval(adminId, ownerUserId, {
    status: "approved",
  });
  return result;
}

export async function rejectOwner(
  adminId: string,
  ownerUserId: string,
  reason: string,
) {
  return updateOwnerApproval(adminId, ownerUserId, {
    status: "rejected",
    reason,
  });
}

export async function setOwnerStatus(
  adminId: string,
  ownerUserId: string,
  status: "pending" | "approved" | "rejected" | "suspended",
  reason?: string,
) {
  return updateOwnerApproval(adminId, ownerUserId, { status, reason });
}

async function updateOwnerApproval(
  adminId: string,
  ownerUserId: string,
  input: {
    status: "pending" | "approved" | "rejected" | "suspended";
    reason?: string;
  },
) {
  if (
    (input.status === "rejected" || input.status === "suspended") &&
    (!input.reason || input.reason.trim().length < 5)
  ) {
    throw new AppError(
      "Alasan wajib diisi untuk status rejected atau suspended",
      422,
    );
  }

  const [owner] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(and(eq(user.id, ownerUserId), eq(user.role, "owner")))
    .limit(1);
  if (!owner) throw new NotFoundError("Pemilik tidak ditemukan");

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(ownerProfiles)
      .set({
        approvalStatus: input.status,
        rejectionReason:
          input.status === "rejected" || input.status === "suspended"
            ? input.reason
            : null,
        verifiedAt: input.status === "approved" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(ownerProfiles.userId, ownerUserId))
      .returning();

    if (!updated) throw new NotFoundError("Profil pemilik tidak ditemukan");

    if (input.status === "rejected") {
      await tx
        .delete(session)
        .where(eq(session.userId, ownerUserId));
    }

    if (input.status === "suspended" || input.status === "rejected") {
      await tx
        .update(kostListings)
        .set({ status: "archived", updatedAt: new Date() })
        .where(
          and(
            eq(kostListings.ownerId, ownerUserId),
            eq(kostListings.status, "published"),
          ),
        );
    }

    await tx.insert(notifications).values({
      recipientUserId: ownerUserId,
      type: `owner_${input.status}`,
      title: `Status akun pemilik: ${input.status}`,
      message:
        input.status === "approved"
          ? "Akun pemilik Anda telah disetujui. Anda dapat mengajukan listing untuk publikasi."
          : input.reason ?? `Status akun diubah menjadi ${input.status}.`,
      relatedEntityType: "owner_profile",
      relatedEntityId: updated.id,
    });

    return updated;
  });

  try {
    await logAdmin(adminId, {
      action: `owner.${input.status}`,
      entityType: "owner_profile",
      entityId: result.id,
      description: `Mengubah status pemilik menjadi ${input.status}`,
      metadata: { ownerUserId, reason: input.reason ?? null },
    });
  } catch (error) {
    console.error("[audit] gagal mencatat status owner", error);
  }

  return result;
}

export async function listAdminListings(query: {
  page: number;
  limit: number;
  q?: string;
  status?: "draft" | "pending" | "published" | "rejected" | "archived";
  owner_id?: string;
}) {
  const conditions = [];
  if (query.status) conditions.push(eq(kostListings.status, query.status));
  if (query.owner_id) {
    conditions.push(eq(kostListings.ownerId, query.owner_id));
  }
  if (query.q) {
    conditions.push(
      sql`(${kostListings.name} ILIKE ${`%${query.q}%`} OR ${kostListings.address} ILIKE ${`%${query.q}%`})`,
    );
  }
  const where = conditions.length > 0 ? and(...conditions)! : undefined;

  const items = await db
    .select({
      id: kostListings.id,
      name: kostListings.name,
      slug: kostListings.slug,
      city: kostListings.city,
      district: kostListings.district,
      status: kostListings.status,
      ownerId: kostListings.ownerId,
      ownerEmail: user.email,
      priceMin: kostListings.priceMin,
      priceMax: kostListings.priceMax,
      createdAt: kostListings.createdAt,
      deletedAt: kostListings.deletedAt,
    })
    .from(kostListings)
    .innerJoin(user, eq(kostListings.ownerId, user.id))
    .where(where)
    .orderBy(desc(kostListings.createdAt))
    .limit(query.limit)
    .offset(offsetOf(query.page, query.limit));

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(kostListings)
    .innerJoin(user, eq(kostListings.ownerId, user.id))
    .where(where);

  return {
    items,
    meta: paginationMeta(query.page, query.limit, countRow?.count ?? 0),
  };
}

export async function getAdminListingDetail(kostId: string) {
  const [listing] = await db
    .select({
      listing: kostListings,
      ownerEmail: user.email,
      ownerName: user.name,
      approvalStatus: ownerProfiles.approvalStatus,
      businessName: ownerProfiles.businessName,
    })
    .from(kostListings)
    .innerJoin(user, eq(kostListings.ownerId, user.id))
    .leftJoin(ownerProfiles, eq(ownerProfiles.userId, user.id))
    .where(eq(kostListings.id, kostId))
    .limit(1);

  if (!listing) throw new NotFoundError("Listing tidak ditemukan");

  const [photos, facilityRows, rooms] = await Promise.all([
    db
      .select()
      .from(kostPhotos)
      .where(eq(kostPhotos.kostId, kostId))
      .orderBy(desc(kostPhotos.isCover), kostPhotos.sortOrder),
    db
      .select({
        id: facilities.id,
        name: facilities.name,
        slug: facilities.slug,
      })
      .from(kostListingFacilities)
      .innerJoin(
        facilities,
        eq(kostListingFacilities.facilityId, facilities.id),
      )
      .where(eq(kostListingFacilities.kostId, kostId)),
    db
      .select()
      .from(kostRooms)
      .where(eq(kostRooms.kostId, kostId))
      .orderBy(kostRooms.roomCode),
  ]);

  return {
    ...listing.listing,
    owner: {
      id: listing.listing.ownerId,
      email: listing.ownerEmail,
      name: listing.ownerName,
      approvalStatus: listing.approvalStatus,
      businessName: listing.businessName,
    },
    photos,
    facilities: facilityRows,
    rooms,
  };
}

export async function approveListing(adminId: string, kostId: string) {
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM kost_listings WHERE id = ${kostId} FOR UPDATE`,
    );

    const [listing] = await tx
      .select({
        id: kostListings.id,
        status: kostListings.status,
        name: kostListings.name,
        ownerId: kostListings.ownerId,
        deletedAt: kostListings.deletedAt,
        approvalStatus: ownerProfiles.approvalStatus,
      })
      .from(kostListings)
      .leftJoin(ownerProfiles, eq(ownerProfiles.userId, kostListings.ownerId))
      .where(eq(kostListings.id, kostId))
      .limit(1);

    if (!listing) throw new NotFoundError("Listing tidak ditemukan");
    if (listing.deletedAt) {
      throw new ConflictError(
        "Listing sudah dihapus (soft delete) dan tidak dapat dipublikasikan.",
      );
    }
    if (listing.approvalStatus !== "approved") {
      throw new ForbiddenError(
        "Pemilik listing belum disetujui. Setujui pemilik terlebih dahulu.",
      );
    }
    if (listing.status === "published") {
      throw new ConflictError("Listing sudah published");
    }

    const [updated] = await tx
      .update(kostListings)
      .set({
        status: "published",
        verifiedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(kostListings.id, kostId))
      .returning();

    await tx.insert(notifications).values({
      recipientUserId: listing.ownerId,
      type: "listing_published",
      title: "Listing disetujui",
      message: `Listing ${listing.name} telah disetujui dan tampil di pencarian publik.`,
      relatedEntityType: "kost_listing",
      relatedEntityId: kostId,
    });

    await logAdmin(
      adminId,
      {
        action: "listing.approve",
        entityType: "kost_listing",
        entityId: kostId,
        description: `Menyetujui listing ${listing.name}`,
        before: { status: listing.status },
        after: { status: "published" },
      },
      tx,
    );

    return updated;
  });

  return result;
}

export async function rejectListing(
  adminId: string,
  kostId: string,
  reason: string,
) {
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM kost_listings WHERE id = ${kostId} FOR UPDATE`,
    );

    const [listing] = await tx
      .select({ id: kostListings.id, status: kostListings.status, name: kostListings.name, ownerId: kostListings.ownerId })
      .from(kostListings)
      .where(eq(kostListings.id, kostId))
      .limit(1);

    if (!listing) throw new NotFoundError("Listing tidak ditemukan");

    const [updated] = await tx
      .update(kostListings)
      .set({
        status: "rejected",
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(kostListings.id, kostId))
      .returning();

    await tx.insert(notifications).values({
      recipientUserId: listing.ownerId,
      type: "listing_rejected",
      title: "Listing ditolak",
      message: `Listing ${listing.name} ditolak: ${reason}`,
      relatedEntityType: "kost_listing",
      relatedEntityId: kostId,
    });

    await logAdmin(
      adminId,
      {
        action: "listing.reject",
        entityType: "kost_listing",
        entityId: kostId,
        description: `Menolak listing ${listing.name}`,
        metadata: { reason },
        before: { status: listing.status },
        after: { status: "rejected" },
      },
      tx,
    );

    return updated;
  });

  return result;
}

export async function setListingStatus(
  adminId: string,
  kostId: string,
  status: "draft" | "pending" | "published" | "rejected" | "archived",
  reason?: string,
) {
  if (status === "rejected" && (!reason || reason.trim().length < 5)) {
    throw new AppError("Alasan wajib diisi saat menolak listing", 422);
  }

  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM kost_listings WHERE id = ${kostId} FOR UPDATE`,
    );

    const [existing] = await tx
      .select({
        id: kostListings.id,
        status: kostListings.status,
        name: kostListings.name,
        ownerId: kostListings.ownerId,
        deletedAt: kostListings.deletedAt,
        approvalStatus: ownerProfiles.approvalStatus,
      })
      .from(kostListings)
      .leftJoin(ownerProfiles, eq(ownerProfiles.userId, kostListings.ownerId))
      .where(eq(kostListings.id, kostId))
      .limit(1);

    if (!existing) throw new NotFoundError("Listing tidak ditemukan");
    if (status === "published" && existing.deletedAt) {
      throw new ConflictError(
        "Listing sudah dihapus (soft delete) dan tidak dapat dipublikasikan.",
      );
    }
    if (status === "published" && existing.approvalStatus !== "approved") {
      throw new ForbiddenError(
        "Pemilik listing belum disetujui. Setujui pemilik terlebih dahulu.",
      );
    }

    const [updated] = await tx
      .update(kostListings)
      .set({
        status,
        rejectionReason: status === "rejected" ? reason : null,
        verifiedAt: status === "published" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(kostListings.id, kostId))
      .returning();

    if (status === "published") {
      await tx.insert(notifications).values({
        recipientUserId: existing.ownerId,
        type: "listing_published",
        title: "Listing dipublikasikan",
        message: `Listing ${existing.name} telah dipublikasikan oleh admin.`,
        relatedEntityType: "kost_listing",
        relatedEntityId: kostId,
      });
    } else if (status === "rejected") {
      await tx.insert(notifications).values({
        recipientUserId: existing.ownerId,
        type: "listing_rejected",
        title: "Listing ditolak",
        message: `Listing ${existing.name} ditolak: ${reason}`,
        relatedEntityType: "kost_listing",
        relatedEntityId: kostId,
      });
    }

    await logAdmin(
      adminId,
      {
        action: "listing.status",
        entityType: "kost_listing",
        entityId: kostId,
        description: `Mengubah status listing ${existing.name} menjadi ${status}`,
        metadata: { reason: reason ?? null },
        before: { status: existing.status },
        after: { status },
      },
      tx,
    );

    return updated;
  });

  return result;
}

export async function revokeUserSessions(adminId: string, userId: string) {
  const [targetUser] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!targetUser) throw new NotFoundError("Pengguna tidak ditemukan");

  const deleted = await db
    .delete(session)
    .where(eq(session.userId, userId))
    .returning();

  await logAdmin(adminId, {
    action: "user.revoke_sessions",
    entityType: "user",
    entityId: userId,
    description: `Admin mencabut ${deleted.length} sesi aktif pengguna ${targetUser.email}`,
    metadata: { sessionCount: deleted.length },
  });

  return { revokedCount: deleted.length };
}

export async function listAdminLogs(query: {
  page: number;
  limit: number;
  admin_id?: string;
  entity_type?: string;
  action?: string;
}) {
  const conditions = [];
  if (query.admin_id) conditions.push(eq(adminLogs.adminId, query.admin_id));
  if (query.entity_type) {
    conditions.push(eq(adminLogs.entityType, query.entity_type));
  }
  if (query.action) {
    conditions.push(ilike(adminLogs.action, `%${query.action}%`));
  }
  const where = conditions.length > 0 ? and(...conditions)! : undefined;

  const items = await db
    .select({
      id: adminLogs.id,
      adminId: adminLogs.adminId,
      adminEmail: user.email,
      action: adminLogs.action,
      entityType: adminLogs.entityType,
      entityId: adminLogs.entityId,
      description: adminLogs.description,
      metadata: adminLogs.metadata,
      createdAt: adminLogs.createdAt,
    })
    .from(adminLogs)
    .leftJoin(user, eq(adminLogs.adminId, user.id))
    .where(where)
    .orderBy(desc(adminLogs.createdAt))
    .limit(query.limit)
    .offset(offsetOf(query.page, query.limit));

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(adminLogs)
    .where(where);

  return {
    items,
    meta: paginationMeta(query.page, query.limit, countRow?.count ?? 0),
  };
}
