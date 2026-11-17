import { describe, expect, it, vi } from "vitest";
import { createTestUser } from "./helpers/auth";
import { readJson, request } from "./helpers/http";
import { POST as createListing } from "@/app/api/owner/listings/route";
import { POST as confirmPhoto } from "@/app/api/owner/listings/[id]/photos/confirm/route";
import { POST as overrideOwnerReject } from "@/app/api/admin/reviews/[id]/override-owner-reject/route";
import { db } from "@/lib/db";
import { reviews, kostRooms } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import * as r2 from "@/lib/storage/r2";
import { MAX_PHOTOS_PER_LISTING } from "@/lib/services/photo.service";

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

describe("P3: Quota max_listings enforcement and race condition locking", () => {
  it("owner tanpa langganan tidak bisa membuat listing melebihi batas default (FREE_MAX_LISTINGS = 1)", async () => {
    const owner = await createTestUser("owner", "quota-test");

    // 1st listing should succeed
    const res1 = await createListing(
      request("/api/owner/listings", {
        method: "POST",
        cookie: owner.cookie,
        body: sampleListing("Kost Gratis 1"),
      }),
    );
    expect(res1.status).toBe(201);

    // 2nd listing without active subscription should be blocked with 403 Forbidden
    const res2 = await createListing(
      request("/api/owner/listings", {
        method: "POST",
        cookie: owner.cookie,
        body: sampleListing("Kost Gratis 2"),
      }),
    );
    expect(res2.status).toBe(403);
    const body2 = await readJson(res2);
    expect(body2.message).toMatch(/Batas kuota listing paket Anda \(1\) telah tercapai/);
  });

  it("5 request paralel pada kuota sisa 1 hanya menghasilkan tepat 1 sukses", async () => {
    const owner = await createTestUser("owner", "race-quota-test");

    const promises = Array.from({ length: 5 }, (_, i) =>
      createListing(
        request("/api/owner/listings", {
          method: "POST",
          cookie: owner.cookie,
          body: sampleListing(`Kost Paralel ${i + 1}`),
        }),
      ),
    );

    const results = await Promise.all(promises);
    const statuses = results.map((r) => r.status);

    const successCount = statuses.filter((s) => s === 201).length;
    const forbiddenCount = statuses.filter((s) => s === 403).length;

    expect(successCount).toBe(1);
    expect(forbiddenCount).toBe(4);
  });
});

describe("P4: Photo limit race condition (M-5)", () => {
  it("25 konfirmasi paralel pada listing kosong menghasilkan tepat MAX_PHOTOS_PER_LISTING sukses", async () => {
    const owner = await createTestUser("owner", "photo-race-test");

    const listingRes = await createListing(
      request("/api/owner/listings", {
        method: "POST",
        cookie: owner.cookie,
        body: sampleListing("Kost Foto Race"),
      }),
    );
    expect(listingRes.status).toBe(201);
    const listingBody = await readJson(listingRes);
    const kostId = listingBody.data.id;

    vi.spyOn(r2, "headObject").mockResolvedValue({
      contentType: "image/jpeg",
      contentLength: 1024,
      etag: "test-etag",
    });
    vi.spyOn(r2, "verifyImageMagicBytes").mockResolvedValue(true);

    const promises = Array.from({ length: 25 }, (_, i) =>
      confirmPhoto(
        request(`/api/owner/listings/${kostId}/photos/confirm`, {
          method: "POST",
          cookie: owner.cookie,
          body: {
            object_key: `kosts/${kostId}/photo-${i}-${crypto.randomUUID()}.jpg`,
            sort_order: i,
          },
        }),
        { params: Promise.resolve({ id: kostId }) },
      ),
    );

    const results = await Promise.all(promises);
    const statuses = results.map((r) => r.status);

    const successCount = statuses.filter((s) => s === 201).length;
    const conflictCount = statuses.filter((s) => s === 409).length;

    expect(successCount).toBe(MAX_PHOTOS_PER_LISTING);
    expect(conflictCount).toBe(25 - MAX_PHOTOS_PER_LISTING);
  });
});

describe("P5: Admin override review owner rejection", () => {
  it("override pada review pending ditolak 409, tanpa alasan 422, field asing 422, non-admin 403", async () => {
    const admin = await createTestUser("admin", "admin-p5");
    const owner = await createTestUser("owner", "owner-p5");

    const listingRes = await createListing(
      request("/api/owner/listings", {
        method: "POST",
        cookie: owner.cookie,
        body: sampleListing("Kost Review Override"),
      }),
    );
    expect(listingRes.status).toBe(201);
    const listingBody = await readJson(listingRes);
    const kostId = listingBody.data.id;

    // Create a physical room
    const [room] = await db
      .insert(kostRooms)
      .values({
        kostId,
        roomCode: "A-101",
        monthlyPrice: "1500000",
      })
      .returning();

    // Create a pending review
    const [pendingReview] = await db
      .insert(reviews)
      .values({
        kostId,
        roomId: room!.id,
        reviewerName: "Budi Santoso",
        claimedCheckInDate: "2025-01-01",
        rating: 5,
        comment: "Kost bersih dan nyaman sekali fasilitas lengkap.",
        publicationStatus: "pending",
        verificationStatus: "unmatched",
      })
      .returning();

    // 1. Non-admin caller receives 403
    const nonAdminRes = await overrideOwnerReject(
      request(`/api/admin/reviews/${pendingReview!.id}/override-owner-reject`, {
        method: "POST",
        cookie: owner.cookie,
        body: { action: "publish", reason: "Alasan valid sepuluh karakter" },
      }),
      { params: Promise.resolve({ id: pendingReview!.id }) },
    );
    expect(nonAdminRes.status).toBe(403);

    // 2. Override on a pending review must be rejected with 409 Conflict
    const pendingOverrideRes = await overrideOwnerReject(
      request(`/api/admin/reviews/${pendingReview!.id}/override-owner-reject`, {
        method: "POST",
        cookie: admin.cookie,
        body: { action: "publish", reason: "Alasan valid sepuluh karakter" },
      }),
      { params: Promise.resolve({ id: pendingReview!.id }) },
    );
    expect(pendingOverrideRes.status).toBe(409);

    // 3. Request without reason must be rejected with 422
    const noReasonRes = await overrideOwnerReject(
      request(`/api/admin/reviews/${pendingReview!.id}/override-owner-reject`, {
        method: "POST",
        cookie: admin.cookie,
        body: { action: "publish" },
      }),
      { params: Promise.resolve({ id: pendingReview!.id }) },
    );
    expect(noReasonRes.status).toBe(422);

    // 4. Unknown fields must be rejected by .strict() with 422
    const unknownFieldRes = await overrideOwnerReject(
      request(`/api/admin/reviews/${pendingReview!.id}/override-owner-reject`, {
        method: "POST",
        cookie: admin.cookie,
        body: {
          action: "publish",
          reason: "Alasan valid sepuluh karakter",
          extra_unwanted: true,
        },
      }),
      { params: Promise.resolve({ id: pendingReview!.id }) },
    );
    expect(unknownFieldRes.status).toBe(422);

    // 5. When review is owner_rejected, admin override succeeds
    await db
      .update(reviews)
      .set({ publicationStatus: "owner_rejected", verificationStatus: "rejected" })
      .where(eq(reviews.id, pendingReview!.id));

    const validOverrideRes = await overrideOwnerReject(
      request(`/api/admin/reviews/${pendingReview!.id}/override-owner-reject`, {
        method: "POST",
        cookie: admin.cookie,
        body: {
          action: "publish",
          reason: "Ulasan sah dari penyewa asli, diverifikasi bukti transfer.",
        },
      }),
      { params: Promise.resolve({ id: pendingReview!.id }) },
    );
    expect(validOverrideRes.status).toBe(200);

    const [updatedRow] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, pendingReview!.id));
    expect(updatedRow?.publicationStatus).toBe("published");
    expect(updatedRow?.moderatedBy).toBe(admin.id);
  });
});
