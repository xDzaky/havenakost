import { ownerRoute } from "@/lib/auth/guards";
import { jsonSuccess } from "@/lib/utils/api-response";
import { db } from "@/lib/db";
import {
  kostListings,
  kostRooms,
  roomOccupancies,
  reviews,
  financialRecords,
  ownerSubscriptions,
  subscriptionPlans,
  ownerProfiles,
  notifications,
} from "@/lib/db/schema";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";

export const GET = ownerRoute(async (_request, _context, session) => {
  const ownerId = session.user.id;

  // 1. Ambil Profil Mitra Real dari Database
  const [profileRow] = await db
    .select({
      id: ownerProfiles.id,
      userId: ownerProfiles.userId,
      fullName: ownerProfiles.fullName,
      businessName: ownerProfiles.businessName,
      phone: ownerProfiles.phone,
      address: ownerProfiles.address,
      profilePhoto: ownerProfiles.profilePhoto,
      approvalStatus: ownerProfiles.approvalStatus,
      rejectionReason: ownerProfiles.rejectionReason,
    })
    .from(ownerProfiles)
    .where(eq(ownerProfiles.userId, ownerId))
    .limit(1);

  // 2. Ambil Semua Listing Properti Milik Owner Real dari Database
  const listingsRows = await db
    .select({
      id: kostListings.id,
      name: kostListings.name,
      slug: kostListings.slug,
      status: kostListings.status,
      rejectionReason: kostListings.rejectionReason,
      genderPolicy: kostListings.genderPolicy,
      priceMin: kostListings.priceMin,
      priceMax: kostListings.priceMax,
      district: kostListings.district,
      city: kostListings.city,
      province: kostListings.province,
      address: kostListings.address,
      latitude: kostListings.latitude,
      longitude: kostListings.longitude,
      createdAt: kostListings.createdAt,
      totalRooms: sql<number>`(SELECT COUNT(*)::int FROM kost_rooms kr WHERE kr.kost_id = ${kostListings.id})`,
      availableRooms: sql<number>`(SELECT COUNT(*)::int FROM kost_rooms kr WHERE kr.kost_id = ${kostListings.id} AND kr.room_status = 'available')`,
      coverPhotoUrl: sql<string | null>`(SELECT kp.image_url FROM kost_photos kp WHERE kp.kost_id = ${kostListings.id} ORDER BY kp.is_cover DESC, kp.created_at ASC LIMIT 1)`,
    })
    .from(kostListings)
    .where(and(eq(kostListings.ownerId, ownerId), isNull(kostListings.deletedAt)))
    .orderBy(desc(kostListings.createdAt));

  // 3. Hitung Agregasi KPI Real
  const totalListings = listingsRows.length;
  const activeListings = listingsRows.filter((l) => l.status === "published").length;
  const totalRooms = listingsRows.reduce((acc, l) => acc + (Number(l.totalRooms) || 0), 0);
  const availableRooms = listingsRows.reduce((acc, l) => acc + (Number(l.availableRooms) || 0), 0);
  const occupiedRooms = Math.max(0, totalRooms - availableRooms);
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // 4. Ambil Ulasan Real dari Database
  const reviewRows = await db
    .select({
      id: reviews.id,
      kostId: reviews.kostId,
      kostName: kostListings.name,
      roomCode: kostRooms.roomCode,
      reviewerName: reviews.reviewerName,
      rating: reviews.rating,
      comment: reviews.comment,
      publicationStatus: reviews.publicationStatus,
      verificationStatus: reviews.verificationStatus,
      ownerReply: reviews.ownerReply,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(kostListings, eq(reviews.kostId, kostListings.id))
    .innerJoin(kostRooms, eq(reviews.roomId, kostRooms.id))
    .where(eq(kostListings.ownerId, ownerId))
    .orderBy(desc(reviews.createdAt));

  const pendingReviews = reviewRows.filter((r) => r.publicationStatus === "pending");

  // 5. Ambil Catatan Keuangan Real & Ringkasan Bulan Berjalan
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const financialRows = await db
    .select({
      id: financialRecords.id,
      kostId: financialRecords.kostId,
      kostName: kostListings.name,
      recordType: financialRecords.recordType,
      category: financialRecords.category,
      description: financialRecords.description,
      amount: financialRecords.amount,
      transactionDate: financialRecords.transactionDate,
      createdAt: financialRecords.createdAt,
    })
    .from(financialRecords)
    .leftJoin(kostListings, eq(financialRecords.kostId, kostListings.id))
    .where(eq(financialRecords.ownerId, ownerId))
    .orderBy(desc(financialRecords.transactionDate), desc(financialRecords.createdAt))
    .limit(50);

  // Hitung pemasukan & pengeluaran bulan ini
  const monthlyRecords = financialRows.filter(
    (f) => f.transactionDate >= firstDayOfMonth && f.transactionDate <= lastDayOfMonth
  );
  const totalIncome = monthlyRecords
    .filter((f) => f.recordType === "income")
    .reduce((sum, f) => sum + parseFloat(f.amount || "0"), 0);
  const totalExpense = monthlyRecords
    .filter((f) => f.recordType === "expense")
    .reduce((sum, f) => sum + parseFloat(f.amount || "0"), 0);
  const netBalance = totalIncome - totalExpense;

  // Pemasukan 30 hari terakhir untuk bar chart real
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const last30DaysIncomeRows = await db
    .select({
      date: financialRecords.transactionDate,
      total: sql<number>`COALESCE(SUM(${financialRecords.amount}), 0)::float8`,
    })
    .from(financialRecords)
    .where(
      and(
        eq(financialRecords.ownerId, ownerId),
        eq(financialRecords.recordType, "income"),
        gte(financialRecords.transactionDate, thirtyDaysAgo)
      )
    )
    .groupBy(financialRecords.transactionDate)
    .orderBy(financialRecords.transactionDate);

  // 6. Ambil Status Langganan Real dari Database
  const [activeSub] = await db
    .select({
      id: ownerSubscriptions.id,
      status: ownerSubscriptions.status,
      startDate: ownerSubscriptions.startDate,
      endDate: ownerSubscriptions.endDate,
      planName: subscriptionPlans.name,
      planCode: subscriptionPlans.code,
      maxListings: subscriptionPlans.maxListings,
      durationDays: subscriptionPlans.durationDays,
    })
    .from(ownerSubscriptions)
    .innerJoin(subscriptionPlans, eq(ownerSubscriptions.planId, subscriptionPlans.id))
    .where(and(eq(ownerSubscriptions.ownerId, ownerId), eq(ownerSubscriptions.status, "active")))
    .limit(1);

  // 7. Ambil Jadwal Jatuh Tempo Sewa Penghuni Aktif Real dari Database
  const todayStr = now.toISOString().split("T")[0];
  const dueDatesRows = await db
    .select({
      id: roomOccupancies.id,
      tenantName: roomOccupancies.tenantName,
      checkInDate: roomOccupancies.checkInDate,
      checkOutDate: roomOccupancies.checkOutDate,
      roomCode: kostRooms.roomCode,
      roomName: kostRooms.roomName,
      monthlyPrice: kostRooms.monthlyPrice,
      kostName: kostListings.name,
    })
    .from(roomOccupancies)
    .innerJoin(kostRooms, eq(roomOccupancies.roomId, kostRooms.id))
    .innerJoin(kostListings, eq(roomOccupancies.kostId, kostListings.id))
    .where(
      and(
        eq(kostListings.ownerId, ownerId),
        eq(roomOccupancies.occupancyStatus, "active")
      )
    )
    .orderBy(roomOccupancies.checkOutDate)
    .limit(10);

  // 8. Ambil Notifikasi Real dari Database
  const notifRows = await db
    .select({
      id: notifications.id,
      title: notifications.title,
      message: notifications.message,
      type: notifications.type,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.recipientUserId, ownerId))
    .orderBy(desc(notifications.createdAt))
    .limit(20);

  return jsonSuccess({
    profile: {
      fullName: profileRow?.fullName || session.user.name || "Pemilik Kost",
      businessName: profileRow?.businessName || "",
      phone: profileRow?.phone || "",
      email: session.user.email,
      address: profileRow?.address || "",
      latitude: listingsRows[0]?.latitude ? parseFloat(listingsRows[0].latitude) : -7.9525,
      longitude: listingsRows[0]?.longitude ? parseFloat(listingsRows[0].longitude) : 112.6135,
      approvalStatus: profileRow?.approvalStatus || "pending",
      rejectionReason: profileRow?.rejectionReason || "",
    },
    kpi: {
      activeListings,
      totalListings,
      totalRooms,
      availableRooms,
      occupiedRooms,
      occupancyRate,
      totalReviews: reviewRows.length,
      pendingReviewsCount: pendingReviews.length,
      totalIncome,
      totalExpense,
      netBalance,
    },
    listings: listingsRows.map((l) => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      kost_type: l.genderPolicy,
      price_monthly: typeof l.priceMin === "number" ? l.priceMin : parseFloat(l.priceMin || "0"),
      available_rooms: Number(l.availableRooms) || 0,
      total_rooms: Number(l.totalRooms) || 0,
      district: l.district || "",
      region: l.city || "",
      status: l.status,
      rejection_reason: l.rejectionReason,
      photo_url: l.coverPhotoUrl || "",
      payment_periods: ["Bulanan"],
    })),
    reviews: reviewRows.map((r) => ({
      id: r.id,
      kost_name: r.kostName,
      room_number: r.roomCode,
      reviewer_name: r.reviewerName,
      rating: r.rating,
      comment: r.comment,
      stay_period: "",
      verification_status: r.verificationStatus,
      publication_status: r.publicationStatus,
      owner_reply: r.ownerReply || undefined,
      created_at: r.createdAt.toISOString().split("T")[0],
    })),
    pendingReviews: pendingReviews.map((r) => ({
      id: r.id,
      kost_name: r.kostName,
      room_number: r.roomCode,
      reviewer_name: r.reviewerName,
      rating: r.rating,
      comment: r.comment,
      created_at: r.createdAt.toISOString().split("T")[0],
    })),
    transactions: financialRows.map((f) => ({
      id: f.id,
      date: f.transactionDate,
      type: f.recordType,
      category: f.category,
      amount: parseFloat(f.amount || "0"),
      kost_name: f.kostName || "Kost Umum",
      notes: f.description || "",
    })),
    dailyIncome30Days: last30DaysIncomeRows,
    subscription: activeSub
      ? {
          id: activeSub.id,
          status: activeSub.status,
          planName: activeSub.planName,
          planCode: activeSub.planCode,
          listingQuota: activeSub.maxListings ? `${activeSub.maxListings} Kost` : "Unlimited",
          startDate: activeSub.startDate,
          endDate: activeSub.endDate,
          daysRemaining: Math.max(
            0,
            Math.ceil(
              (new Date(activeSub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
          ),
        }
      : null,
    dueDates: dueDatesRows.map((d) => {
      let daysUntilDue = 0;
      let dueText = "Tidak ada tanggal";
      if (d.checkOutDate) {
        const diff = Math.ceil(
          (new Date(d.checkOutDate).getTime() - new Date(todayStr).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        daysUntilDue = diff;
        if (diff === 0) dueText = "Jatuh tempo: Hari ini";
        else if (diff === 1) dueText = "Jatuh tempo: Besok";
        else if (diff > 1) dueText = `Jatuh tempo: ${diff} hari lagi`;
        else dueText = `Lewat tempo: ${Math.abs(diff)} hari lalu`;
      }
      return {
        id: d.id,
        tenantName: d.tenantName,
        roomCode: d.roomCode,
        roomName: d.roomName,
        kostName: d.kostName,
        monthlyPrice: parseFloat(d.monthlyPrice || "0"),
        checkOutDate: d.checkOutDate,
        dueText,
        daysUntilDue,
      };
    }),
    notifications: notifRows.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type as any,
      is_read: n.isRead,
      created_at: n.createdAt.toISOString().replace("T", " ").slice(0, 16),
    })),
  });
});
