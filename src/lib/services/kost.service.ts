import { and, desc, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  facilities,
  kostListingFacilities,
  kostListings,
  kostPhotos,
  kostRooms,
  ownerProfiles,
  ownerSubscriptions,
  reviews,
  subscriptionPlans,
  user,
} from "@/lib/db/schema";
import type {
  KostCreateInput,
  KostUpdateInput,
  PublicKostQuery,
} from "@/lib/validators/kost.schema";
import {
  AppError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/utils/api-error";
import { offsetOf, paginationMeta } from "@/lib/utils/pagination";
import { slugWithSuffix, slugify } from "@/lib/utils/slug";
import { getOwnedKost } from "@/lib/security/authorization";
import { assertOwnerCanPublish } from "./owner.service";
import { notifyAdmins } from "./notification.service";

const coverUrlSql = sql<string | null>`(
  SELECT p.image_url FROM kost_photos p
  WHERE p.kost_id = ${kostListings.id}
  ORDER BY p.is_cover DESC, p.sort_order ASC, p.created_at ASC
  LIMIT 1
)`;

const ratingAvgSql = sql<number>`(
  SELECT COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0)::float8
  FROM reviews r
  WHERE r.kost_id = ${kostListings.id} AND r.publication_status = 'published'
)`;

const reviewCountSql = sql<number>`(
  SELECT COUNT(*)::int FROM reviews r
  WHERE r.kost_id = ${kostListings.id} AND r.publication_status = 'published'
)`;

const roomCountSql = sql<number>`(
  SELECT COUNT(*)::int FROM kost_rooms kr WHERE kr.kost_id = ${kostListings.id}
)`;

const availableRoomCountSql = sql<number>`(
  SELECT COUNT(*)::int FROM kost_rooms kr
  WHERE kr.kost_id = ${kostListings.id} AND kr.room_status = 'available'
)`;

const listingCardSelect = {
  id: kostListings.id,
  name: kostListings.name,
  slug: kostListings.slug,
  description: kostListings.description,
  address: kostListings.address,
  province: kostListings.province,
  city: kostListings.city,
  district: kostListings.district,
  subdistrict: kostListings.subdistrict,
  postalCode: kostListings.postalCode,
  latitude: kostListings.latitude,
  longitude: kostListings.longitude,
  genderPolicy: kostListings.genderPolicy,
  priceMin: kostListings.priceMin,
  priceMax: kostListings.priceMax,
  contactPhone: kostListings.contactPhone,
  status: kostListings.status,
  verifiedAt: kostListings.verifiedAt,
  createdAt: kostListings.createdAt,
  coverImageUrl: coverUrlSql,
  ratingAvg: ratingAvgSql,
  reviewCount: reviewCountSql,
  roomCount: roomCountSql,
  availableRoomCount: availableRoomCountSql,
};

function escapeIlike(val: string): string {
  return val.replace(/([%_\\])/g, "\\$1");
}

function publicConditions(query: PublicKostQuery) {
  const conditions = [
    eq(kostListings.status, "published"),
    isNull(kostListings.deletedAt),
  ];

  if (query.q) {
    const pattern = `%${escapeIlike(query.q)}%`;
    conditions.push(
      or(
        ilike(kostListings.name, pattern),
        ilike(kostListings.address, pattern),
      )!,
    );
  }
  if (query.city) conditions.push(ilike(kostListings.city, escapeIlike(query.city)));
  if (query.district) {
    conditions.push(ilike(kostListings.district, escapeIlike(query.district)));
  }
  if (query.gender_policy) {
    conditions.push(eq(kostListings.genderPolicy, query.gender_policy));
  }
  if (query.price_min !== undefined) {
    conditions.push(sql`${kostListings.priceMax} >= ${query.price_min}`);
  }
  if (query.price_max !== undefined) {
    conditions.push(sql`${kostListings.priceMin} <= ${query.price_max}`);
  }
  for (const facilityId of query.facility ?? []) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM kost_listing_facilities klf
      WHERE klf.kost_id = ${kostListings.id}
        AND klf.facility_id = ${facilityId}::uuid
    )`);
  }
  if (query.available) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM kost_rooms kr
      WHERE kr.kost_id = ${kostListings.id}
        AND kr.room_status = 'available'
    )`);
  }
  if (query.latitude !== undefined && query.longitude !== undefined) {
    const radius = query.radius ?? 5_000;
    conditions.push(sql`ST_DWithin(
      ${kostListings.location},
      ST_SetSRID(ST_MakePoint(${query.longitude}, ${query.latitude}), 4326)::geography,
      ${radius}
    )`);
  }

  return and(...conditions)!;
}

export async function searchPublicKost(query: PublicKostQuery) {
  const where = publicConditions(query);
  const offset = offsetOf(query.page, query.limit);

  let orderBy;
  switch (query.sort) {
    case "price_asc":
      orderBy = [kostListings.priceMin, desc(kostListings.createdAt)];
      break;
    case "price_desc":
      orderBy = [desc(kostListings.priceMax), desc(kostListings.createdAt)];
      break;
    case "distance":
      orderBy = [
        sql`ST_Distance(
          ${kostListings.location},
          ST_SetSRID(ST_MakePoint(${query.longitude}, ${query.latitude}), 4326)::geography
        ) ASC`,
      ];
      break;
    default:
      orderBy = [desc(kostListings.createdAt)];
  }

  const selectFields =
    query.latitude !== undefined && query.longitude !== undefined
      ? {
          ...listingCardSelect,
          distanceMeters: sql<number>`ST_Distance(
            ${kostListings.location},
            ST_SetSRID(ST_MakePoint(${query.longitude}, ${query.latitude}), 4326)::geography
          )::float8`,
        }
      : listingCardSelect;

  const rows = await db
    .select(selectFields)
    .from(kostListings)
    .where(where)
    .orderBy(...orderBy)
    .limit(query.limit)
    .offset(offset);

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(kostListings)
    .where(where);

  return {
    items: rows,
    meta: paginationMeta(query.page, query.limit, countRow?.count ?? 0),
  };
}

export async function getPublicKostBySlug(slug: string) {
  const [row] = await db
    .select({
      ...listingCardSelect,
      ownerBusinessName: ownerProfiles.businessName,
    })
    .from(kostListings)
    .leftJoin(
      ownerProfiles,
      eq(ownerProfiles.userId, kostListings.ownerId),
    )
    .where(
      and(
        eq(kostListings.slug, slug),
        eq(kostListings.status, "published"),
        isNull(kostListings.deletedAt),
      ),
    )
    .limit(1);

  if (!row) throw new NotFoundError("Kost tidak ditemukan");

  const [photos, facilityRows, roomRows, roomReviewRows, latestReviews] =
    await Promise.all([
      db
        .select({
          id: kostPhotos.id,
          imageUrl: kostPhotos.imageUrl,
          altText: kostPhotos.altText,
          sortOrder: kostPhotos.sortOrder,
          isCover: kostPhotos.isCover,
        })
        .from(kostPhotos)
        .where(eq(kostPhotos.kostId, row.id))
        .orderBy(
          desc(kostPhotos.isCover),
          kostPhotos.sortOrder,
          kostPhotos.createdAt,
        ),
      db
        .select({
          id: facilities.id,
          name: facilities.name,
          slug: facilities.slug,
          icon: facilities.icon,
        })
        .from(kostListingFacilities)
        .innerJoin(
          facilities,
          eq(kostListingFacilities.facilityId, facilities.id),
        )
        .where(eq(kostListingFacilities.kostId, row.id))
        .orderBy(facilities.name),
      db
        .select({
          id: kostRooms.id,
          roomCode: kostRooms.roomCode,
          roomName: kostRooms.roomName,
          description: kostRooms.description,
          monthlyPrice: kostRooms.monthlyPrice,
          roomStatus: kostRooms.roomStatus,
        })
        .from(kostRooms)
        .where(eq(kostRooms.kostId, row.id))
        .orderBy(kostRooms.roomCode),
      db
        .select({
          roomId: reviews.roomId,
          roomCode: kostRooms.roomCode,
          roomName: kostRooms.roomName,
          ratingAvg: sql<number>`COALESCE(ROUND(AVG(${reviews.rating})::numeric, 2), 0)::float8`,
          reviewCount: sql<number>`COUNT(*)::int`,
        })
        .from(reviews)
        .innerJoin(kostRooms, eq(reviews.roomId, kostRooms.id))
        .where(
          and(
            eq(reviews.kostId, row.id),
            eq(reviews.publicationStatus, "published"),
          ),
        )
        .groupBy(reviews.roomId, kostRooms.roomCode, kostRooms.roomName)
        .orderBy(kostRooms.roomCode),
      db
        .select({
          id: reviews.id,
          publicDisplayName: reviews.publicDisplayName,
          reviewerName: reviews.reviewerName,
          rating: reviews.rating,
          comment: reviews.comment,
          roomCode: kostRooms.roomCode,
          createdAt: reviews.createdAt,
        })
        .from(reviews)
        .innerJoin(kostRooms, eq(reviews.roomId, kostRooms.id))
        .where(
          and(
            eq(reviews.kostId, row.id),
            eq(reviews.publicationStatus, "published"),
          ),
        )
        .orderBy(desc(reviews.createdAt))
        .limit(5),
    ]);

  const { ownerBusinessName, ...listing } = row;

  return {
    ...listing,
    owner: { businessName: ownerBusinessName ?? null },
    photos,
    facilities: facilityRows,
    rooms: roomRows,
    reviewSummary: {
      ratingAvg: row.ratingAvg,
      reviewCount: row.reviewCount,
      byRoom: roomReviewRows,
    },
    latestReviews: latestReviews.map((review) => ({
      id: review.id,
      publicDisplayName:
        review.publicDisplayName ??
        review.reviewerName.split(/\s+/)[0] ??
        "Penghuni",
      rating: review.rating,
      comment: review.comment,
      roomCode: review.roomCode,
      createdAt: review.createdAt,
    })),
  };
}

export async function getPublicRooms(slug: string) {
  const [listing] = await db
    .select({ id: kostListings.id })
    .from(kostListings)
    .where(
      and(
        eq(kostListings.slug, slug),
        eq(kostListings.status, "published"),
        isNull(kostListings.deletedAt),
      ),
    )
    .limit(1);

  if (!listing) throw new NotFoundError("Kost tidak ditemukan");

  return db
    .select({
      id: kostRooms.id,
      roomCode: kostRooms.roomCode,
      roomName: kostRooms.roomName,
      description: kostRooms.description,
      monthlyPrice: kostRooms.monthlyPrice,
      roomStatus: kostRooms.roomStatus,
    })
    .from(kostRooms)
    .where(eq(kostRooms.kostId, listing.id))
    .orderBy(kostRooms.roomCode);
}

export async function getPublicReviews(
  slug: string,
  options: { page: number; limit: number; roomId?: string },
) {
  const [listing] = await db
    .select({ id: kostListings.id })
    .from(kostListings)
    .where(
      and(
        eq(kostListings.slug, slug),
        eq(kostListings.status, "published"),
        isNull(kostListings.deletedAt),
      ),
    )
    .limit(1);

  if (!listing) throw new NotFoundError("Kost tidak ditemukan");

  const conditions = [
    eq(reviews.kostId, listing.id),
    eq(reviews.publicationStatus, "published"),
  ];
  if (options.roomId) conditions.push(eq(reviews.roomId, options.roomId));

  const where = and(...conditions)!;

  const items = await db
    .select({
      id: reviews.id,
      publicDisplayName: reviews.publicDisplayName,
      reviewerName: reviews.reviewerName,
      rating: reviews.rating,
      comment: reviews.comment,
      roomId: reviews.roomId,
      roomCode: kostRooms.roomCode,
      roomName: kostRooms.roomName,
      ownerReply: reviews.ownerReply,
      ownerRepliedAt: reviews.ownerRepliedAt,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(kostRooms, eq(reviews.roomId, kostRooms.id))
    .where(where)
    .orderBy(desc(reviews.createdAt))
    .limit(options.limit)
    .offset(offsetOf(options.page, options.limit));

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(reviews)
    .where(where);

  return {
    items: items.map((review) => ({
      id: review.id,
      publicDisplayName:
        review.publicDisplayName ??
        review.reviewerName.split(/\s+/)[0] ??
        "Penghuni",
      rating: review.rating,
      comment: review.comment,
      room: {
        id: review.roomId,
        roomCode: review.roomCode,
        roomName: review.roomName,
      },
      ownerReply: review.ownerReply,
      ownerRepliedAt: review.ownerRepliedAt,
      createdAt: review.createdAt,
    })),
    meta: paginationMeta(
      options.page,
      options.limit,
      countRow?.count ?? 0,
    ),
  };
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate =
      attempt === 0
        ? base
        : slugWithSuffix(base, Math.random().toString(36).slice(2, 7));
    const [existing] = await db
      .select({ id: kostListings.id })
      .from(kostListings)
      .where(eq(kostListings.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  return slugWithSuffix(base, Date.now().toString(36));
}

async function replaceFacilities(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  kostId: string,
  facilityIds: string[],
) {
  const unique = [...new Set(facilityIds)];
  await tx
    .delete(kostListingFacilities)
    .where(eq(kostListingFacilities.kostId, kostId));
  if (unique.length === 0) return;

  const found = await tx
    .select({ id: facilities.id })
    .from(facilities)
    .where(inArray(facilities.id, unique));
  if (found.length !== unique.length) {
    throw new AppError("Ada fasilitas yang tidak dikenal", 422);
  }

  await tx.insert(kostListingFacilities).values(
    unique.map((facilityId) => ({ kostId, facilityId })),
  );
}

export const FREE_MAX_LISTINGS = 1;

export async function createOwnerListing(
  ownerId: string,
  input: KostCreateInput,
) {
  const slug = await uniqueSlug(input.name);

  const created = await db.transaction(async (tx) => {
    // Transaction-level advisory lock per owner to prevent race conditions during concurrent creates
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${ownerId}))`);

    const [activeSub] = await tx
      .select({
        subscription: ownerSubscriptions,
        plan: subscriptionPlans,
      })
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

    // If no active subscription, enforce default free tier quota (FREE_MAX_LISTINGS = 1)
    const maxListings = activeSub?.plan.maxListings ?? FREE_MAX_LISTINGS;

    if (maxListings !== null) {
      // Archived listings are explicitly excluded from quota consumption
      const [existingCount] = await tx
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(kostListings)
        .where(
          and(
            eq(kostListings.ownerId, ownerId),
            isNull(kostListings.deletedAt),
            ne(kostListings.status, "archived"),
          ),
        );

      if ((existingCount?.count ?? 0) >= maxListings) {
        throw new ForbiddenError(
          `Batas kuota listing paket Anda (${maxListings}) telah tercapai. Tingkatkan paket langganan untuk menambah listing.`,
        );
      }
    }

    const [listing] = await tx
      .insert(kostListings)
      .values({
        ownerId,
        name: input.name,
        slug,
        description: input.description,
        address: input.address,
        province: input.province,
        city: input.city,
        district: input.district,
        subdistrict: input.subdistrict,
        postalCode: input.postal_code,
        latitude: input.latitude.toFixed(6),
        longitude: input.longitude.toFixed(6),
        genderPolicy: input.gender_policy,
        priceMin: input.price_min,
        priceMax: input.price_max,
        contactPhone: input.contact_phone,
        status: "draft",
      })
      .returning({ id: kostListings.id });

    if (!listing) throw new AppError("Gagal membuat listing", 500);

    if (input.facility_ids) {
      await replaceFacilities(tx, listing.id, input.facility_ids);
    }
    return listing;
  });

  return getOwnerListing(ownerId, created.id);
}

export async function updateOwnerListing(
  ownerId: string,
  kostId: string,
  input: KostUpdateInput,
) {
  const existing = await getOwnedKost(ownerId, kostId);

  if (input.status === "pending") {
    await assertOwnerCanPublish(ownerId);
  }

  if (
    existing.status === "published" &&
    input.status !== undefined &&
    input.status !== "archived"
  ) {
    throw new AppError(
      "Listing published hanya dapat diarsipkan. Perubahan status lain dilakukan admin.",
      409,
    );
  }

  const updates: Partial<typeof kostListings.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.address !== undefined) updates.address = input.address;
  if (input.province !== undefined) updates.province = input.province;
  if (input.city !== undefined) updates.city = input.city;
  if (input.district !== undefined) updates.district = input.district;
  if (input.subdistrict !== undefined) {
    updates.subdistrict = input.subdistrict;
  }
  if (input.postal_code !== undefined) updates.postalCode = input.postal_code;
  if (input.latitude !== undefined) {
    updates.latitude = input.latitude.toFixed(6);
  }
  if (input.longitude !== undefined) {
    updates.longitude = input.longitude.toFixed(6);
  }
  if (input.gender_policy !== undefined) {
    updates.genderPolicy = input.gender_policy;
  }
  if (input.price_min !== undefined) updates.priceMin = input.price_min;
  if (input.price_max !== undefined) updates.priceMax = input.price_max;
  if (input.contact_phone !== undefined) {
    updates.contactPhone = input.contact_phone;
  }
  if (input.status !== undefined) updates.status = input.status;

  const sensitiveChanged =
    (input.name !== undefined && input.name !== existing.name) ||
    (input.description !== undefined && input.description !== existing.description) ||
    (input.address !== undefined && input.address !== existing.address) ||
    (input.latitude !== undefined && input.latitude.toFixed(6) !== existing.latitude) ||
    (input.longitude !== undefined && input.longitude.toFixed(6) !== existing.longitude) ||
    (input.contact_phone !== undefined && input.contact_phone !== existing.contactPhone);

  let revertedToPending = false;
  if (
    existing.status === "published" &&
    sensitiveChanged &&
    input.status !== "archived"
  ) {
    updates.status = "pending";
    updates.verifiedAt = null;
    revertedToPending = true;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(kostListings)
      .set(updates)
      .where(
        and(
          eq(kostListings.id, kostId),
          eq(kostListings.ownerId, ownerId),
        ),
      );

    if (input.facility_ids !== undefined) {
      await replaceFacilities(tx, kostId, input.facility_ids);
    }
  });

  if (revertedToPending) {
    await notifyAdmins({
      type: "listing_pending",
      title: "Perubahan informasi listing published",
      message: `Listing ${existing.name} diubah oleh pemilik pada informasi sensitif dan memerlukan verifikasi ulang.`,
      relatedEntityType: "kost_listing",
      relatedEntityId: kostId,
    });
  }

  return getOwnerListing(ownerId, kostId);
}

export async function softDeleteOwnerListing(
  ownerId: string,
  kostId: string,
) {
  await getOwnedKost(ownerId, kostId);
  await db
    .update(kostListings)
    .set({
      deletedAt: new Date(),
      status: "archived",
      updatedAt: new Date(),
    })
    .where(
      and(eq(kostListings.id, kostId), eq(kostListings.ownerId, ownerId)),
    );
}

export async function getOwnerListing(ownerId: string, kostId: string) {
  const listing = await getOwnedKost(ownerId, kostId);

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
      .where(eq(kostListingFacilities.kostId, kostId))
      .orderBy(facilities.name),
    db
      .select({
        id: kostRooms.id,
        roomCode: kostRooms.roomCode,
        roomName: kostRooms.roomName,
        monthlyPrice: kostRooms.monthlyPrice,
        roomStatus: kostRooms.roomStatus,
        qrEnabled: kostRooms.qrEnabled,
      })
      .from(kostRooms)
      .where(eq(kostRooms.kostId, kostId))
      .orderBy(kostRooms.roomCode),
  ]);

  return {
    id: listing.id,
    ownerId: listing.ownerId,
    name: listing.name,
    slug: listing.slug,
    description: listing.description,
    address: listing.address,
    province: listing.province,
    city: listing.city,
    district: listing.district,
    subdistrict: listing.subdistrict,
    postalCode: listing.postalCode,
    latitude: listing.latitude,
    longitude: listing.longitude,
    genderPolicy: listing.genderPolicy,
    priceMin: listing.priceMin,
    priceMax: listing.priceMax,
    contactPhone: listing.contactPhone,
    status: listing.status,
    rejectionReason: listing.rejectionReason,
    verifiedAt: listing.verifiedAt,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    photos,
    facilities: facilityRows,
    rooms,
  };
}

export async function listOwnerListings(
  ownerId: string,
  query: {
    page: number;
    limit: number;
    status?: "draft" | "pending" | "published" | "rejected" | "archived";
    q?: string;
  },
) {
  const conditions = [
    eq(kostListings.ownerId, ownerId),
    isNull(kostListings.deletedAt),
  ];
  if (query.status) conditions.push(eq(kostListings.status, query.status));
  if (query.q) conditions.push(ilike(kostListings.name, `%${query.q}%`));

  const where = and(...conditions)!;

  const items = await db
    .select(listingCardSelect)
    .from(kostListings)
    .where(where)
    .orderBy(desc(kostListings.createdAt))
    .limit(query.limit)
    .offset(offsetOf(query.page, query.limit));

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(kostListings)
    .where(where);

  return {
    items,
    meta: paginationMeta(query.page, query.limit, countRow?.count ?? 0),
  };
}

export async function listOwnerListingFacilities(
  ownerId: string,
  kostId: string,
) {
  await getOwnedKost(ownerId, kostId);
  return db
    .select({
      id: facilities.id,
      name: facilities.name,
      slug: facilities.slug,
      icon: facilities.icon,
    })
    .from(kostListingFacilities)
    .innerJoin(
      facilities,
      eq(kostListingFacilities.facilityId, facilities.id),
    )
    .where(eq(kostListingFacilities.kostId, kostId))
    .orderBy(facilities.name);
}

export async function setOwnerListingFacilities(
  ownerId: string,
  kostId: string,
  facilityIds: string[],
) {
  await getOwnedKost(ownerId, kostId);
  await db.transaction(async (tx) => {
    await replaceFacilities(tx, kostId, facilityIds);
  });
  return listOwnerListingFacilities(ownerId, kostId);
}

export async function listFacilityCatalog() {
  return db
    .select({
      id: facilities.id,
      name: facilities.name,
      slug: facilities.slug,
      icon: facilities.icon,
    })
    .from(facilities)
    .orderBy(facilities.name);
}

export async function getPublicReviewFormByToken(token: string) {
  const [row] = await db
    .select({
      roomId: kostRooms.id,
      roomCode: kostRooms.roomCode,
      roomName: kostRooms.roomName,
      kostId: kostListings.id,
      kostName: kostListings.name,
      kostSlug: kostListings.slug,
      address: kostListings.address,
      district: kostListings.district,
      city: kostListings.city,
      qrEnabled: kostRooms.qrEnabled,
    })
    .from(kostRooms)
    .innerJoin(kostListings, eq(kostRooms.kostId, kostListings.id))
    .where(eq(kostRooms.qrPublicToken, token))
    .limit(1);

  if (!row || !row.qrEnabled) {
    throw new NotFoundError("QR tidak valid atau sudah dinonaktifkan");
  }

  const [listing] = await db
    .select({ status: kostListings.status, deletedAt: kostListings.deletedAt })
    .from(kostListings)
    .where(eq(kostListings.id, row.kostId))
    .limit(1);

  if (!listing || listing.status !== "published" || listing.deletedAt) {
    throw new AppError("Kost ini sedang tidak menerima review", 409);
  }

  return {
    kost: {
      name: row.kostName,
      slug: row.kostSlug,
      address: row.address,
      district: row.district,
      city: row.city,
    },
    room: {
      roomCode: row.roomCode,
      roomName: row.roomName,
    },
    form: {
      rating_min: 1,
      rating_max: 5,
      turnstile_site_key: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null,
    },
  };
}
