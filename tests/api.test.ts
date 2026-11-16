import { beforeAll, describe, expect, it } from "vitest";
import { resetDatabase } from "./helpers/db";
import { createTestUser, type TestUser } from "./helpers/auth";
import { readJson, request } from "./helpers/http";

import {
  GET as listOwnerListings,
  POST as createListing,
} from "@/app/api/owner/listings/route";
import { GET as getListing, PATCH as patchListing } from "@/app/api/owner/listings/[id]/route";
import { GET as publicList } from "@/app/api/public/kost/route";
import { GET as publicFacilities } from "@/app/api/public/facilities/route";
import { GET as nearbySearch } from "@/app/api/public/locations/search/route";
import { PUT as setFacilities } from "@/app/api/owner/listings/[id]/facilities/route";
import { GET as getProfile, PATCH as updateProfile } from "@/app/api/owner/profile/route";
import { GET as authGet, POST as authPost } from "@/app/api/auth/[...all]/route";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { GET as publicDetail } from "@/app/api/public/kost/[slug]/route";
import { POST as createRoom } from "@/app/api/owner/listings/[id]/rooms/route";
import { POST as createQr, DELETE as disableQr } from "@/app/api/owner/rooms/[roomId]/qr/route";
import { POST as presignPhoto } from "@/app/api/owner/listings/[id]/photos/presign/route";
import { POST as hideReview } from "@/app/api/admin/reviews/[id]/hide/route";
import { POST as publishReview } from "@/app/api/admin/reviews/[id]/publish/route";
import { POST as regenerateQr } from "@/app/api/owner/rooms/[roomId]/qr/regenerate/route";
import { POST as createOccupancy } from "@/app/api/owner/rooms/[roomId]/occupancies/route";
import { GET as publicReviewForm } from "@/app/api/public/review/[token]/route";
import { POST as submitReview } from "@/app/api/public/reviews/route";
import { GET as publicReviews } from "@/app/api/public/kost/[slug]/reviews/route";
import { GET as ownerReviews } from "@/app/api/owner/reviews/route";
import { GET as ownerReviewDetail } from "@/app/api/owner/reviews/[reviewId]/route";
import { POST as verifyReview } from "@/app/api/owner/reviews/[reviewId]/verify/route";
import { POST as approveOwner } from "@/app/api/admin/owners/[id]/approve/route";
import { POST as approveListing } from "@/app/api/admin/listings/[id]/approve/route";
import { GET as adminDashboard } from "@/app/api/admin/dashboard/route";
import { PATCH as setOwnerStatus } from "@/app/api/admin/owners/[id]/status/route";
import { GET as adminLogs } from "@/app/api/admin/logs/route";
import { GET as adminReviews } from "@/app/api/admin/reviews/route";
import { POST as createFinance } from "@/app/api/owner/finances/route";
import { GET as getFinance } from "@/app/api/owner/finances/[id]/route";
import { GET as financeSummary } from "@/app/api/owner/finances/summary/route";
import { POST as createPlan } from "@/app/api/admin/subscription-plans/route";
import { POST as paySubscription } from "@/app/api/owner/subscription/payment/route";
import { POST as approvePayment } from "@/app/api/admin/subscription-payments/[id]/approve/route";
import { GET as ownerSubscription } from "@/app/api/owner/subscription/route";
import { GET as healthCheck } from "@/app/api/health/route";

const params = <T>(value: T) => ({ params: Promise.resolve(value) });

describe("Havena Kost backend", () => {
  let ownerA: TestUser;
  let ownerB: TestUser;
  let admin: TestUser;

  let kostId: string;
  let kostSlug: string;
  let roomId: string;
  let qrToken: string;
  let occupancyId: string;

  beforeAll(async () => {
    await resetDatabase();
    ownerA = await createTestUser("owner", "owner-a");
    ownerB = await createTestUser("owner", "owner-b");
    admin = await createTestUser("admin", "admin");

    const approved = await approveOwner(
      request(`/api/admin/owners/${ownerA.id}/approve`, {
        method: "POST",
        cookie: admin.cookie,
      }),
      params({ id: ownerA.id }),
    );
    expect(approved.status).toBe(200);
  });

  it("supports login session and logout", async () => {
    const temp = await createTestUser("owner", "logout");

    const before = await authGet(
      request("/api/auth/get-session", { cookie: temp.cookie }),
    );
    const beforeBody = await readJson(before);
    expect(beforeBody?.user?.email ?? beforeBody?.session?.user?.email).toBe(
      temp.email,
    );

    const logout = await authPost(
      request("/api/auth/sign-out", {
        method: "POST",
        cookie: temp.cookie,
      }),
    );
    expect([200, 204]).toContain(logout.status);

    const after = await authGet(
      request("/api/auth/get-session", { cookie: temp.cookie }),
    );
    const afterBody = await readJson(after);
    expect(afterBody?.user ?? afterBody?.session ?? null).toBeNull();
  });

  it("allows a suspended owner to read the reason but blocks owner APIs", async () => {
    const suspendee = await createTestUser("owner", "owner-suspend");

    const suspend = await setOwnerStatus(
      request(`/api/admin/owners/${suspendee.id}/status`, {
        method: "PATCH",
        cookie: admin.cookie,
        body: { status: "suspended", reason: "Pengujian penangguhan akun." },
      }),
      params({ id: suspendee.id }),
    );
    expect(suspend.status).toBe(200);

    const profile = await getProfile(
      request("/api/owner/profile", { cookie: suspendee.cookie }),
    );
    expect(profile.status).toBe(200);
    const profileBody = await readJson(profile);
    expect(profileBody.data.profile.approvalStatus).toBe("suspended");

    const blocked = await listOwnerListings(
      request("/api/owner/listings", { cookie: suspendee.cookie }),
    );
    expect(blocked.status).toBe(403);

    const restore = await setOwnerStatus(
      request(`/api/admin/owners/${suspendee.id}/status`, {
        method: "PATCH",
        cookie: admin.cookie,
        body: { status: "approved" },
      }),
      params({ id: suspendee.id }),
    );
    expect(restore.status).toBe(200);
  });

  it("reports database and PostGIS health", async () => {
    const response = await healthCheck(request("/api/health"));
    const body = await readJson(response);
    expect(response.status).toBe(200);
    expect(body.data.database).toBe("connected");
    expect(String(body.data.postgis)).toMatch(/^3\./);
  });

  it("isolates owner data and blocks admin endpoints for owners", async () => {
    const adminAttempt = await adminDashboard(
      request("/api/admin/dashboard", { cookie: ownerA.cookie }),
    );
    expect(adminAttempt.status).toBe(403);
  });

  it("creates a draft listing that is invisible to the public", async () => {
    const response = await createListing(
      request("/api/owner/listings", {
        method: "POST",
        cookie: ownerA.cookie,
        body: {
          name: "Kost Havena Lowokwaru",
          description:
            "Kost nyaman dekat kampus dengan fasilitas lengkap dan lingkungan aman.",
          address: "Jl. Soekarno Hatta No. 10",
          province: "Jawa Timur",
          city: "Kota Malang",
          district: "Lowokwaru",
          subdistrict: "Tulusrejo",
          postal_code: "65141",
          latitude: -7.9412,
          longitude: 112.6201,
          gender_policy: "mixed",
          price_min: 700000,
          price_max: 1500000,
          contact_phone: "6281234567890",
        },
      }),
    );
    expect(response.status).toBe(201);
    const body = await readJson(response);
    expect(body.data.status).toBe("draft");
    kostId = body.data.id;
    kostSlug = body.data.slug;

    const publicResponse = await publicList(
      request("/api/public/kost"),
    );
    const publicBody = await readJson(publicResponse);
    expect(publicBody.meta.total).toBe(0);
  });

  it("creates a physical room and a QR token", async () => {
    const roomResponse = await createRoom(
      request(`/api/owner/listings/${kostId}/rooms`, {
        method: "POST",
        cookie: ownerA.cookie,
        body: {
          room_code: "A01",
          room_name: "Kamar A01",
          monthly_price: 850000,
          room_status: "available",
        },
      }),
      params({ id: kostId }),
    );
    expect(roomResponse.status).toBe(201);
    roomId = (await readJson(roomResponse)).data.id;

    const qrResponse = await createQr(
      request(`/api/owner/rooms/${roomId}/qr`, {
        method: "POST",
        cookie: ownerA.cookie,
      }),
      params({ roomId }),
    );
    expect(qrResponse.status).toBe(201);
    const qrBody = await readJson(qrResponse);
    expect(qrBody.data.reviewUrl).toContain("/review/");
    qrToken = qrBody.data.token;
  });

  it("prevents another owner from reading the listing", async () => {
    const response = await getListing(
      request(`/api/owner/listings/${kostId}`, {
        cookie: ownerB.cookie,
      }),
      params({ id: kostId }),
    );
    expect(response.status).toBe(404);
  });

  it("blocks pending owners from submitting their own listing for approval", async () => {
    const created = await createListing(
      request("/api/owner/listings", {
        method: "POST",
        cookie: ownerB.cookie,
        body: {
          name: "Kost Pemilik Belum Terverifikasi",
          description:
            "Listing draft milik pemilik yang belum disetujui admin untuk pengujian.",
          address: "Jl. Contoh No. 1",
          province: "Jawa Timur",
          city: "Kota Malang",
          district: "Klojen",
          latitude: -7.98,
          longitude: 112.63,
          gender_policy: "female",
          price_min: 500000,
          price_max: 700000,
          contact_phone: "6281234567891",
        },
      }),
    );
    expect(created.status).toBe(201);
    const createdId = (await readJson(created)).data.id;

    const response = await patchListing(
      request(`/api/owner/listings/${createdId}`, {
        method: "PATCH",
        cookie: ownerB.cookie,
        body: { status: "pending" },
      }),
      params({ id: createdId }),
    );
    expect(response.status).toBe(403);
  });

  it("cannot escalate role via registration or profile update", async () => {
    const email = `escalation-${crypto.randomUUID()}@example.com`;
    const signUp = await authPost(
      request("/api/auth/sign-up/email", {
        method: "POST",
        body: {
          email,
          password: "HavenaTest123!",
          name: "Escalation Attempt",
          role: "admin",
        },
      }),
    );
    // Better Auth either rejects the non-input field or ignores it.
    expect([200, 400, 422]).toContain(signUp.status);

    const [created] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (created) expect(created.role).toBe("owner");

    const profileUpdate = await updateProfile(
      request("/api/owner/profile", {
        method: "PATCH",
        cookie: ownerA.cookie,
        body: { full_name: "Hacked Name", role: "admin" },
      }),
    );
    expect(profileUpdate.status).toBe(422);
  });

  it("publishes the listing after admin approval and exposes it publicly", async () => {
    const pending = await patchListing(
      request(`/api/owner/listings/${kostId}`, {
        method: "PATCH",
        cookie: ownerA.cookie,
        body: { status: "pending" },
      }),
      params({ id: kostId }),
    );
    expect(pending.status).toBe(200);

    const approval = await approveListing(
      request(`/api/admin/listings/${kostId}/approve`, {
        method: "POST",
        cookie: admin.cookie,
      }),
      params({ id: kostId }),
    );
    expect(approval.status).toBe(200);

    const list = await publicList(request("/api/public/kost"));
    const listBody = await readJson(list);
    expect(listBody.meta.total).toBe(1);
    expect(listBody.data[0].slug).toBe(kostSlug);

    const detail = await publicDetail(
      request(`/api/public/kost/${kostSlug}`),
      params({ slug: kostSlug }),
    );
    expect(detail.status).toBe(200);

    const facilitiesResponse = await publicFacilities(
      request("/api/public/facilities"),
    );
    const facilitiesBody = await readJson(facilitiesResponse);
    const facilityId = facilitiesBody.data[0].id as string;

    const setFacility = await setFacilities(
      request(`/api/owner/listings/${kostId}/facilities`, {
        method: "PUT",
        cookie: ownerA.cookie,
        body: { facility_ids: [facilityId] },
      }),
      params({ id: kostId }),
    );
    expect(setFacility.status).toBe(200);

    const nearby = await nearbySearch(
      request(
        `/api/public/locations/search?latitude=-7.9412&longitude=112.6201&radius=5000&facility=${facilityId}`,
      ),
    );
    const nearbyBody = await readJson(nearby);
    expect(nearbyBody.meta.total).toBe(1);
    expect(nearbyBody.data[0].distanceMeters).toBeLessThan(50);

    const presign = await presignPhoto(
      request(`/api/owner/listings/${kostId}/photos/presign`, {
        method: "POST",
        cookie: ownerA.cookie,
        body: {
          filename: "depan.jpg",
          content_type: "image/jpeg",
          size: 1024,
        },
      }),
      params({ id: kostId }),
    );
    expect(presign.status).toBe(201);
    const presignBody = await readJson(presign);
    expect(presignBody.data.objectKey).toContain(`kosts/${kostId}/`);

    const otherPresign = await presignPhoto(
      request(`/api/owner/listings/${kostId}/photos/presign`, {
        method: "POST",
        cookie: ownerB.cookie,
        body: {
          filename: "depan.jpg",
          content_type: "image/jpeg",
          size: 1024,
        },
      }),
      params({ id: kostId }),
    );
    expect(otherPresign.status).toBe(404);
  });

  it("submits a review without login and keeps it pending", async () => {
    const occupancyResponse = await createOccupancy(
      request(`/api/owner/rooms/${roomId}/occupancies`, {
        method: "POST",
        cookie: ownerA.cookie,
        body: {
          tenant_name: "Budi Santoso",
          check_in_date: "2026-01-01",
          occupancy_status: "active",
        },
      }),
      params({ roomId }),
    );
    expect(occupancyResponse.status).toBe(201);
    occupancyId = (await readJson(occupancyResponse)).data.id;

    const form = await publicReviewForm(
      request(`/api/public/review/${qrToken}`),
      params({ token: qrToken }),
    );
    expect(form.status).toBe(200);

    const publicDetailResponse = await publicDetail(
      request(`/api/public/kost/${kostSlug}`),
      params({ slug: kostSlug }),
    );
    const publicDetailText = JSON.stringify(
      await readJson(publicDetailResponse),
    );
    expect(publicDetailText).not.toContain("Budi Santoso");

    const response = await submitReview(
      request("/api/public/reviews", {
        method: "POST",
        body: {
          qr_token: qrToken,
          reviewer_name: "Budi Santoso",
          claimed_check_in_date: "2026-01-05",
          rating: 5,
          comment: "Kost bersih dan pemilik responsif. Lokasi dekat kampus.",
          turnstile_token: "test-bypass",
        },
      }),
    );
    expect(response.status).toBe(201);
    const body = await readJson(response);
    expect(body.data.publication_status).toBe("pending");
    expect(body.data).not.toHaveProperty("verification_status");

    const publicListReviews = await publicReviews(
      request(`/api/public/kost/${kostSlug}/reviews`),
      params({ slug: kostSlug }),
    );
    const publicReviewsBody = await readJson(publicListReviews);
    expect(publicReviewsBody.meta.total).toBe(0);
  });

  it("lets the owner verify a matching occupancy and publish the review", async () => {
    const list = await ownerReviews(
      request("/api/owner/reviews?publication_status=pending", {
        cookie: ownerA.cookie,
      }),
      params({}),
    );
    const listBody = await readJson(list);
    expect(listBody.data.length).toBe(1);
    const reviewId = listBody.data[0].id;

    const detail = await ownerReviewDetail(
      request(`/api/owner/reviews/${reviewId}`, {
        cookie: ownerA.cookie,
      }),
      params({ reviewId }),
    );
    const detailBody = await readJson(detail);
    expect(detailBody.data.candidate_occupancies.length).toBeGreaterThan(0);

    const verify = await verifyReview(
      request(`/api/owner/reviews/${reviewId}/verify`, {
        method: "POST",
        cookie: ownerA.cookie,
        body: { occupancy_id: occupancyId },
      }),
      params({ reviewId }),
    );
    expect(verify.status).toBe(200);

    const publicListReviews = await publicReviews(
      request(`/api/public/kost/${kostSlug}/reviews`),
      params({ slug: kostSlug }),
    );
    const publicReviewsBody = await readJson(publicListReviews);
    expect(publicReviewsBody.meta.total).toBe(1);
    expect(publicReviewsBody.data[0].rating).toBe(5);
    expect(JSON.stringify(publicReviewsBody)).not.toContain("Budi Santoso");
  });

  it("rejects reusing a verified occupancy for a second review", async () => {
    const second = await submitReview(
      request("/api/public/reviews", {
        method: "POST",
        body: {
          qr_token: qrToken,
          reviewer_name: "Budi Santoso",
          claimed_check_in_date: "2026-01-05",
          rating: 4,
          comment: "Review kedua untuk menguji unique constraint occupancy.",
          turnstile_token: "test-bypass",
        },
      }),
    );
    expect(second.status).toBe(201);
    const secondBody = await readJson(second);

    const verify = await verifyReview(
      request(`/api/owner/reviews/${secondBody.data.id}/verify`, {
        method: "POST",
        cookie: ownerA.cookie,
        body: { occupancy_id: occupancyId },
      }),
      params({ reviewId: secondBody.data.id }),
    );
    expect(verify.status).toBe(409);
  });

  it("rejects invalid ratings before Turnstile verification", async () => {
    const response = await submitReview(
      request("/api/public/reviews", {
        method: "POST",
        body: {
          qr_token: qrToken,
          reviewer_name: "Budi Santoso",
          claimed_check_in_date: "2026-01-05",
          rating: 6,
          comment: "Rating di luar batas harus ditolak oleh validasi Zod.",
          turnstile_token: "test-bypass",
        },
      }),
    );
    expect(response.status).toBe(422);
  });

  it("rejects a review when Turnstile siteverify fails", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (String(input).includes("challenges.cloudflare.com")) {
        return new Response(
          JSON.stringify({
            success: false,
            "error-codes": ["invalid-input-response"],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return originalFetch(input);
    }) as typeof fetch;

    try {
      const response = await submitReview(
        request("/api/public/reviews", {
          method: "POST",
          headers: { "x-forwarded-for": "10.0.0.99" },
          body: {
            qr_token: qrToken,
            reviewer_name: "Budi Santoso",
            claimed_check_in_date: "2026-01-05",
            rating: 5,
            comment: "Komentar dengan Turnstile yang gagal diverifikasi.",
            turnstile_token: "token-palsu",
          },
        }),
      );
      expect(response.status).toBe(422);
      const body = await readJson(response);
      expect(body.success).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns 404 for unknown QR tokens", async () => {
    const response = await publicReviewForm(
      request("/api/public/review/token-yang-tidak-pernah-dibuat"),
      params({ token: "token-yang-tidak-pernah-dibuat" }),
    );
    expect(response.status).toBe(404);
  });

  it("invalidates disabled QR tokens and regenerates a new one", async () => {
    const disabled = await disableQr(
      request(`/api/owner/rooms/${roomId}/qr`, {
        method: "DELETE",
        cookie: ownerA.cookie,
      }),
      params({ roomId }),
    );
    expect(disabled.status).toBe(200);

    const oldToken = await publicReviewForm(
      request(`/api/public/review/${qrToken}`),
      params({ token: qrToken }),
    );
    expect(oldToken.status).toBe(404);

    const regenerated = await regenerateQr(
      request(`/api/owner/rooms/${roomId}/qr/regenerate`, {
        method: "POST",
        cookie: ownerA.cookie,
      }),
      params({ roomId }),
    );
    expect(regenerated.status).toBe(201);
    const regeneratedBody = await readJson(regenerated);
    expect(regeneratedBody.data.token).not.toBe(qrToken);
  });

  it("keeps financial records isolated per owner and computes summaries", async () => {
    const create = await createFinance(
      request("/api/owner/finances", {
        method: "POST",
        cookie: ownerA.cookie,
        body: {
          kost_id: kostId,
          record_type: "income",
          category: "Sewa kamar",
          description: "Pembayaran sewa Januari",
          amount: 850000,
          transaction_date: "2026-01-10",
        },
      }),
      params({}),
    );
    expect(create.status).toBe(201);
    const financeId = (await readJson(create)).data.id;

    const forbidden = await getFinance(
      request(`/api/owner/finances/${financeId}`, {
        cookie: ownerB.cookie,
      }),
      params({ id: financeId }),
    );
    expect(forbidden.status).toBe(404);

    const summary = await financeSummary(
      request("/api/owner/finances/summary", { cookie: ownerA.cookie }),
    );
    const summaryBody = await readJson(summary);
    expect(summaryBody.data.totals.income).toBe(850000);
    expect(summaryBody.data.monthly.length).toBeGreaterThan(0);
    expect(summaryBody.data.monthly[0].income).toBe(850000);
  });

  it("lets admin hide and republish a review, with audit trail", async () => {
    const list = await adminReviews(
      request("/api/admin/reviews?publication_status=published", {
        cookie: admin.cookie,
      }),
    );
    const listBody = await readJson(list);
    expect(listBody.data.length).toBe(1);
    const reviewId = listBody.data[0].id;

    const hide = await hideReview(
      request(`/api/admin/reviews/${reviewId}/hide`, {
        method: "POST",
        cookie: admin.cookie,
        body: { reason: "Menguji moderasi admin." },
      }),
      params({ id: reviewId }),
    );
    expect(hide.status).toBe(200);

    const hiddenPublic = await publicReviews(
      request(`/api/public/kost/${kostSlug}/reviews`),
      params({ slug: kostSlug }),
    );
    expect((await readJson(hiddenPublic)).meta.total).toBe(0);

    const publish = await publishReview(
      request(`/api/admin/reviews/${reviewId}/publish`, {
        method: "POST",
        cookie: admin.cookie,
        body: { reason: "Publikasi kembali setelah pemeriksaan." },
      }),
      params({ id: reviewId }),
    );
    expect(publish.status).toBe(200);

    const visiblePublic = await publicReviews(
      request(`/api/public/kost/${kostSlug}/reviews`),
      params({ slug: kostSlug }),
    );
    expect((await readJson(visiblePublic)).meta.total).toBe(1);

    const logs = await adminLogs(
      request("/api/admin/logs", { cookie: admin.cookie }),
      params({}),
    );
    const logsBody = await readJson(logs);
    expect(
      logsBody.data.some(
        (log: { action: string }) => log.action === "review.hide",
      ),
    ).toBe(true);
  });

  it("handles manual subscription approval end to end", async () => {
    const planResponse = await createPlan(
      request("/api/admin/subscription-plans", {
        method: "POST",
        cookie: admin.cookie,
        body: {
          code: "basic",
          name: "Paket Basic",
          price: 50000,
          duration_days: 30,
          is_active: true,
        },
      }),
      params({}),
    );
    expect(planResponse.status).toBe(201);
    const planId = (await readJson(planResponse)).data.id;

    const paymentResponse = await paySubscription(
      request("/api/owner/subscription/payment", {
        method: "POST",
        cookie: ownerA.cookie,
        body: {
          plan_id: planId,
          payment_method: "transfer",
          payment_amount: 50000,
        },
      }),
      params({}),
    );
    expect(paymentResponse.status).toBe(201);
    const paymentId = (await readJson(paymentResponse)).data.id;

    const approve = await approvePayment(
      request(`/api/admin/subscription-payments/${paymentId}/approve`, {
        method: "POST",
        cookie: admin.cookie,
      }),
      params({ id: paymentId }),
    );
    expect(approve.status).toBe(200);

    const subscription = await ownerSubscription(
      request("/api/owner/subscription", { cookie: ownerA.cookie }),
      params({}),
    );
    const subscriptionBody = await readJson(subscription);
    expect(subscriptionBody.data.subscription.status).toBe("active");
  });

  it("records admin actions in the audit log and serves dashboard stats", async () => {
    const logs = await adminLogs(
      request("/api/admin/logs", { cookie: admin.cookie }),
      params({}),
    );
    const logsBody = await readJson(logs);
    expect(logsBody.data.length).toBeGreaterThan(0);
    expect(
      logsBody.data.some(
        (log: { action: string }) => log.action === "listing.approve",
      ),
    ).toBe(true);

    const dashboard = await adminDashboard(
      request("/api/admin/dashboard", { cookie: admin.cookie }),
    );
    const dashboardBody = await readJson(dashboard);
    expect(dashboardBody.data.totals.listings).toBe(2);
    expect(dashboardBody.data.growth.series.length).toBe(30);
  });
});
