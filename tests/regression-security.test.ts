import { describe, expect, it } from "vitest";
import { createTestUser } from "./helpers/auth";
import { readJson, request } from "./helpers/http";
import { GET as getListing, PATCH as patchListing } from "@/app/api/owner/listings/[id]/route";
import { POST as createListing } from "@/app/api/owner/listings/route";
import { POST as createRoom } from "@/app/api/owner/listings/[id]/rooms/route";
import {
  GET as getOccupancies,
  POST as createOccupancy,
} from "@/app/api/owner/rooms/[roomId]/occupancies/route";
import { POST as verifyReview } from "@/app/api/owner/reviews/[reviewId]/verify/route";
import { POST as authPost } from "@/app/api/auth/[...all]/route";
import { GET as publicKost } from "@/app/api/public/kost/route";
import { POST as submitReview } from "@/app/api/public/reviews/route";
import { db } from "@/lib/db";
import { user, reviews, kostRooms } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const sampleListing = (name: string) => ({
  name,
  description: "Deskripsi kost pengujian kuota listing minimal dua puluh karakter.",
  address: "Jl. Veteran No. 10",
  province: "Jawa Timur",
  city: "Kota Malang",
  district: "Lowokwaru",
  subdistrict: "Ketawanggede",
  postal_code: "65145",
  latitude: -7.952,
  longitude: 112.614,
  gender_policy: "mixed" as const,
  price_min: 1500000,
  price_max: 2000000,
  contact_phone: "6281234567890",
});

describe("P8: Regression Security Suite", () => {
  it("IDOR: owner A tidak bisa mengakses kost, kamar, hunian, dan review milik owner B (404)", async () => {
    const ownerA = await createTestUser("owner", "idor-owner-a");
    const ownerB = await createTestUser("owner", "idor-owner-b");

    // Owner A creates a listing
    const listRes = await createListing(
      request("/api/owner/listings", {
        method: "POST",
        cookie: ownerA.cookie,
        body: sampleListing("Kost Milik Owner A"),
      }),
    );
    expect(listRes.status).toBe(201);
    const listData = (await readJson(listRes)).data;
    const kostId = listData.id;

    // Owner A creates a room
    const roomRes = await createRoom(
      request(`/api/owner/listings/${kostId}/rooms`, {
        method: "POST",
        cookie: ownerA.cookie,
        body: {
          room_code: "A-01",
          monthly_price: 1500000,
        },
      }),
      { params: Promise.resolve({ id: kostId }) },
    );
    expect(roomRes.status).toBe(201);
    const roomId = (await readJson(roomRes)).data.id;

    // Owner A creates an occupancy
    const occRes = await createOccupancy(
      request(`/api/owner/rooms/${roomId}/occupancies`, {
        method: "POST",
        cookie: ownerA.cookie,
        body: {
          tenant_name: "Budi Santoso",
          check_in_date: "2026-01-01",
          occupancy_status: "active",
        },
      }),
      { params: Promise.resolve({ roomId }) },
    );
    expect(occRes.status).toBe(201);

    // 1. Owner B attempts GET owner A's listing -> 404
    const getRes = await getListing(
      request(`/api/owner/listings/${kostId}`, { cookie: ownerB.cookie }),
      { params: Promise.resolve({ id: kostId }) },
    );
    expect(getRes.status).toBe(404);

    // 2. Owner B attempts PATCH owner A's listing -> 404
    const patchRes = await patchListing(
      request(`/api/owner/listings/${kostId}`, {
        method: "PATCH",
        cookie: ownerB.cookie,
        body: { name: "Hacked by Owner B" },
      }),
      { params: Promise.resolve({ id: kostId }) },
    );
    expect(patchRes.status).toBe(404);

    // 3. Owner B attempts POST room into owner A's listing -> 404
    const addRoomRes = await createRoom(
      request(`/api/owner/listings/${kostId}/rooms`, {
        method: "POST",
        cookie: ownerB.cookie,
        body: { room_code: "B-HACK", monthly_price: 1000000 },
      }),
      { params: Promise.resolve({ id: kostId }) },
    );
    expect(addRoomRes.status).toBe(404);

    // 4. Owner B attempts GET occupancies of owner A's room -> 404
    const occListRes = await getOccupancies(
      request(`/api/owner/rooms/${roomId}/occupancies`, {
        cookie: ownerB.cookie,
      }),
      { params: Promise.resolve({ roomId }) },
    );
    expect(occListRes.status).toBe(404);

    // 5. Owner B attempts to verify review of owner A's kost -> 404
    const [review] = await db
      .insert(reviews)
      .values({
        kostId,
        roomId,
        reviewerName: "Penyewa Budi",
        claimedCheckInDate: "2026-01-01",
        rating: 5,
        comment: "Kost sangat nyaman sekali.",
        publicationStatus: "pending",
        verificationStatus: "unmatched",
      })
      .returning();

    const verifyRes = await verifyReview(
      request(`/api/owner/reviews/${review!.id}/verify`, {
        method: "POST",
        cookie: ownerB.cookie,
        body: {},
      }),
      { params: Promise.resolve({ reviewId: review!.id }) },
    );
    expect(verifyRes.status).toBe(404);
  });

  it("Mass assignment: role pada sign-up diabaikan dan .strict() menolak field asing", async () => {
    const signupEmail = `mass-assign-${Date.now()}@example.com`;

    // Attempt to register with role: 'admin'
    const signupRes = await authPost(
      request("/api/auth/sign-up/email", {
        method: "POST",
        body: {
          email: signupEmail,
          password: "StrongPassword123!",
          name: "Attacker User",
          role: "admin",
        },
      }),
    );
    expect([200, 201]).toContain(signupRes.status);

    const [userRow] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.email, signupEmail))
      .limit(1);

    expect(userRow?.role).toBe("owner");

    // .strict() rejects unknown fields with 422
    const owner = await createTestUser("owner", "strict-test");
    const strictRes = await createListing(
      request("/api/owner/listings", {
        method: "POST",
        cookie: owner.cookie,
        body: {
          ...sampleListing("Kost Strict Test"),
          unknown_field_attack: true,
        },
      }),
    );
    expect(strictRes.status).toBe(422);
  });

  it("Review: nama tak cocok tanpa alasan override ditolak; owner tidak bisa mengubah review yang sudah dimoderasi admin", async () => {
    const owner = await createTestUser("owner", "rev-moderation-owner");
    const admin = await createTestUser("admin", "rev-moderation-admin");

    const listRes = await createListing(
      request("/api/owner/listings", {
        method: "POST",
        cookie: owner.cookie,
        body: sampleListing("Kost Verifikasi Review"),
      }),
    );
    const kostId = (await readJson(listRes)).data.id;

    const [room] = await db
      .insert(kostRooms)
      .values({ kostId, roomCode: "R-10", monthlyPrice: "1500000" })
      .returning();

    const occRes = await createOccupancy(
      request(`/api/owner/rooms/${room!.id}/occupancies`, {
        method: "POST",
        cookie: owner.cookie,
        body: {
          tenant_name: "Ahmad Dahlan",
          check_in_date: "2026-01-01",
          occupancy_status: "active",
        },
      }),
      { params: Promise.resolve({ roomId: room!.id }) },
    );
    const occId = (await readJson(occRes)).data.id;

    // Reviewer name does not match tenant name
    const [review] = await db
      .insert(reviews)
      .values({
        kostId,
        roomId: room!.id,
        reviewerName: "Bambang Pamungkas",
        claimedCheckInDate: "2026-01-01",
        rating: 5,
        comment: "Fasilitas lengkap dan air lancar.",
        publicationStatus: "pending",
        verificationStatus: "unmatched",
      })
      .returning();

    // 1. Without override_reason -> 422
    const noReasonVerify = await verifyReview(
      request(`/api/owner/reviews/${review!.id}/verify`, {
        method: "POST",
        cookie: owner.cookie,
        body: { occupancy_id: occId },
      }),
      { params: Promise.resolve({ reviewId: review!.id }) },
    );
    expect(noReasonVerify.status).toBe(422);

    // 2. With too short override_reason -> 422
    const shortReasonVerify = await verifyReview(
      request(`/api/owner/reviews/${review!.id}/verify`, {
        method: "POST",
        cookie: owner.cookie,
        body: { occupancy_id: occId, override_reason: "Terlalu pendek" },
      }),
      { params: Promise.resolve({ reviewId: review!.id }) },
    );
    expect(shortReasonVerify.status).toBe(422);

    // 3. Admin moderates the review
    await db
      .update(reviews)
      .set({
        moderatedBy: admin.id,
        moderatedAt: new Date(),
        publicationStatus: "published",
        verificationStatus: "verified",
      })
      .where(eq(reviews.id, review!.id));

    // 4. Owner cannot modify or verify an admin-moderated review -> 403 Forbidden
    const ownerModifyRes = await verifyReview(
      request(`/api/owner/reviews/${review!.id}/verify`, {
        method: "POST",
        cookie: owner.cookie,
        body: { occupancy_id: occId },
      }),
      { params: Promise.resolve({ reviewId: review!.id }) },
    );
    expect(ownerModifyRes.status).toBe(403);
  });

  it("Input jahat pada q, city, district tidak memicu 500", async () => {
    // 1. Special SQL wildcards and escapes: %, _, \
    const resWildcards = await publicKost(
      request("/api/public/kost?q=%&city=_&district=\\"),
    );
    expect(resWildcards.status).toBe(200);

    // 2. Unicode characters and emojis
    const resUnicode = await publicKost(
      request("/api/public/kost?q=🚀🔥𠜎&city=Malang"),
    );
    expect(resUnicode.status).toBe(200);

    // 3. 10KB string in search query rejected by schema with 422, not 500
    const hugeStr = "A".repeat(10_000);
    const resHuge = await publicKost(
      request(`/api/public/kost?q=${hugeStr}`),
    );
    expect(resHuge.status).toBe(422);
  });

  it("Tanggal tidak valid (2026-02-30, 0000-00-00) menghasilkan 422, bukan 500", async () => {
    const owner = await createTestUser("owner", "invalid-date-owner");
    const listRes = await createListing(
      request("/api/owner/listings", {
        method: "POST",
        cookie: owner.cookie,
        body: sampleListing("Kost Uji Tanggal"),
      }),
    );
    const kostId = (await readJson(listRes)).data.id;

    const [room] = await db
      .insert(kostRooms)
      .values({ kostId, roomCode: "D-01", monthlyPrice: "1500000" })
      .returning();

    // 1. Leap-year overflow date (Feb 30th)
    const resFeb30 = await createOccupancy(
      request(`/api/owner/rooms/${room!.id}/occupancies`, {
        method: "POST",
        cookie: owner.cookie,
        body: {
          tenant_name: "Penyewa Tanggal Salah",
          check_in_date: "2026-02-30",
          occupancy_status: "active",
        },
      }),
      { params: Promise.resolve({ roomId: room!.id }) },
    );
    expect(resFeb30.status).toBe(422);

    // 2. Zero date (0000-00-00)
    const resZeroDate = await createOccupancy(
      request(`/api/owner/rooms/${room!.id}/occupancies`, {
        method: "POST",
        cookie: owner.cookie,
        body: {
          tenant_name: "Penyewa Tanggal Nol",
          check_in_date: "0000-00-00",
          occupancy_status: "active",
        },
      }),
      { params: Promise.resolve({ roomId: room!.id }) },
    );
    expect(resZeroDate.status).toBe(422);

    // 3. Review submission with invalid date (2026-02-30) -> 422
    const reviewInvalidDate = await submitReview(
      request("/api/public/reviews", {
        method: "POST",
        body: {
          qr_token: "any-qr-token-value",
          reviewer_name: "Tester",
          claimed_check_in_date: "2026-02-30",
          rating: 5,
          comment: "Review pengujian tanggal tidak valid.",
          turnstile_token: "test-bypass",
        },
      }),
    );
    expect(reviewInvalidDate.status).toBe(422);
  });
});
