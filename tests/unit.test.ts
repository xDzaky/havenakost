import { describe, expect, it } from "vitest";
import {
  publicKostQuerySchema,
  kostCreateSchema,
} from "@/lib/validators/kost.schema";
import { reviewSubmitSchema } from "@/lib/validators/review.schema";
import { normalizeName, slugify } from "@/lib/utils/slug";
import { haversineMeters } from "@/lib/utils/geolocation";

describe("validators and utilities", () => {
  it("normalizes names conservatively", () => {
    expect(normalizeName("  Budi   Santoso!! ")).toBe("budi santoso");
    expect(normalizeName("BUDI SANTOSO")).toBe("budi santoso");
    expect(normalizeName("Budi Santosa")).not.toBe("budi santoso");
  });

  it("creates URL-safe slugs", () => {
    expect(slugify("Kost Havena — Lowokwaru 2")).toBe(
      "kost-havena-lowokwaru-2",
    );
  });

  it("rejects an inverted price range", () => {
    const result = kostCreateSchema.safeParse({
      name: "Kost Test",
      description: "Deskripsi kost yang cukup panjang untuk validasi schema.",
      address: "Jl. Test No. 1",
      province: "Jawa Timur",
      city: "Kota Malang",
      district: "Lowokwaru",
      latitude: -7.94,
      longitude: 112.62,
      gender_policy: "mixed",
      price_min: 2_000_000,
      price_max: 1_000_000,
      contact_phone: "6281234567890",
    });
    expect(result.success).toBe(false);
  });

  it("rejects incomplete coordinate pairs in public search", () => {
    const result = publicKostQuerySchema.safeParse({
      latitude: "-7.94",
    });
    expect(result.success).toBe(false);
  });

  it("rejects ratings outside 1-5", () => {
    const base = {
      qr_token: "abcdefghijklmnop",
      reviewer_name: "Budi Santoso",
      claimed_check_in_date: "2026-01-01",
      rating: 0,
      comment: "Komentar yang cukup panjang.",
      turnstile_token: "test-bypass",
    };
    expect(reviewSubmitSchema.safeParse(base).success).toBe(false);
    expect(
      reviewSubmitSchema.safeParse({ ...base, rating: 5 }).success,
    ).toBe(true);
  });

  it("computes a plausible great-circle distance", () => {
    const distance = haversineMeters(
      { latitude: -7.9412, longitude: 112.6201 },
      { latitude: -7.9412, longitude: 112.6201 },
    );
    expect(distance).toBe(0);

    const oneKm = haversineMeters(
      { latitude: -7.9412, longitude: 112.6201 },
      { latitude: -7.9502, longitude: 112.6201 },
    );
    expect(oneKm).toBeGreaterThan(900);
    expect(oneKm).toBeLessThan(1100);
  });
});
