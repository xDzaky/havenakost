"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Owner {
  id: string;
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  approvalStatus: "pending" | "approved" | "rejected" | "suspended";
  rejectionReason?: string;
  created_at: string;
}

interface AdminListing {
  id: string;
  name: string;
  ownerName: string;
  kost_type: "putra" | "putri" | "campur" | "pasutri";
  district: string;
  price_monthly: number;
  status: "pending" | "published" | "rejected" | "archived";
  rejectionReason?: string;
  created_at: string;
}

interface AdminReview {
  id: string;
  kostName: string;
  reviewerName: string;
  rating: number;
  comment: string;
  publicationStatus: "pending" | "published" | "hidden" | "owner_rejected";
  isFlagged: boolean;
  flagReason?: string;
  created_at: string;
}

interface Payment {
  id: string;
  ownerName: string;
  planName: string;
  amount: number;
  method: string;
  proofUrl: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface Plan {
  id: string;
  code: string;
  name: string;
  price: number;
  durationDays: number;
  maxListings: number | null;
  features: string;
  isActive: boolean;
}

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entity: string;
  description: string;
  created_at: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("havena_session");
      if (!stored) {
        router.replace("/login");
        return;
      }
      const parsed = JSON.parse(stored);
      if (parsed.role !== "admin") {
        router.replace("/login");
        return;
      }
      setCurrentUser(parsed);
      setIsLoadingAuth(false);
    } catch (e) {
      router.replace("/login");
    }
  }, [router]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("havena_session");
    } catch (e) {}
    router.replace("/login");
  };

  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "owners"
    | "listings"
    | "reviews"
    | "payments"
    | "plans"
    | "subs"
    | "logs"
    | "system"
  >("overview");

  // Owners list
  const [owners, setOwners] = useState<Owner[]>([
    {
      id: "o-1",
      fullName: "Sari Wulandari",
      businessName: "Wulandari Kost Group",
      email: "sari.wulandari@gmail.com",
      phone: "6281357246680",
      approvalStatus: "pending",
      created_at: "2026-11-14",
    },
    {
      id: "o-2",
      fullName: "Yusuf Maulana",
      businessName: "Paviliun Suhat",
      email: "yusuf.maulana@gmail.com",
      phone: "6285645129031",
      approvalStatus: "pending",
      created_at: "2026-11-15",
    },
    {
      id: "o-3",
      fullName: "Ratna Kusuma Dewi",
      businessName: "Griya Cendekia Syariah",
      email: "ratna.kusuma@gmail.com",
      phone: "6281234567890",
      approvalStatus: "approved",
      created_at: "2026-07-02",
    },
    {
      id: "o-4",
      fullName: "Hendra Wijaya",
      businessName: "Sigura Garden Management",
      email: "hendra.wijaya@gmail.com",
      phone: "6281234567892",
      approvalStatus: "approved",
      created_at: "2026-07-11",
    },
  ]);

  // Listings for moderation
  const [listings, setListings] = useState<AdminListing[]>([
    {
      id: "l-1",
      name: "Kost Putri Sigura Garden",
      ownerName: "Hendra Wijaya",
      kost_type: "putri",
      district: "Lowokwaru",
      price_monthly: 950000,
      status: "pending",
      created_at: "2026-11-15",
    },
    {
      id: "l-2",
      name: "Kost Griya Cendekia Syariah",
      ownerName: "Ratna Kusuma Dewi",
      kost_type: "putri",
      district: "Lowokwaru",
      price_monthly: 1150000,
      status: "published",
      created_at: "2026-07-05",
    },
    {
      id: "l-3",
      name: "Kost Putra Sumbersari Asri",
      ownerName: "Agus Setiawan",
      kost_type: "putra",
      district: "Lowokwaru",
      price_monthly: 850000,
      status: "published",
      created_at: "2026-08-10",
    },
  ]);

  // Reviews for moderation
  const [reviews, setReviews] = useState<AdminReview[]>([
    {
      id: "rv-1",
      kostName: "Kost Sigura-gura Nada",
      reviewerName: "Budi Santoso",
      rating: 1,
      comment: "Penipuan! Nomor WA tidak merespons dan uang muka hangus.",
      publicationStatus: "pending",
      isFlagged: true,
      flagReason: "Laporan tuduhan penipuan tanpa bukti sewa",
      created_at: "2026-11-16",
    },
    {
      id: "rv-2",
      kostName: "Kost Griya Cendekia Syariah",
      reviewerName: "Nabila Putri",
      rating: 4,
      comment: "Kamar bersih dan AC dingin. Parkiran motor aman CCTV 24 jam.",
      publicationStatus: "pending",
      isFlagged: false,
      created_at: "2026-11-16",
    },
    {
      id: "rv-3",
      kostName: "Kost Griya Cendekia Syariah",
      reviewerName: "Ani Safitri",
      rating: 5,
      comment: "Lingkungan tenang banget, cocok buat mahasiswi UM.",
      publicationStatus: "published",
      isFlagged: false,
      created_at: "2026-11-10",
    },
  ]);

  // Payments for verification
  const [payments, setPayments] = useState<Payment[]>([
    {
      id: "pay-1",
      ownerName: "Hendra Wijaya",
      planName: "Paket Featured 6 Bulan",
      amount: 450000,
      method: "Transfer Bank BCA",
      proofUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400",
      status: "pending",
      created_at: "2026-11-17 10:14",
    },
    {
      id: "pay-2",
      ownerName: "Ratna Kusuma Dewi",
      planName: "Paket Featured 6 Bulan",
      amount: 450000,
      method: "Transfer Bank Mandiri",
      proofUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400",
      status: "approved",
      created_at: "2026-07-02 11:30",
    },
  ]);

  // Master Plans
  const [plans] = useState<Plan[]>([
    {
      id: "p-1",
      code: "free-tier",
      name: "Paket Gratis (Dasar)",
      price: 0,
      durationDays: 365,
      maxListings: 1,
      features: "Maksimal 1 listing aktif, urutan jarak reguler, QR ulasan dasar",
      isActive: true,
    },
    {
      id: "p-2",
      code: "reguler-3m",
      name: "Paket Reguler 3 Bulan",
      price: 250000,
      durationDays: 90,
      maxListings: 5,
      features: "Maksimal 5 listing aktif, prioritas pencarian, pembukuan kas",
      isActive: true,
    },
    {
      id: "p-3",
      code: "featured-6m",
      name: "Paket Featured 6 Bulan",
      price: 450000,
      durationDays: 180,
      maxListings: null,
      features: "Unlimited listing, lencana Kost Pilihan, rekomendasi teratas",
      isActive: true,
    },
  ]);

  // Audit Logs
  const [logs, setLogs] = useState<AuditLog[]>([
    {
      id: "log-1",
      actor: "Rizky Pratama (Admin 1)",
      action: "listing.approve",
      entity: "Kost Griya Cendekia Syariah",
      description: "Menyetujui publikasi listing ke direktori publik",
      created_at: "2026-11-16 11:05",
    },
    {
      id: "log-2",
      actor: "Alya Rahmadani (Admin 2)",
      action: "owner.approve",
      entity: "Dewi Anggraini",
      description: "Verifikasi dokumen KTP & setujui akun pemilik",
      created_at: "2026-11-15 16:42",
    },
  ]);

  // Action helpers
  const addLog = (action: string, entity: string, description: string) => {
    const entry: AuditLog = {
      id: "log-" + (logs.length + 1),
      actor: "Super Admin (Rizky Pratama)",
      action,
      entity,
      description,
      created_at: new Date().toISOString().slice(0, 16).replace("T", " "),
    };
    setLogs([entry, ...logs]);
  };

  const handleApproveOwner = (id: string, name: string) => {
    setOwners(
      owners.map((o) => (o.id === id ? { ...o, approvalStatus: "approved" } : o)),
    );
    addLog("owner.approve", name, "Menyetujui akun pemilik kost");
    alert(`Akun mitra ${name} berhasil disetujui!`);
  };

  const handleRejectOwner = (id: string, name: string) => {
    const reason = prompt(
      "Masukkan alasan penolakan akun mitra (wajib 5-500 karakter):",
      "Dokumen KTP tidak jelas / alamat usaha tidak valid",
    );
    if (!reason) return;
    setOwners(
      owners.map((o) =>
        o.id === id
          ? { ...o, approvalStatus: "rejected", rejectionReason: reason }
          : o,
      ),
    );
    addLog("owner.reject", name, `Menolak akun pemilik: ${reason}`);
    alert(`Akun mitra ${name} ditolak.`);
  };

  const handleSuspendOwner = (id: string, name: string) => {
    const confirm = window.confirm(
      `Yakin ingin menangguhkan (SUSPEND) akun ${name}? Semua listing akan diarsipkan dan akses akun akan dikunci.`,
    );
    if (!confirm) return;
    setOwners(
      owners.map((o) =>
        o.id === id ? { ...o, approvalStatus: "suspended" } : o,
      ),
    );
    addLog("owner.suspend", name, "Menangguhkan akun mitra pelanggar");
    alert(`Akun mitra ${name} telah ditangguhkan.`);
  };

  const handleApproveListing = (id: string, name: string) => {
    setListings(
      listings.map((l) => (l.id === id ? { ...l, status: "published" } : l)),
    );
    addLog("listing.approve", name, "Menyetujui dan mempublikasikan listing");
    alert(`Listing ${name} berhasil disetujui dan langsung tayang di web publik!`);
  };

  const handleRejectListing = (id: string, name: string) => {
    const reason = prompt(
      "Masukkan alasan penolakan listing (wajib diisi):",
      "Foto kamar buram / deskripsi fasilitas tidak lengkap",
    );
    if (!reason) return;
    setListings(
      listings.map((l) =>
        l.id === id
          ? { ...l, status: "rejected", rejectionReason: reason }
          : l,
      ),
    );
    addLog("listing.reject", name, `Menolak listing: ${reason}`);
    alert(`Listing ${name} ditolak.`);
  };

  const handlePublishReview = (id: string, reviewer: string) => {
    setReviews(
      reviews.map((r) =>
        r.id === id ? { ...r, publicationStatus: "published" } : r,
      ),
    );
    addLog("review.publish", reviewer, "Mempublikasikan ulasan penghuni");
    alert(`Ulasan dari ${reviewer} berhasil diterbitkan!`);
  };

  const handleHideReview = (id: string, reviewer: string) => {
    const reason = prompt("Alasan menyembunyikan ulasan:", "Mengandung kata kasar/spam");
    if (!reason) return;
    setReviews(
      reviews.map((r) =>
        r.id === id ? { ...r, publicationStatus: "hidden" } : r,
      ),
    );
    addLog("review.hide", reviewer, `Menyembunyikan ulasan: ${reason}`);
    alert(`Ulasan dari ${reviewer} disembunyikan.`);
  };

  const handleApprovePayment = (id: string, ownerName: string, planName: string) => {
    setPayments(
      payments.map((p) => (p.id === id ? { ...p, status: "approved" } : p)),
    );
    addLog(
      "payment.approve",
      ownerName,
      `Menyetujui pembayaran ${planName} dan memperpanjang masa aktif`,
    );
    alert(`Pembayaran dari ${ownerName} berhasil disetujui! Paket langganan telah diaktifkan.`);
  };

  const pendingOwners = owners.filter((o) => o.approvalStatus === "pending");
  const pendingListings = listings.filter((l) => l.status === "pending");
  const pendingReviews = reviews.filter((r) => r.publicationStatus === "pending");
  const pendingPayments = payments.filter((p) => p.status === "pending");

  const fmtRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

  if (isLoadingAuth) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--teal-950)" }}>Memverifikasi sesi Super Admin...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-layout">
      {/* ADMIN SIDEBAR */}
      <aside className="dash-sidebar">
        <Link href="/" className="dash-brand">
          <img
            src="/image/HavenaKost.svg"
            alt="Havena Kost"
            className="brand-logo-img"
            style={{ height: 36 }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "var(--teal)",
              background: "#E0F2FE",
              padding: "2px 8px",
              borderRadius: 6,
              border: "1px solid #BAE6FD",
            }}
          >
            SUPER ADMIN
          </span>
        </Link>

        <nav className="dash-nav">
          <button
            type="button"
            className={`dash-nav-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <svg
              className="ic"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
            Ringkasan
          </button>

          <button
            type="button"
            className={`dash-nav-btn ${activeTab === "owners" ? "active" : ""}`}
            onClick={() => setActiveTab("owners")}
          >
            <svg
              className="ic"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Pemilik Kost
            {pendingOwners.length > 0 && (
              <span className="badge-pill">{pendingOwners.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`dash-nav-btn ${activeTab === "listings" ? "active" : ""}`}
            onClick={() => setActiveTab("listings")}
          >
            <svg
              className="ic"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
              <path d="M9.5 21v-6h5v6" />
            </svg>
            Moderasi Listing
            {pendingListings.length > 0 && (
              <span className="badge-pill">{pendingListings.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`dash-nav-btn ${activeTab === "reviews" ? "active" : ""}`}
            onClick={() => setActiveTab("reviews")}
          >
            <svg
              className="ic"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            Moderasi Ulasan
            {pendingReviews.length > 0 && (
              <span className="badge-pill">{pendingReviews.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`dash-nav-btn ${activeTab === "payments" ? "active" : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            <svg
              className="ic"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Pembayaran
            {pendingPayments.length > 0 && (
              <span className="badge-pill">{pendingPayments.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`dash-nav-btn ${activeTab === "plans" ? "active" : ""}`}
            onClick={() => setActiveTab("plans")}
          >
            <svg
              className="ic"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Paket Langganan
          </button>

          <button
            type="button"
            className={`dash-nav-btn ${activeTab === "subs" ? "active" : ""}`}
            onClick={() => setActiveTab("subs")}
          >
            <svg
              className="ic"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 17.5 4.5 8l4.5 4L12 5.5 15 12l4.5-4L21 17.5Z" />
              <path d="M4.5 21h15" />
            </svg>
            Langganan Pemilik
          </button>

          <button
            type="button"
            className={`dash-nav-btn ${activeTab === "logs" ? "active" : ""}`}
            onClick={() => setActiveTab("logs")}
          >
            <svg
              className="ic"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Audit Log
          </button>

          <button
            type="button"
            className={`dash-nav-btn ${activeTab === "system" ? "active" : ""}`}
            onClick={() => setActiveTab("system")}
          >
            <svg
              className="ic"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="2" width="20" height="8" rx="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
            Sistem & Health
          </button>
        </nav>

        <div className="dash-user-foot">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--teal-950)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {(currentUser?.name || "Admin").charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: "var(--teal-950)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentUser?.name || "Super Admin Havena"}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--mut)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentUser?.email || "admin@havenakost.id"}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Keluar (Logout)"
            style={{
              background: "none",
              border: "none",
              color: "#EF4444",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: 4,
            }}
          >
            <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
          <Link
            href="/"
            title="Ke Halaman Publik"
            style={{ color: "var(--mut)", display: "flex", padding: 4 }}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Link>
        </div>
      </aside>

      {/* ADMIN MAIN CONTENT */}
      <main className="dash-main">
        {/* 1. OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Pusat Kendali Super Admin</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Monitoring operasional direktori Havena Kost di seluruh wilayah
                  Malang Raya.
                </p>
              </div>
            </div>

            {/* ANTREAN KERJA MENDESAK */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div
                className="dash-table-card"
                style={{
                  padding: 18,
                  borderLeft: "4px solid var(--amber)",
                  cursor: "pointer",
                }}
                onClick={() => setActiveTab("owners")}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--mut)" }}>
                  PEMILIK MENUNGGU APPROVAL
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "var(--amber-dark)",
                    marginTop: 4,
                  }}
                >
                  {pendingOwners.length}
                </div>
                <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>
                  Klik untuk meninjau identitas mitra
                </div>
              </div>

              <div
                className="dash-table-card"
                style={{
                  padding: 18,
                  borderLeft: "4px solid var(--teal)",
                  cursor: "pointer",
                }}
                onClick={() => setActiveTab("listings")}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--mut)" }}>
                  LISTING MENUNGGU PUBLIKASI
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "var(--teal)",
                    marginTop: 4,
                  }}
                >
                  {pendingListings.length}
                </div>
                <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>
                  Perlu kurasi foto & data unit
                </div>
              </div>

              <div
                className="dash-table-card"
                style={{
                  padding: 18,
                  borderLeft: "4px solid var(--emerald)",
                  cursor: "pointer",
                }}
                onClick={() => setActiveTab("payments")}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--mut)" }}>
                  PEMBAYARAN PERLU VERIFIKASI
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "var(--emerald-dark)",
                    marginTop: 4,
                  }}
                >
                  {pendingPayments.length}
                </div>
                <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>
                  Bukti transfer langganan mitra
                </div>
              </div>

              <div
                className="dash-table-card"
                style={{
                  padding: 18,
                  borderLeft: "4px solid var(--rose)",
                  cursor: "pointer",
                }}
                onClick={() => setActiveTab("reviews")}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--mut)" }}>
                  ULASAN PENDING / FLAGGED
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "var(--rose-dark)",
                    marginTop: 4,
                  }}
                >
                  {pendingReviews.length}
                </div>
                <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>
                  Cek laporan ulasan bermasalah
                </div>
              </div>
            </div>

            {/* TOTAL STATISTIK */}
            <div className="dash-grid-kpi">
              <div className="dash-kpi-card">
                <div className="kpi-label">Total Pemilik Terdaftar</div>
                <div className="kpi-num">{owners.length}</div>
              </div>
              <div className="dash-kpi-card">
                <div className="kpi-label">Listing Terverifikasi</div>
                <div className="kpi-num" style={{ color: "var(--emerald)" }}>
                  {listings.filter((l) => l.status === "published").length}
                </div>
              </div>
              <div className="dash-kpi-card">
                <div className="kpi-label">Total Ulasan Masuk</div>
                <div className="kpi-num">{reviews.length}</div>
              </div>
              <div className="dash-kpi-card">
                <div className="kpi-label">Langganan Aktif</div>
                <div className="kpi-num" style={{ color: "var(--wa-dark)" }}>
                  {payments.filter((p) => p.status === "approved").length}
                </div>
              </div>
            </div>

            {/* AUDIT PREVIEW */}
            <div className="dash-table-card">
              <div className="dt-head">
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "var(--teal-950)",
                  }}
                >
                  Aktivitas Pengelola Terbaru (Audit Trail)
                </h3>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActiveTab("logs")}
                >
                  Buka Seluruh Log
                </button>
              </div>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Pelaku</th>
                    <th>Aksi</th>
                    <th>Target Entitas</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 4).map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: 11.5 }}>{log.created_at}</td>
                      <td>
                        <b>{log.actor}</b>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: 6,
                            background: "var(--bg)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td>{log.entity}</td>
                      <td>{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. PEMILIK KOST TAB */}
        {activeTab === "owners" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Manajemen Akun Pemilik Kost</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Tinjau identitas mitra pendaftar, setujui akun, atau tangguhkan
                  akun yang melanggar.
                </p>
              </div>
            </div>

            <div className="dash-table-card">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Nama Lengkap</th>
                    <th>Nama Usaha</th>
                    <th>Kontak Email / WA</th>
                    <th>Status Approval</th>
                    <th>Tanggal Daftar</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <b>{o.fullName}</b>
                      </td>
                      <td>{o.businessName}</td>
                      <td>
                        <div>{o.email}</div>
                        <div style={{ fontSize: 11, color: "var(--mut)" }}>
                          +{o.phone}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: 10.5,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            background:
                              o.approvalStatus === "approved"
                                ? "var(--wa-soft)"
                                : o.approvalStatus === "pending"
                                  ? "var(--gold-soft)"
                                  : "var(--rose-soft)",
                            color:
                              o.approvalStatus === "approved"
                                ? "var(--wa-dark)"
                                : o.approvalStatus === "pending"
                                  ? "var(--gold-dark)"
                                  : "var(--rose-dark)",
                          }}
                        >
                          {o.approvalStatus}
                        </span>
                      </td>
                      <td>{o.created_at}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {o.approvalStatus === "pending" && (
                            <>
                              <button
                                className="btn btn-emerald btn-sm"
                                onClick={() =>
                                  handleApproveOwner(o.id, o.fullName)
                                }
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-line btn-sm"
                                onClick={() =>
                                  handleRejectOwner(o.id, o.fullName)
                                }
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {o.approvalStatus === "approved" && (
                            <button
                              className="btn btn-line btn-sm"
                              style={{ color: "var(--rose)" }}
                              onClick={() =>
                                handleSuspendOwner(o.id, o.fullName)
                              }
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. MODERASI LISTING TAB */}
        {activeTab === "listings" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Moderasi Publikasi Listing</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Kurasi keabsahan data listing kost sebelum ditayangkan ke
                  pengunjung umum.
                </p>
              </div>
            </div>

            <div className="dash-table-card">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Nama Unit Kost</th>
                    <th>Pemilik</th>
                    <th>Kecamatan</th>
                    <th>Tipe</th>
                    <th>Harga Sewa</th>
                    <th>Status</th>
                    <th>Aksi Kurasi</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <b>{l.name}</b>
                      </td>
                      <td>{l.ownerName}</td>
                      <td>{l.district}</td>
                      <td>
                        <span style={{ textTransform: "capitalize" }}>
                          {l.kost_type}
                        </span>
                      </td>
                      <td>
                        <b>{fmtRp(l.price_monthly)}</b>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: 10.5,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            background:
                              l.status === "published"
                                ? "var(--wa-soft)"
                                : l.status === "pending"
                                  ? "var(--gold-soft)"
                                  : "var(--line)",
                            color:
                              l.status === "published"
                                ? "var(--wa-dark)"
                                : l.status === "pending"
                                  ? "var(--gold-dark)"
                                  : "var(--mut)",
                          }}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {l.status === "pending" && (
                            <>
                              <button
                                className="btn btn-emerald btn-sm"
                                onClick={() =>
                                  handleApproveListing(l.id, l.name)
                                }
                              >
                                Setujui / Publish
                              </button>
                              <button
                                className="btn btn-line btn-sm"
                                onClick={() =>
                                  handleRejectListing(l.id, l.name)
                                }
                              >
                                Tolak
                              </button>
                            </>
                          )}
                          {l.status === "published" && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--wa-dark)",
                                fontWeight: 700,
                              }}
                            >
                              ● Tayang Publik
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. MODERASI ULASAN TAB */}
        {activeTab === "reviews" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Moderasi Ulasan Pengunjung & Penghuni</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Tinjau ulasan bermasalah, laporan kata kasar/penipuan, atau
                  lakukan override penolakan pemilik.
                </p>
              </div>
            </div>

            <div className="dash-table-card">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Kost & Pengulas</th>
                    <th>Rating</th>
                    <th>Isi Ulasan</th>
                    <th>Tanda Khusus</th>
                    <th>Status</th>
                    <th>Aksi Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.reviewerName}</b>
                        <div style={{ fontSize: 11, color: "var(--mut)" }}>
                          {r.kostName}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: "var(--gold-dark)", fontWeight: 800 }}>
                          ★ {r.rating}.0
                        </span>
                      </td>
                      <td style={{ maxWidth: 320 }}>"{r.comment}"</td>
                      <td>
                        {r.isFlagged ? (
                          <span
                            style={{
                              padding: "2px 7px",
                              borderRadius: 6,
                              background: "var(--rose-soft)",
                              color: "var(--rose-dark)",
                              fontSize: 10.5,
                              fontWeight: 800,
                            }}
                          >
                            Laporan: {r.flagReason}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--faint)" }}>
                            Normal
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: 10.5,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            background:
                              r.publicationStatus === "published"
                                ? "var(--wa-soft)"
                                : "var(--gold-soft)",
                            color:
                              r.publicationStatus === "published"
                                ? "var(--wa-dark)"
                                : "var(--gold-dark)",
                          }}
                        >
                          {r.publicationStatus}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {r.publicationStatus !== "published" && (
                            <button
                              className="btn btn-emerald btn-sm"
                              onClick={() =>
                                handlePublishReview(r.id, r.reviewerName)
                              }
                            >
                              Publikasikan
                            </button>
                          )}
                          <button
                            className="btn btn-line btn-sm"
                            onClick={() =>
                              handleHideReview(r.id, r.reviewerName)
                            }
                          >
                            Sembunyikan
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. PEMBAYARAN LANGGANAN TAB */}
        {activeTab === "payments" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Persetujuan Pembayaran Langganan Mitra</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Verifikasi bukti transfer bank sebelum mengaktifkan kuota paket
                  mitra.
                </p>
              </div>
            </div>

            <div className="dash-table-card">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Pemilik Mitra</th>
                    <th>Paket Dipilih</th>
                    <th>Nominal</th>
                    <th>Metode & Bukti</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontSize: 11.5 }}>{p.created_at}</td>
                      <td>
                        <b>{p.ownerName}</b>
                      </td>
                      <td>{p.planName}</td>
                      <td>
                        <b>{fmtRp(p.amount)}</b>
                      </td>
                      <td>
                        <div>{p.method}</div>
                        <a
                          href={p.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 11,
                            color: "var(--emerald-dark)",
                            fontWeight: 700,
                          }}
                        >
                          Lihat Bukti Transfer ↗
                        </a>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: 10.5,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            background:
                              p.status === "approved"
                                ? "var(--wa-soft)"
                                : "var(--gold-soft)",
                            color:
                              p.status === "approved"
                                ? "var(--wa-dark)"
                                : "var(--gold-dark)",
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td>
                        {p.status === "pending" && (
                          <button
                            className="btn btn-emerald btn-sm"
                            onClick={() =>
                              handleApprovePayment(p.id, p.ownerName, p.planName)
                            }
                          >
                            Setujui & Aktifkan
                          </button>
                        )}
                        {p.status === "approved" && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--wa-dark)",
                              fontWeight: 700,
                            }}
                          >
                            ✓ Terverifikasi
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. PAKET LANGGANAN TAB */}
        {activeTab === "plans" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Master Paket Langganan Mitra</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Atur harga, durasi, kuota listing, dan fasilitas paket untuk
                  pemilik kost.
                </p>
              </div>
            </div>

            <div className="dash-table-card">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama Paket</th>
                    <th>Harga (Rp)</th>
                    <th>Durasi</th>
                    <th>Batas Listing</th>
                    <th>Fasilitas</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((pl) => (
                    <tr key={pl.id}>
                      <td>
                        <code>{pl.code}</code>
                      </td>
                      <td>
                        <b>{pl.name}</b>
                      </td>
                      <td>
                        <b>{pl.price === 0 ? "Gratis" : fmtRp(pl.price)}</b>
                      </td>
                      <td>{pl.durationDays} hari</td>
                      <td>
                        {pl.maxListings ? `${pl.maxListings} unit` : "Unlimited"}
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 260 }}>
                        {pl.features}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: 6,
                            background: "var(--wa-soft)",
                            color: "var(--wa-dark)",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          Aktif
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. LANGGANAN PEMILIK TAB */}
        {activeTab === "subs" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Daftar Langganan Pemilik Aktif</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Pantau mitra kost yang sedang berlangganan paket featured dan
                  reguler.
                </p>
              </div>
            </div>

            <div className="dash-table-card">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Nama Pemilik</th>
                    <th>Paket</th>
                    <th>Mulai</th>
                    <th>Berakhir</th>
                    <th>Sisa Hari</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <b>Ratna Kusuma Dewi</b>
                    </td>
                    <td>Paket Featured 6 Bulan</td>
                    <td>02 Juli 2026</td>
                    <td>31 Des 2026</td>
                    <td>43 hari</td>
                    <td>
                      <span
                        style={{
                          padding: "2px 7px",
                          borderRadius: 6,
                          background: "var(--wa-soft)",
                          color: "var(--wa-dark)",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        Aktif
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <b>Hendra Wijaya</b>
                    </td>
                    <td>Paket Featured 6 Bulan</td>
                    <td>11 Juli 2026</td>
                    <td>20 Jan 2027</td>
                    <td>63 hari</td>
                    <td>
                      <span
                        style={{
                          padding: "2px 7px",
                          borderRadius: 6,
                          background: "var(--wa-soft)",
                          color: "var(--wa-dark)",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        Aktif
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. AUDIT LOG TAB */}
        {activeTab === "logs" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Jejak Audit Aktivitas Pengelola</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Seluruh aksi moderasi, persetujuan, penolakan, dan mutasi data
                  tercatat permanen.
                </p>
              </div>
            </div>

            <div className="dash-table-card">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Waktu Kejadian</th>
                    <th>Pelaku / Aktor</th>
                    <th>Jenis Aksi</th>
                    <th>Target Entitas</th>
                    <th>Rincian Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontSize: 11.5 }}>{l.created_at}</td>
                      <td>
                        <b>{l.actor}</b>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: 6,
                            background: "var(--bg)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                          }}
                        >
                          {l.action}
                        </span>
                      </td>
                      <td>{l.entity}</td>
                      <td>{l.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 9. SISTEM & HEALTH TAB */}
        {activeTab === "system" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Status Sistem &amp; Koneksi Server</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Informasi teknis database PostgreSQL Neon, ekstensi PostGIS,
                  dan lingkungan runtime.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              <div className="dash-table-card" style={{ padding: 22 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "var(--wa)",
                    }}
                  />
                  <h3 style={{ fontSize: 16, fontWeight: 800 }}>
                    PostgreSQL Server
                  </h3>
                </div>
                <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.8 }}>
                  <div>
                    Status: <b style={{ color: "var(--wa-dark)" }}>Operational (Connected)</b>
                  </div>
                  <div>
                    Provider: <b>Neon Serverless Postgres</b>
                  </div>
                  <div>
                    Koneksi: <b>Pooler SSL enabled</b>
                  </div>
                  <div>
                    Latency: <b>~24 ms</b>
                  </div>
                </div>
              </div>

              <div className="dash-table-card" style={{ padding: 22 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "var(--wa)",
                    }}
                  />
                  <h3 style={{ fontSize: 16, fontWeight: 800 }}>
                    PostGIS Spatial Engine
                  </h3>
                </div>
                <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.8 }}>
                  <div>
                    Status: <b style={{ color: "var(--wa-dark)" }}>Installed & Active</b>
                  </div>
                  <div>
                    PostGIS Version: <b>3.4.2</b>
                  </div>
                  <div>
                    Spatial Ref (SRID): <b>4326 (WGS 84)</b>
                  </div>
                  <div>
                    Geographic Distance: <b>ST_DistanceSphere Enabled</b>
                  </div>
                </div>
              </div>

              <div className="dash-table-card" style={{ padding: 22 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "var(--wa)",
                    }}
                  />
                  <h3 style={{ fontSize: 16, fontWeight: 800 }}>
                    Next.js Runtime
                  </h3>
                </div>
                <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.8 }}>
                  <div>
                    Version: <b>Next.js 16.4.6 (App Router)</b>
                  </div>
                  <div>
                    Bundler: <b>Turbopack Rust</b>
                  </div>
                  <div>
                    Node Version: <b>24.x</b>
                  </div>
                  <div>
                    Auth: <b>Better Auth v1.7.25</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
