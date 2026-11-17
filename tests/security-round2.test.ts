import { describe, expect, it, vi } from "vitest";
import { createTestUser } from "./helpers/auth";
import { readJson, request } from "./helpers/http";
import { POST as createListing } from "@/app/api/owner/listings/route";
import { POST as confirmPhoto } from "@/app/api/owner/listings/[id]/photos/confirm/route";
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
