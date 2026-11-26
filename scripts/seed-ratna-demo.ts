import "dotenv/config";
import { db, sqlClient } from "@/lib/db";
import {
  user,
  ownerProfiles,
  subscriptionPlans,
  ownerSubscriptions,
  kostListings,
  kostPhotos,
  kostRooms,
  roomOccupancies,
  reviews,
  financialRecords,
  notifications,
  facilities,
  kostListingFacilities,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

async function main() {
  console.log("=== Memulai Seeding Data Demo Lengkap untuk Bu Ratna Kusuma ===");

  // 1. Dapatkan Akun Ratna Kusuma
  const [ratnaUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, "ratna.kusuma@gmail.com"));

  if (!ratnaUser) {
    throw new Error("Akun ratna.kusuma@gmail.com tidak ditemukan di tabel user!");
  }
  const ownerId = ratnaUser.id;
  console.log(`User ID Ratna: ${ownerId}`);

  // 2. Setup / Update Owner Profile Bu Ratna
  await db
    .insert(ownerProfiles)
    .values({
      userId: ownerId,
      fullName: "Ratna Kusuma Dewi",
      businessName: "Paviliun Melati & Griya Cendekia Group",
      phone: "6281234567890",
      address: "Jl. MT Haryono No. 108, Dinoyo, Lowokwaru, Kota Malang, Jawa Timur 65144",
      profilePhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
      approvalStatus: "approved",
      verifiedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: ownerProfiles.userId,
      set: {
        fullName: "Ratna Kusuma Dewi",
        businessName: "Paviliun Melati & Griya Cendekia Group",
        phone: "6281234567890",
        address: "Jl. MT Haryono No. 108, Dinoyo, Lowokwaru, Kota Malang, Jawa Timur 65144",
        profilePhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
        approvalStatus: "approved",
        verifiedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  console.log("Owner profile updated to approved.");

  // 3. Setup Subscription Plans
  const [featuredPlan] = await db
    .insert(subscriptionPlans)
    .values({
      code: "featured-6m",
      name: "Paket Featured 6 Bulan",
      description: "Paket promosi prioritas eksklusif dengan lencana Kost Pilihan dan kuota listing tanpa batas.",
      price: "750000.00",
      durationDays: 180,
      maxListings: null, // Unlimited
      features: "Lencana Kost Pilihan, Posisi Prioritas Teratas, Analitik Hunian & Keuangan Real-Time",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: subscriptionPlans.code,
      set: {
        name: "Paket Featured 6 Bulan",
        price: "750000.00",
        durationDays: 180,
        maxListings: null,
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Active Subscription untuk Ratna
  // Hapus sub lama jika ada
  await db.delete(ownerSubscriptions).where(eq(ownerSubscriptions.ownerId, ownerId));

  const now = new Date();
  const subStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split("T")[0];
  const subEnd = new Date(now.getFullYear(), now.getMonth() + 2, 28).toISOString().split("T")[0];

  await db.insert(ownerSubscriptions).values({
    ownerId,
    planId: featuredPlan.id,
    startDate: subStart,
    endDate: subEnd,
    status: "active",
  });
  console.log("Subscription Paket Featured 6 Bulan diaktifkan.");

  // 4. Bersihkan data listing lama milik Ratna agar fresh & rapi
  const existingListings = await db
    .select({ id: kostListings.id })
    .from(kostListings)
    .where(eq(kostListings.ownerId, ownerId));

  if (existingListings.length > 0) {
    const ids = existingListings.map((l) => l.id);
    await db.delete(reviews).where(inArray(reviews.kostId, ids));
    await db.delete(financialRecords).where(inArray(financialRecords.kostId, ids));
    await db.delete(roomOccupancies).where(inArray(roomOccupancies.kostId, ids));
    await db.delete(kostRooms).where(inArray(kostRooms.kostId, ids));
    await db.delete(kostPhotos).where(inArray(kostPhotos.kostId, ids));
    await db.delete(kostListingFacilities).where(inArray(kostListingFacilities.kostId, ids));
    await db.delete(kostListings).where(inArray(kostListings.id, ids));
  }
  await db.delete(financialRecords).where(eq(financialRecords.ownerId, ownerId));
  await db.delete(notifications).where(eq(notifications.recipientUserId, ownerId));
  console.log("Membersihkan listing demo lama...");

  // Ambil data fasilitas untuk relasi
  const allFacilities = await db.select().from(facilities);
  const wifiFac = allFacilities.find((f) => f.name.toLowerCase().includes("wifi"));
  const acFac = allFacilities.find((f) => f.name.toLowerCase() === "ac");
  const kmDalamFac = allFacilities.find((f) => f.name.toLowerCase().includes("dalam"));
  const kasurFac = allFacilities.find((f) => f.name.toLowerCase() === "kasur");
  const lemariFac = allFacilities.find((f) => f.name.toLowerCase() === "lemari");
  const cctvFac = allFacilities.find((f) => f.name.toLowerCase() === "cctv");
  const parkirFac = allFacilities.find((f) => f.name.toLowerCase().includes("motor"));

  // 5. Buat 3 Listing Kost untuk Bu Ratna
  // Listing 1: Kost Paviliun Melati Dinoyo (14 Kamar: 11 Terisi, 3 Tersedia)
  const [kostMelati] = await db
    .insert(kostListings)
    .values({
      ownerId,
      name: "Kost Paviliun Melati Dinoyo",
      slug: "kost-paviliun-melati-dinoyo",
      description:
        "Kost putri eksklusif, aman, dan nyaman di kawasan strategis Dinoyo Malang. Hanya 5 menit ke Universitas Brawijaya (UB) dan UIN Maliki. Dilengkapi kamar mandi dalam, AC, WiFi 100 Mbps, CCTV 24 jam, dan parkiran berkanopi.",
      address: "Jl. MT Haryono No. 108, Dinoyo, Lowokwaru, Kota Malang",
      province: "Jawa Timur",
      city: "Kota Malang",
      district: "Lowokwaru",
      subdistrict: "Dinoyo",
      postalCode: "65144",
      latitude: "-7.946500",
      longitude: "112.615500",
      genderPolicy: "female",
      priceMin: 850000,
      priceMax: 1200000,
      contactPhone: "6281234567890",
      status: "published",
      verifiedAt: new Date(),
    })
    .returning();

  await db.insert(kostPhotos).values([
    {
      kostId: kostMelati.id,
      objectKey: "photos/melati-cover-1.jpg",
      imageUrl: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80",
      altText: "Fasad Depan Kost Paviliun Melati",
      isCover: true,
      sortOrder: 0,
    },
    {
      kostId: kostMelati.id,
      objectKey: "photos/melati-kamar-1.jpg",
      imageUrl: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
      altText: "Interior Kamar Tipe AC",
      isCover: false,
      sortOrder: 1,
    },
  ]);

  // Listing 2: Kost Griya Cendekia Syariah (8 Kamar: 7 Terisi, 1 Tersedia)
  const [kostCendekia] = await db
    .insert(kostListings)
    .values({
      ownerId,
      name: "Kost Griya Cendekia Syariah",
      slug: "kost-griya-cendekia-syariah",
      description:
        "Kost putri muslimah tenang dan asri di Sigura-gura Lowokwaru Malang. Suasana kondusif untuk belajar, dekat UM dan ITN. Fasilitas lengkap dengan dapur bersama, kulkas, dan ruang tamu bersama.",
      address: "Jl. Bendungan Sigura-gura No. 15, Sumbersari, Lowokwaru, Kota Malang",
      province: "Jawa Timur",
      city: "Kota Malang",
      district: "Lowokwaru",
      subdistrict: "Sumbersari",
      postalCode: "65145",
      latitude: "-7.958200",
      longitude: "112.612100",
      genderPolicy: "female",
      priceMin: 900000,
      priceMax: 1100000,
      contactPhone: "6281234567890",
      status: "published",
      verifiedAt: new Date(),
    })
    .returning();

  await db.insert(kostPhotos).values([
    {
      kostId: kostCendekia.id,
      objectKey: "photos/cendekia-cover-1.jpg",
      imageUrl: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80",
      altText: "Halaman Depan Kost Griya Cendekia",
      isCover: true,
      sortOrder: 0,
    },
  ]);

  // Listing 3: Kost Putri Lavender Tlogomas (4 Kamar: 3 Terisi, 1 Tersedia)
  const [kostLavender] = await db
    .insert(kostListings)
    .values({
      ownerId,
      name: "Kost Putri Lavender Tlogomas",
      slug: "kost-putri-lavender-tlogomas",
      description:
        "Kost nyaman khusus putri dekat kampus Universitas Muhammadiyah Malang (UMM) Kampus 3. Akses angkutan umum mudah, lingkungan aman, ramah, dan bebas banjir.",
      address: "Jl. Raya Tlogomas Gang 5 No. 42, Tlogomas, Lowokwaru, Kota Malang",
      province: "Jawa Timur",
      city: "Kota Malang",
      district: "Lowokwaru",
      subdistrict: "Tlogomas",
      postalCode: "65144",
      latitude: "-7.925400",
      longitude: "112.598200",
      genderPolicy: "female",
      priceMin: 750000,
      priceMax: 950000,
      contactPhone: "6281234567890",
      status: "published",
      verifiedAt: new Date(),
    })
    .returning();

  await db.insert(kostPhotos).values([
    {
      kostId: kostLavender.id,
      objectKey: "photos/lavender-cover-1.jpg",
      imageUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
      altText: "Tampak Depan Kost Lavender",
      isCover: true,
      sortOrder: 0,
    },
  ]);

  // Hubungkan fasilitas ke listing
  const facPairs: { kostId: string; facilityId: string }[] = [];
  [kostMelati, kostCendekia, kostLavender].forEach((k) => {
    [wifiFac, acFac, kmDalamFac, kasurFac, lemariFac, cctvFac, parkirFac].forEach((f) => {
      if (f) facPairs.push({ kostId: k.id, facilityId: f.id });
    });
  });
  if (facPairs.length > 0) {
    await db.insert(kostListingFacilities).values(facPairs).onConflictDoNothing();
  }
  console.log("3 Listing berhasil dibuat dan dihubungkan ke fasilitas.");

  // 6. Buat Kamar & Penghuni
  // Kost Melati: 14 Kamar (101-110, 201-204). 11 Occupied, 3 Available.
  const melatiRoomsData = [
    { code: "101", name: "Kamar 101 Standard", price: "850000.00", status: "occupied" as const, tenant: "Rani Rahmawati" },
    { code: "102", name: "Kamar 102 Standard", price: "850000.00", status: "occupied" as const, tenant: "Ani Safitri" },
    { code: "103", name: "Kamar 103 Standard", price: "850000.00", status: "occupied" as const, tenant: "Fitri Handayani" },
    { code: "104", name: "Kamar 104 Deluxe AC", price: "1200000.00", status: "occupied" as const, tenant: "Nabila Putri" },
    { code: "105", name: "Kamar 105 Deluxe AC", price: "1100000.00", status: "occupied" as const, tenant: "Siti Nur" },
    { code: "106", name: "Kamar 106 Deluxe AC", price: "1100000.00", status: "occupied" as const, tenant: "Dewi Sartika" },
    { code: "107", name: "Kamar 107 Deluxe AC", price: "1100000.00", status: "occupied" as const, tenant: "Maya Anggraini" },
    { code: "108", name: "Kamar 108 Standard", price: "850000.00", status: "occupied" as const, tenant: "Dian Permata" },
    { code: "109", name: "Kamar 109 Standard", price: "850000.00", status: "available" as const, tenant: null },
    { code: "110", name: "Kamar 110 Standard", price: "850000.00", status: "available" as const, tenant: null },
    { code: "201", name: "Kamar 201 Superior", price: "950000.00", status: "occupied" as const, tenant: "Putri Ayu" },
    { code: "202", name: "Kamar 202 Superior", price: "850000.00", status: "occupied" as const, tenant: "Dimas A." },
    { code: "203", name: "Kamar 203 Superior", price: "950000.00", status: "occupied" as const, tenant: "Lestari W." },
    { code: "204", name: "Kamar 204 Superior", price: "950000.00", status: "available" as const, tenant: null },
  ];

  let room104Id = "";
  let room102Id = "";

  // Jatuh tempo: Besok (Dimas A. Kamar 202) dan 3 Hari lagi (Siti Nur Kamar 105)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  for (const r of melatiRoomsData) {
    const [insertedRoom] = await db
      .insert(kostRooms)
      .values({
        kostId: kostMelati.id,
        roomCode: r.code,
        roomName: r.name,
        monthlyPrice: r.price,
        roomStatus: r.status,
      })
      .returning();

    if (r.code === "104") room104Id = insertedRoom.id;
    if (r.code === "102") room102Id = insertedRoom.id;

    if (r.status === "occupied" && r.tenant) {
      let checkOut = nextMonth;
      if (r.code === "202") checkOut = tomorrow;
      if (r.code === "105") checkOut = in3Days;

      await db.insert(roomOccupancies).values({
        kostId: kostMelati.id,
        roomId: insertedRoom.id,
        tenantName: r.tenant,
        checkInDate: "2026-08-01",
        checkOutDate: checkOut,
        occupancyStatus: "active",
      });
    }
  }

  // Kost Griya Cendekia: 8 Kamar (7 Occupied, 1 Available)
  for (let i = 1; i <= 8; i++) {
    const isOccupied = i <= 7;
    const [insertedRoom] = await db
      .insert(kostRooms)
      .values({
        kostId: kostCendekia.id,
        roomCode: `A0${i}`,
        roomName: `Kamar Cendekia A0${i}`,
        monthlyPrice: "950000.00",
        roomStatus: isOccupied ? "occupied" : "available",
      })
      .returning();

    if (isOccupied) {
      await db.insert(roomOccupancies).values({
        kostId: kostCendekia.id,
        roomId: insertedRoom.id,
        tenantName: `Penghuni Cendekia ${i}`,
        checkInDate: "2026-07-01",
        checkOutDate: nextMonth,
        occupancyStatus: "active",
      });
    }
  }

  // Kost Lavender: 4 Kamar (3 Occupied, 1 Available)
  for (let i = 1; i <= 4; i++) {
    const isOccupied = i <= 3;
    const [insertedRoom] = await db
      .insert(kostRooms)
      .values({
        kostId: kostLavender.id,
        roomCode: `L0${i}`,
        roomName: `Kamar Lavender L0${i}`,
        monthlyPrice: "800000.00",
        roomStatus: isOccupied ? "occupied" : "available",
      })
      .returning();

    if (isOccupied) {
      await db.insert(roomOccupancies).values({
        kostId: kostLavender.id,
        roomId: insertedRoom.id,
        tenantName: `Penghuni Lavender ${i}`,
        checkInDate: "2026-09-01",
        checkOutDate: nextMonth,
        occupancyStatus: "active",
      });
    }
  }
  console.log("Total 26 kamar dibuat (21 Terisi, 5 Tersedia = Okupansi 81%).");

  // 7. Buat Ulasan (Reviews)
  // Ulasan 1: Menunggu Verifikasi dari Nabila Putri (Kamar 104)
  await db.insert(reviews).values({
    kostId: kostMelati.id,
    roomId: room104Id,
    reviewerName: "Nabila Putri",
    publicDisplayName: "Nabila P.",
    claimedCheckInDate: "2026-08-01",
    claimedCheckOutDate: "2026-12-15",
    rating: 4,
    comment: "Kamar bersih dan AC dingin. Parkiran motor aman ada CCTV 24 jam.",
    verificationStatus: "verified",
    publicationStatus: "pending",
  });

  // Ulasan 2: Published dari Ani Safitri (Kamar 102)
  await db.insert(reviews).values({
    kostId: kostMelati.id,
    roomId: room102Id,
    reviewerName: "Ani Safitri",
    publicDisplayName: "Ani S.",
    claimedCheckInDate: "2026-06-01",
    claimedCheckOutDate: "2026-11-20",
    rating: 5,
    comment: "Lingkungan tenang banget, dekat kampus UB dan UM. Ibu kostnya sangat ramah.",
    verificationStatus: "verified",
    publicationStatus: "published",
    ownerReply: "Terima kasih banyak Mbak Ani, sukses selalu untuk studinya ya!",
  });
  console.log("Ulasan realita demo ditambahkan.");

  // 8. Catatan Keuangan (Pemasukan: Rp 2.300.000, Pengeluaran: Rp 525.000, Saldo: Rp 1.775.000)
  const todayDateStr = now.toISOString().split("T")[0];
  const date5DaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const date10DaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const date15DaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  await db.insert(financialRecords).values([
    {
      ownerId,
      kostId: kostMelati.id,
      recordType: "income",
      category: "Sewa Kamar",
      description: "Pembayaran Sewa Kamar 104 - Nabila Putri (Bulan Berjalan)",
      amount: "1200000.00",
      transactionDate: date5DaysAgo,
    },
    {
      ownerId,
      kostId: kostMelati.id,
      recordType: "income",
      category: "Sewa Kamar",
      description: "Pembayaran Sewa Kamar 105 - Siti Nur (Bulan Berjalan)",
      amount: "1100000.00",
      transactionDate: date10DaysAgo,
    },
    {
      ownerId,
      kostId: kostMelati.id,
      recordType: "expense",
      category: "Operasional",
      description: "Tagihan Internet WiFi Indihome Paviliun Melati",
      amount: "350000.00",
      transactionDate: date15DaysAgo,
    },
    {
      ownerId,
      kostId: kostMelati.id,
      recordType: "expense",
      category: "Kebersihan",
      description: "Iuran Kebersihan Lingkungan & Pengangkutan Sampah",
      amount: "175000.00",
      transactionDate: date15DaysAgo,
    },
  ]);
  console.log("Catatan keuangan saldo Rp 1.775.000 berhasil disimpan.");

  // 9. Notifikasi Pemilik
  await db.insert(notifications).values([
    {
      recipientUserId: ownerId,
      type: "payment",
      title: "Pembayaran Sewa Diterima",
      message: "Pembayaran sewa Kamar 104 a/n Nabila Putri sebesar Rp 1.200.000 telah masuk ke kas.",
      isRead: false,
    },
    {
      recipientUserId: ownerId,
      type: "review",
      title: "Ulasan Baru Menunggu Verifikasi",
      message: "Nabila Putri (Kamar 104) mengirimkan ulasan baru bintang 4.0.",
      isRead: false,
    },
    {
      recipientUserId: ownerId,
      type: "reminder",
      title: "Jatuh Tempo Sewa Besok",
      message: "Kamar 202 a/n Dimas A. (Kost Paviliun Melati) jatuh tempo besok (Rp 850.000).",
      isRead: true,
    },
  ]);
  console.log("Notifikasi pengingat berhasil ditambahkan.");

  console.log("=== SEED DATA DEMO BU RATNA BERHASIL 100%! ===");
  await sqlClient.end();
}

main().catch(async (err) => {
  console.error("Gagal menjalankan seed demo Bu Ratna:", err);
  await sqlClient.end();
  process.exit(1);
});
