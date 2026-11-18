"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Listing {
  id: string;
  name: string;
  kost_type: "putra" | "putri" | "campur" | "pasutri";
  price_monthly: number;
  available_rooms: number;
  total_rooms: number;
  district: string;
  region: string;
  status: "draft" | "pending" | "published" | "rejected" | "archived";
  rejection_reason?: string;
  photo_url?: string;
  payment_periods: string[];
}

interface Review {
  id: string;
  kost_name: string;
  room_number: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  stay_period: string;
  verification_status: "verified" | "unverified" | "owner_rejected";
  publication_status: "pending" | "published" | "hidden";
  owner_reply?: string;
  created_at: string;
}

interface Transaction {
  id: string;
  date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  kost_name: string;
  notes: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "listing" | "review" | "subscription" | "system";
  is_read: boolean;
  created_at: string;
}

export default function OwnerDashboard() {
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
      if (parsed.role !== "owner" && parsed.role !== "admin") {
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
    "dash" | "listings" | "reviews" | "finance" | "subs" | "notif" | "profile"
  >("dash");

  // Account status
  const [approvalStatus, setApprovalStatus] = useState<
    "pending" | "approved" | "rejected" | "suspended"
  >("approved");
  const [rejectionReason] = useState(
    "Data KTP dan izin usaha perlu dilengkapi kembali.",
  );

  // Profile data
  const [profile, setProfile] = useState({
    fullName: "Ratna Kusuma Dewi",
    businessName: "Griya Cendekia Management",
    phone: "6281234567890",
    email: "ratna.kusuma@gmail.com",
    address: "Jl. Bendungan Sigura-gura No. 14, Lowokwaru, Kota Malang",
  });

  // Listings state
  const [listings, setListings] = useState<Listing[]>([
    {
      id: "k-1",
      name: "Kost Griya Cendekia Syariah",
      kost_type: "putri",
      price_monthly: 1150000,
      available_rooms: 2,
      total_rooms: 12,
      district: "Lowokwaru",
      region: "Kota Malang",
      status: "published",
      photo_url:
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=72",
      payment_periods: ["Bulanan", "Per 3 Bulan", "Tahunan"],
    },
    {
      id: "k-2",
      name: "Kost Putri Sigura Garden",
      kost_type: "putri",
      price_monthly: 950000,
      available_rooms: 3,
      total_rooms: 8,
      district: "Lowokwaru",
      region: "Kota Malang",
      status: "pending",
      photo_url:
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=72",
      payment_periods: ["Bulanan", "Tahunan"],
    },
    {
      id: "k-3",
      name: "Paviliun Cendekia 2",
      kost_type: "campur",
      price_monthly: 1400000,
      available_rooms: 0,
      total_rooms: 6,
      district: "Sukun",
      region: "Kota Malang",
      status: "draft",
      photo_url:
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=72",
      payment_periods: ["Bulanan"],
    },
  ]);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([
    {
      id: "r-1",
      kost_name: "Kost Griya Cendekia Syariah",
      room_number: "Kamar A-02",
      reviewer_name: "Ani Safitri",
      rating: 5,
      comment:
        "Lingkungan tenang banget, cocok buat mahasiswi UM yang butuh fokus skripsi. Ibu kost ramah dan WiFi kencang.",
      stay_period: "Agustus 2025 - Juli 2026",
      verification_status: "verified",
      publication_status: "published",
      owner_reply: "Terima kasih banyak Mbak Ani, sukses selalu untuk studinya!",
      created_at: "2026-11-10",
    },
    {
      id: "r-2",
      kost_name: "Kost Griya Cendekia Syariah",
      room_number: "Kamar B-05",
      reviewer_name: "Nabila Putri",
      rating: 4,
      comment:
        "Kamar bersih dan AC dingin. Parkiran motor aman ada CCTV 24 jam.",
      stay_period: "September 2025 - Sekarang",
      verification_status: "unverified",
      publication_status: "pending",
      created_at: "2026-11-16",
    },
  ]);

  // Finances state
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "t-1",
      date: "2026-11-01",
      type: "income",
      category: "Sewa Bulanan",
      amount: 1150000,
      kost_name: "Kost Griya Cendekia Syariah",
      notes: "Sewa Kamar A-02 Ani Safitri",
    },
    {
      id: "t-2",
      date: "2026-11-03",
      type: "income",
      category: "Sewa Bulanan",
      amount: 1150000,
      kost_name: "Kost Griya Cendekia Syariah",
      notes: "Sewa Kamar A-03 Riska",
    },
    {
      id: "t-3",
      date: "2026-11-05",
      type: "expense",
      category: "Tagihan WiFi",
      amount: 375000,
      kost_name: "Kost Griya Cendekia Syariah",
      notes: "IndiHome 100 Mbps",
    },
    {
      id: "t-4",
      date: "2026-11-08",
      type: "expense",
      category: "Kebersihan & Sampah",
      amount: 150000,
      kost_name: "Kost Griya Cendekia Syariah",
      notes: "Iuran RT & Angkut Sampah",
    },
  ]);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "n-1",
      title: "Ulasan Baru Masuk",
      message:
        "Nabila Putri mengirim ulasan untuk Kamar B-05. Mohon verifikasi data penghuni.",
      type: "review",
      is_read: false,
      created_at: "2026-11-16 14:20",
    },
    {
      id: "n-2",
      title: "Listing Sedang Ditinjau",
      message: "Kost Putri Sigura Garden telah diajukan ke tim Super Admin.",
      type: "listing",
      is_read: true,
      created_at: "2026-11-15 09:12",
    },
    {
      id: "n-3",
      title: "Paket Langganan Aktif",
      message:
        "Paket Prioritas 6 Bulan aktif hingga 31 Desember 2026 (Sisa 43 hari).",
      type: "subscription",
      is_read: true,
      created_at: "2026-11-01 10:00",
    },
  ]);

  // Modals & form state
  const [showAddListing, setShowAddListing] = useState(false);
  const [newKost, setNewKost] = useState({
    name: "",
    kost_type: "putri" as const,
    price_monthly: 1000000,
    address: "",
    district: "Lowokwaru",
    region: "Kota Malang",
    description: "",
    total_rooms: 8,
    whatsapp: "6281234567890",
  });

  const [showAddTx, setShowAddTx] = useState(false);
  const [newTx, setNewTx] = useState({
    type: "income" as "income" | "expense",
    category: "Sewa Bulanan",
    amount: 1000000,
    date: new Date().toISOString().slice(0, 10),
    kost_name: "Kost Griya Cendekia Syariah",
    notes: "",
  });

  const [showReplyModal, setShowReplyModal] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const [showVerifyModal, setShowVerifyModal] = useState<Review | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const [showPayModal, setShowPayModal] = useState(false);
  const [payPlan, setPayPlan] = useState("Paket Featured 6 Bulan (Rp 450.000)");
  const [proofUrl, setProofUrl] = useState("");

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const fmtRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

  const handleAddListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKost.name.trim()) return;
    const item: Listing = {
      id: "k-" + (listings.length + 1),
      name: newKost.name,
      kost_type: newKost.kost_type,
      price_monthly: Number(newKost.price_monthly),
      available_rooms: newKost.total_rooms,
      total_rooms: newKost.total_rooms,
      district: newKost.district,
      region: newKost.region,
      status: "draft",
      photo_url:
        "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=400&q=72",
      payment_periods: ["Bulanan"],
    };
    setListings([...listings, item]);
    setShowAddListing(false);
    alert(
      "Draft listing baru berhasil dibuat! Anda dapat melengkapi fasilitas dan mengajukan publikasi.",
    );
  };

  const handleSubmitListing = (id: string) => {
    if (approvalStatus !== "approved") {
      alert("Akun Anda belum disetujui admin untuk mengajukan listing.");
      return;
    }
    setListings(
      listings.map((l) => (l.id === id ? { ...l, status: "pending" } : l)),
    );
    alert(
      "Listing berhasil diajukan ke tim Super Admin Havena untuk ditinjau.",
    );
  };

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    const item: Transaction = {
      id: "t-" + (transactions.length + 1),
      date: newTx.date,
      type: newTx.type,
      category: newTx.category,
      amount: Number(newTx.amount),
      kost_name: newTx.kost_name,
      notes: newTx.notes,
    };
    setTransactions([item, ...transactions]);
    setShowAddTx(false);
  };

  const handleVerifyReview = () => {
    if (!showVerifyModal) return;
    setReviews(
      reviews.map((r) =>
        r.id === showVerifyModal.id
          ? {
              ...r,
              verification_status: "verified",
              publication_status: "published",
            }
          : r,
      ),
    );
    setShowVerifyModal(null);
    setOverrideReason("");
    alert("Ulasan berhasil diverifikasi dan diterbitkan di halaman publik!");
  };

  const handleRejectReview = (id: string) => {
    const reason = prompt(
      "Masukkan alasan penolakan ulasan (akan ditinjau admin):",
      "Nama tidak terdaftar sebagai penghuni",
    );
    if (!reason) return;
    setReviews(
      reviews.map((r) =>
        r.id === id ? { ...r, verification_status: "owner_rejected" } : r,
      ),
    );
    alert("Ulasan ditolak dan diteruskan ke admin untuk tinjauan akhir.");
  };

  const handleSendReply = () => {
    if (!showReplyModal || !replyText.trim()) return;
    setReviews(
      reviews.map((r) =>
        r.id === showReplyModal ? { ...r, owner_reply: replyText.trim() } : r,
      ),
    );
    setShowReplyModal(null);
    setReplyText("");
    alert("Balasan ulasan berhasil disimpan!");
  };

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
  };

  if (isLoadingAuth) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--teal-950)" }}>Memverifikasi sesi login...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-layout">
      {/* SIDEBAR */}
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
              color: "var(--emerald)",
              background: "var(--emerald-soft2)",
              padding: "2px 8px",
              borderRadius: 6,
              border: "1px solid var(--emerald-soft)",
            }}
          >
            MITRA
          </span>
        </Link>

        <nav className="dash-nav">
          <button
            type="button"
            className={`dash-nav-btn ${activeTab === "dash" ? "active" : ""}`}
            onClick={() => setActiveTab("dash")}
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
            Beranda
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
            Listing Saya
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--mut)",
              }}
            >
              {listings.length}
            </span>
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
            Ulasan
            {reviews.some((r) => r.publication_status === "pending") && (
              <span className="badge-pill">Baru</span>
            )}
          </button>

          <button
            type="button"
            className={`dash-nav-btn ${activeTab === "finance" ? "active" : ""}`}
            onClick={() => setActiveTab("finance")}
          >
            <svg
              className="ic"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18" />
              <circle cx="16" cy="14" r="1.5" />
            </svg>
            Keuangan
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
            Langganan
          </button>

          <button
            type="button"
            className={`dash-nav-btn ${activeTab === "notif" ? "active" : ""}`}
            onClick={() => setActiveTab("notif")}
          >
            <svg
              className="ic"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Notifikasi
            {unreadCount > 0 && (
              <span className="badge-pill">{unreadCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`dash-nav-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <svg
              className="ic"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4.5 20.5c0-3.8 3.3-6.5 7.5-6.5s7.5 2.7 7.5 6.5" />
            </svg>
            Profil Mitra
          </button>
        </nav>

        <div className="dash-user-foot">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--teal)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {(currentUser?.name || profile.fullName).charAt(0)}
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
              {currentUser?.name || profile.fullName}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--mut)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentUser?.email || profile.email}
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

      {/* MAIN CONTENT AREA */}
      <main className="dash-main">
        {/* BANNER STATUS SESUAI SPESIFIKASI */}
        {approvalStatus === "pending" && (
          <div className="dash-banner warn">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <b>Akun Anda Sedang Ditinjau Admin:</b> Anda dapat menyiapkan
              draft listing dan kamar, tetapi belum bisa mengajukan listing ke
              publik.
            </div>
          </div>
        )}
        {approvalStatus === "rejected" && (
          <div className="dash-banner danger">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <div>
              <b>Akun Ditolak:</b> {rejectionReason} — Listing yang pernah tayang
              telah diarsipkan.
            </div>
          </div>
        )}

        {/* 1. BERANDA TAB */}
        {activeTab === "dash" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Ringkasan Pengelolaan Kost</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Pantau performa okupansi kamar, ulasan penghuni, dan arus kas
                  kost Anda.
                </p>
              </div>
              <button
                className="btn btn-emerald btn-sm"
                onClick={() => setShowAddListing(true)}
              >
                + Tambah Unit Kost
              </button>
            </div>

            {/* KPI CARDS */}
            <div className="dash-grid-kpi">
              <div className="dash-kpi-card">
                <div className="kpi-label">Listing Aktif</div>
                <div className="kpi-num" style={{ color: "var(--emerald)" }}>
                  {listings.filter((l) => l.status === "published").length}
                </div>
                <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>
                  dari {listings.length} total properti
                </div>
              </div>

              <div className="dash-kpi-card">
                <div className="kpi-label">Kamar Tersedia</div>
                <div className="kpi-num" style={{ color: "var(--teal)" }}>
                  {listings.reduce((s, l) => s + l.available_rooms, 0)} /{" "}
                  {listings.reduce((s, l) => s + l.total_rooms, 0)}
                </div>
                <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>
                  okupansi{" "}
                  {Math.round(
                    ((listings.reduce((s, l) => s + l.total_rooms, 0) -
                      listings.reduce((s, l) => s + l.available_rooms, 0)) /
                      Math.max(
                        1,
                        listings.reduce((s, l) => s + l.total_rooms, 0),
                      )) *
                      100,
                  )}
                  %
                </div>
              </div>

              <div className="dash-kpi-card">
                <div className="kpi-label">Ulasan Masuk</div>
                <div className="kpi-num" style={{ color: "var(--gold-dark)" }}>
                  {reviews.length}
                </div>
                <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>
                  {
                    reviews.filter((r) => r.publication_status === "pending")
                      .length
                  }{" "}
                  menunggu verifikasi
                </div>
              </div>

              <div className="dash-kpi-card">
                <div className="kpi-label">Saldo Bulan Ini</div>
                <div className="kpi-num" style={{ color: "var(--wa-dark)" }}>
                  {fmtRp(netBalance)}
                </div>
                <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>
                  pemasukan {fmtRp(totalIncome)}
                </div>
              </div>
            </div>

            {/* CHECKLIST AWAL */}
            <div
              className="dash-table-card"
              style={{
                padding: "20px 24px",
                background: "linear-gradient(135deg, #F0FDFA, #FFFFFF)",
                border: "1.5px solid var(--emerald-soft)",
              }}
            >
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "var(--teal-950)",
                  marginBottom: 8,
                }}
              >
                Langkah Awal Mitra Havena Kost
              </h3>
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--mut)",
                  marginBottom: 16,
                }}
              >
                Selesaikan tahapan berikut agar kost Anda cepat ditemukan dan
                terpercaya di mata calon penyewa.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 12.5,
                    color: "var(--teal-950)",
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--emerald)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                    }}
                  >
                    ✓
                  </span>
                  Lengkapi Profil Akun Mitra
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 12.5,
                    color: "var(--teal-950)",
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--emerald)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                    }}
                  >
                    ✓
                  </span>
                  Buat Listing & Upload Foto
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 12.5,
                    color: "var(--teal-950)",
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--emerald)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                    }}
                  >
                    ✓
                  </span>
                  Atur Kamar & Generate QR Code
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 12.5,
                    color: "var(--teal-950)",
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--emerald)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                    }}
                  >
                    ✓
                  </span>
                  Ajukan untuk Publikasi Admin
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: 20,
              }}
            >
              <div className="dash-table-card">
                <div className="dt-head">
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: "var(--teal-950)",
                    }}
                  >
                    Ulasan Menunggu Verifikasi
                  </h3>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setActiveTab("reviews")}
                  >
                    Lihat Semua
                  </button>
                </div>
                <div style={{ padding: 16 }}>
                  {reviews
                    .filter((r) => r.publication_status === "pending")
                    .map((r) => (
                      <div
                        key={r.id}
                        style={{
                          padding: "12px 14px",
                          border: "1px solid var(--line)",
                          borderRadius: 12,
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                          }}
                        >
                          <b>{r.reviewer_name}</b>
                          <span style={{ color: "var(--gold-dark)" }}>
                            ★ {r.rating}.0
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--mut)",
                            marginTop: 4,
                          }}
                        >
                          "{r.comment}"
                        </p>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            marginTop: 10,
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            className="btn btn-line btn-sm"
                            onClick={() => handleRejectReview(r.id)}
                          >
                            Tolak
                          </button>
                          <button
                            className="btn btn-emerald btn-sm"
                            onClick={() => setShowVerifyModal(r)}
                          >
                            Verifikasi
                          </button>
                        </div>
                      </div>
                    ))}
                  {reviews.filter((r) => r.publication_status === "pending")
                    .length === 0 && (
                    <div
                      style={{
                        padding: "24px 0",
                        textAlign: "center",
                        color: "var(--faint)",
                        fontSize: 12.5,
                      }}
                    >
                      Tidak ada ulasan baru yang menunggu tindakan.
                    </div>
                  )}
                </div>
              </div>

              <div className="dash-table-card">
                <div className="dt-head">
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: "var(--teal-950)",
                    }}
                  >
                    Status Langganan
                  </h3>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setActiveTab("subs")}
                  >
                    Upgrade
                  </button>
                </div>
                <div style={{ padding: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <span
                      style={{
                        padding: "6px 12px",
                        background: "var(--emerald-soft2)",
                        color: "var(--emerald-dark)",
                        borderRadius: 8,
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      Paket Featured 6 Bulan
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--wa-dark)",
                        fontWeight: 700,
                      }}
                    >
                      ● Aktif
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--mut)",
                      lineHeight: 1.5,
                    }}
                  >
                    Masa aktif berakhir pada <b>31 Desember 2026</b> (43 hari
                    tersisa). Kuota listing: <b>Unlimited</b> dengan lencana{" "}
                    <b>Kost Pilihan</b> di hasil pencarian.
                  </p>
                  <button
                    className="btn btn-line btn-sm"
                    style={{ marginTop: 16, width: "100%" }}
                    onClick={() => setActiveTab("subs")}
                  >
                    Perpanjang / Kelola Paket
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. LISTING SAYA TAB */}
        {activeTab === "listings" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Listing Properti Kost</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Kelola data properti, nomor kamar, harga, foto, dan kode QR
                  ulasan kamar.
                </p>
              </div>
              <button
                className="btn btn-emerald btn-sm"
                onClick={() => setShowAddListing(true)}
              >
                + Tambah Listing Baru
              </button>
            </div>

            <div className="dash-table-card">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Foto & Nama Kost</th>
                    <th>Tipe</th>
                    <th>Harga / Bulan</th>
                    <th>Kamar (Sisa/Total)</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <img
                            src={item.photo_url}
                            alt=""
                            style={{
                              width: 52,
                              height: 38,
                              borderRadius: 8,
                              objectFit: "cover",
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 800, color: "var(--ink)" }}>
                              {item.name}
                            </div>
                            <div
                              style={{ fontSize: 11, color: "var(--faint)" }}
                            >
                              {item.district}, {item.region}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            textTransform: "capitalize",
                            fontWeight: 700,
                            fontSize: 11.5,
                          }}
                        >
                          {item.kost_type}
                        </span>
                      </td>
                      <td>
                        <b>{fmtRp(item.price_monthly)}</b>
                      </td>
                      <td>
                        {item.available_rooms} / {item.total_rooms} kamar
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
                              item.status === "published"
                                ? "var(--wa-soft)"
                                : item.status === "pending"
                                  ? "var(--gold-soft)"
                                  : "var(--line)",
                            color:
                              item.status === "published"
                                ? "var(--wa-dark)"
                                : item.status === "pending"
                                  ? "var(--gold-dark)"
                                  : "var(--mut)",
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {item.status === "draft" && (
                            <button
                              className="btn btn-teal btn-sm"
                              onClick={() => handleSubmitListing(item.id)}
                            >
                              Ajukan
                            </button>
                          )}
                          <button
                            className="btn btn-line btn-sm"
                            onClick={() =>
                              alert(
                                `Buka QR Code Ulasan untuk ${item.name}: Cetak QR untuk ditempel di pintu kamar penghuni.`,
                              )
                            }
                          >
                            QR Kamar
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

        {/* 3. ULASAN TAB */}
        {activeTab === "reviews" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Ulasan Penghuni & Moderasi</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Ulasan yang dikirim penghuni via QR code kamar harus
                  diverifikasi sebelum tampil di website publik.
                </p>
              </div>
            </div>

            <div className="dash-table-card">
              <div style={{ padding: 20 }}>
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: 16,
                      border: "1px solid var(--line)",
                      borderRadius: 14,
                      marginBottom: 14,
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: "var(--teal-950)",
                          }}
                        >
                          {r.reviewer_name}{" "}
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--mut)",
                              fontWeight: 500,
                            }}
                          >
                            · {r.room_number} ({r.kost_name})
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--faint)",
                            marginTop: 2,
                          }}
                        >
                          Masa menginap: {r.stay_period} · Dikirim {r.created_at}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: "var(--gold-dark)",
                        }}
                      >
                        ★ {r.rating}.0
                      </div>
                    </div>

                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--ink2)",
                        marginTop: 10,
                        lineHeight: 1.5,
                      }}
                    >
                      "{r.comment}"
                    </p>

                    {r.owner_reply && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: "10px 14px",
                          background: "var(--emerald-soft2)",
                          borderRadius: 10,
                          fontSize: 12,
                          color: "var(--teal-950)",
                        }}
                      >
                        <b>Balasan Anda:</b> {r.owner_reply}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: "1px solid var(--line)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color:
                              r.verification_status === "verified"
                                ? "var(--wa-dark)"
                                : "var(--amber-dark)",
                          }}
                        >
                          Status:{" "}
                          {r.verification_status === "verified"
                            ? "Terverifikasi"
                            : "Menunggu Verifikasi"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {r.publication_status === "pending" && (
                          <>
                            <button
                              className="btn btn-line btn-sm"
                              onClick={() => handleRejectReview(r.id)}
                            >
                              Tolak Ulasan
                            </button>
                            <button
                              className="btn btn-emerald btn-sm"
                              onClick={() => setShowVerifyModal(r)}
                            >
                              Verifikasi & Terbitkan
                            </button>
                          </>
                        )}
                        {r.publication_status === "published" &&
                          !r.owner_reply && (
                            <button
                              className="btn btn-line btn-sm"
                              onClick={() => setShowReplyModal(r.id)}
                            >
                              Balas Ulasan
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. KEUANGAN TAB */}
        {activeTab === "finance" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Pembukuan Arus Kas Operasional</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Catat pemasukan sewa dan pengeluaran operasional (listrik, air,
                  wifi, kebersihan).
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-line btn-sm"
                  onClick={() => window.print()}
                >
                  Cetak PDF
                </button>
                <button
                  className="btn btn-emerald btn-sm"
                  onClick={() => setShowAddTx(true)}
                >
                  + Catat Transaksi
                </button>
              </div>
            </div>

            <div className="dash-grid-kpi">
              <div className="dash-kpi-card">
                <div className="kpi-label">Total Pemasukan</div>
                <div className="kpi-num" style={{ color: "var(--wa-dark)" }}>
                  {fmtRp(totalIncome)}
                </div>
              </div>
              <div className="dash-kpi-card">
                <div className="kpi-label">Total Pengeluaran</div>
                <div className="kpi-num" style={{ color: "var(--rose-dark)" }}>
                  {fmtRp(totalExpense)}
                </div>
              </div>
              <div className="dash-kpi-card">
                <div className="kpi-label">Saldo Bersih</div>
                <div className="kpi-num" style={{ color: "var(--teal)" }}>
                  {fmtRp(netBalance)}
                </div>
              </div>
            </div>

            <div className="dash-table-card">
              <div className="dt-head">
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "var(--teal-950)",
                  }}
                >
                  Riwayat Arus Kas Bulan November 2026
                </h3>
              </div>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jenis</th>
                    <th>Kategori</th>
                    <th>Kost / Unit</th>
                    <th>Keterangan</th>
                    <th style={{ textAlign: "right" }}>Jumlah (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td>
                        <span
                          style={{
                            padding: "2px 7px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background:
                              t.type === "income"
                                ? "var(--wa-soft)"
                                : "var(--rose-soft)",
                            color:
                              t.type === "income"
                                ? "var(--wa-dark)"
                                : "var(--rose-dark)",
                          }}
                        >
                          {t.type === "income" ? "Pemasukan" : "Pengeluaran"}
                        </span>
                      </td>
                      <td>{t.category}</td>
                      <td>{t.kost_name}</td>
                      <td>{t.notes}</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          color:
                            t.type === "income"
                              ? "var(--wa-dark)"
                              : "var(--rose-dark)",
                        }}
                      >
                        {t.type === "income" ? "+" : "-"} {fmtRp(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. LANGGANAN TAB */}
        {activeTab === "subs" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Paket Mitra & Langganan</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Tingkatkan visibilitas unit kost Anda dengan fitur prioritas
                  dan badge Kost Pilihan.
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
              <div
                className="dash-table-card"
                style={{
                  padding: 24,
                  border: "2px solid var(--emerald)",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    background: "var(--emerald)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: 999,
                  }}
                >
                  PAKET AKTIF
                </span>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "var(--teal-950)",
                  }}
                >
                  Featured 6 Bulan
                </h3>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: "var(--emerald)",
                    margin: "12px 0",
                  }}
                >
                  Rp 450.000
                </div>
                <ul
                  style={{
                    fontSize: 12.5,
                    color: "var(--ink2)",
                    lineHeight: 1.8,
                    paddingLeft: 18,
                  }}
                >
                  <li>Masa aktif s/d 31 Desember 2026</li>
                  <li>Kuota listing: Unlimited</li>
                  <li>Badge "Kost Pilihan" di hasil pencarian</li>
                  <li>Muncul di rekomendasi teratas kampus</li>
                  <li>Fitur QR ulasan kamar tanpa batas</li>
                </ul>
                <button
                  className="btn btn-emerald btn-sm"
                  style={{ marginTop: 20, width: "100%" }}
                  onClick={() => setShowPayModal(true)}
                >
                  Perpanjang Paket
                </button>
              </div>

              <div className="dash-table-card" style={{ padding: 24 }}>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "var(--teal-950)",
                  }}
                >
                  Reguler 3 Bulan
                </h3>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: "var(--teal-950)",
                    margin: "12px 0",
                  }}
                >
                  Rp 250.000
                </div>
                <ul
                  style={{
                    fontSize: 12.5,
                    color: "var(--mut)",
                    lineHeight: 1.8,
                    paddingLeft: 18,
                  }}
                >
                  <li>Masa aktif 90 hari</li>
                  <li>Maksimal 5 listing aktif</li>
                  <li>Tampil di urutan jarak terdekat</li>
                  <li>Pencatatan keuangan & ulasan</li>
                </ul>
                <button
                  className="btn btn-line btn-sm"
                  style={{ marginTop: 20, width: "100%" }}
                  onClick={() => setShowPayModal(true)}
                >
                  Beli Paket Ini
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. NOTIFIKASI TAB */}
        {activeTab === "notif" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Pusat Notifikasi</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Pemberitahuan terkait status listing, ulasan baru, dan
                  pembayaran.
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                Tandai Semua Dibaca
              </button>
            </div>

            <div className="dash-table-card">
              <div style={{ padding: 16 }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      marginBottom: 8,
                      background: n.is_read ? "#fff" : "var(--emerald-soft2)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <b style={{ fontSize: 13, color: "var(--teal-950)" }}>
                        {n.title}
                      </b>
                      <span style={{ fontSize: 11, color: "var(--faint)" }}>
                        {n.created_at}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: "var(--ink2)",
                        marginTop: 4,
                      }}
                    >
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 7. PROFIL TAB */}
        {activeTab === "profile" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>Profil Akun Mitra</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Informasi kontak yang akan ditampilkan kepada calon penyewa
                  saat klik tombol WhatsApp.
                </p>
              </div>
            </div>

            <div className="dash-table-card" style={{ maxWidth: 640 }}>
              <div style={{ padding: 24 }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    alert("Perubahan profil berhasil disimpan!");
                  }}
                >
                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      Nama Lengkap Pemilik
                    </label>
                    <input
                      className="finput"
                      value={profile.fullName}
                      onChange={(e) =>
                        setProfile({ ...profile, fullName: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      Nama Usaha / Manajemen Kost
                    </label>
                    <input
                      className="finput"
                      value={profile.businessName}
                      onChange={(e) =>
                        setProfile({ ...profile, businessName: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          display: "block",
                          marginBottom: 6,
                        }}
                      >
                        Nomor WhatsApp (format 62xxx)
                      </label>
                      <input
                        className="finput"
                        value={profile.phone}
                        onChange={(e) =>
                          setProfile({ ...profile, phone: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          display: "block",
                          marginBottom: 6,
                        }}
                      >
                        Email
                      </label>
                      <input
                        className="finput"
                        value={profile.email}
                        disabled
                        style={{ background: "#F1F5F9" }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      Alamat Kantor / Domisili
                    </label>
                    <input
                      className="finput"
                      value={profile.address}
                      onChange={(e) =>
                        setProfile({ ...profile, address: e.target.value })
                      }
                    />
                  </div>

                  <button type="submit" className="btn btn-emerald">
                    Simpan Perubahan Profil
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: TAMBAH LISTING */}
      {showAddListing && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="modal-panel"
            style={{
              background: "#fff",
              borderRadius: 20,
              maxWidth: 580,
              width: "100%",
              padding: 28,
              boxShadow: "var(--sh-lg)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>
                Tambah Properti Kost Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowAddListing(false)}
                style={{ fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddListing}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Nama Kost
                </label>
                <input
                  className="finput"
                  placeholder="cth: Kost Putri Sigura Indah"
                  value={newKost.name}
                  onChange={(e) =>
                    setNewKost({ ...newKost, name: e.target.value })
                  }
                  required
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>
                    Tipe Kost
                  </label>
                  <select
                    className="fselect"
                    value={newKost.kost_type}
                    onChange={(e: any) =>
                      setNewKost({ ...newKost, kost_type: e.target.value })
                    }
                  >
                    <option value="putri">Kost Putri</option>
                    <option value="putra">Kost Putra</option>
                    <option value="campur">Kost Campur</option>
                    <option value="pasutri">Kost Pasutri</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>
                    Harga Bulanan (Rp)
                  </label>
                  <input
                    className="finput"
                    type="number"
                    value={newKost.price_monthly}
                    onChange={(e) =>
                      setNewKost({
                        ...newKost,
                        price_monthly: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>
                    Kecamatan
                  </label>
                  <input
                    className="finput"
                    value={newKost.district}
                    onChange={(e) =>
                      setNewKost({ ...newKost, district: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>
                    Total Jumlah Kamar
                  </label>
                  <input
                    className="finput"
                    type="number"
                    value={newKost.total_rooms}
                    onChange={(e) =>
                      setNewKost({
                        ...newKost,
                        total_rooms: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Alamat Lengkap
                </label>
                <input
                  className="finput"
                  placeholder="Jl. Bendungan Wonogiri No. 12"
                  value={newKost.address}
                  onChange={(e) =>
                    setNewKost({ ...newKost, address: e.target.value })
                  }
                  required
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  marginTop: 20,
                }}
              >
                <button
                  type="button"
                  className="btn btn-line"
                  onClick={() => setShowAddListing(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-emerald">
                  Simpan Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH TRANSAKSI KEUANGAN */}
      {showAddTx && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="modal-panel"
            style={{
              background: "#fff",
              borderRadius: 20,
              maxWidth: 480,
              width: "100%",
              padding: 24,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>
              Catat Transaksi Keuangan Baru
            </h3>
            <form onSubmit={handleAddTx}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Jenis Transaksi
                </label>
                <select
                  className="fselect"
                  value={newTx.type}
                  onChange={(e: any) =>
                    setNewTx({ ...newTx, type: e.target.value })
                  }
                >
                  <option value="income">Pemasukan (Income)</option>
                  <option value="expense">Pengeluaran (Expense)</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Kategori</label>
                <input
                  className="finput"
                  placeholder="cth: Sewa Bulanan, WiFi, Listrik, Sampah"
                  value={newTx.category}
                  onChange={(e) =>
                    setNewTx({ ...newTx, category: e.target.value })
                  }
                  required
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Nominal (Rp)
                </label>
                <input
                  className="finput"
                  type="number"
                  value={newTx.amount}
                  onChange={(e) =>
                    setNewTx({ ...newTx, amount: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Catatan Keterangan
                </label>
                <input
                  className="finput"
                  placeholder="cth: Pembayaran kamar A-02"
                  value={newTx.notes}
                  onChange={(e) =>
                    setNewTx({ ...newTx, notes: e.target.value })
                  }
                />
              </div>
              <div
                style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
              >
                <button
                  type="button"
                  className="btn btn-line"
                  onClick={() => setShowAddTx(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-emerald">
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VERIFIKASI ULASAN */}
      {showVerifyModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="modal-panel"
            style={{
              background: "#fff",
              borderRadius: 20,
              maxWidth: 480,
              width: "100%",
              padding: 24,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
              Verifikasi Ulasan Penghuni
            </h3>
            <p
              style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 16 }}
            >
              Pastikan nama pengulas sesuai dengan data penghuni kamar. Bila nama
              berbeda (misal memakai nama panggilan), masukkan alasan override
              (min 15 karakter).
            </p>
            <div
              style={{
                padding: 12,
                background: "var(--bg)",
                borderRadius: 10,
                marginBottom: 14,
                fontSize: 12.5,
              }}
            >
              <b>{showVerifyModal.reviewer_name}</b> ({showVerifyModal.room_number})
              <p style={{ marginTop: 4, color: "var(--ink2)" }}>
                "{showVerifyModal.comment}"
              </p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Alasan Konfirmasi / Override Penghuni
              </label>
              <textarea
                className="finput"
                style={{ height: 70 }}
                placeholder="cth: Penghuni kamar terdaftar atas nama Nabila Putri sesuai kartu identitas."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                type="button"
                className="btn btn-line"
                onClick={() => setShowVerifyModal(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-emerald"
                onClick={handleVerifyReview}
              >
                Verifikasi & Terbitkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BALAS ULASAN */}
      {showReplyModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="modal-panel"
            style={{
              background: "#fff",
              borderRadius: 20,
              maxWidth: 480,
              width: "100%",
              padding: 24,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
              Balas Ulasan Penghuni
            </h3>
            <p
              style={{ fontSize: 12, color: "var(--mut)", marginBottom: 14 }}
            >
              Tulis balasan sopan. Dilarang menyertakan nomor telepon pribadi
              atau link eksternal.
            </p>
            <textarea
              className="finput"
              style={{ height: 80, marginBottom: 16 }}
              placeholder="Terima kasih atas ulasannya..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                type="button"
                className="btn btn-line"
                onClick={() => setShowReplyModal(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-emerald"
                onClick={handleSendReply}
              >
                Kirim Balasan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PEMBAYARAN LANGGANAN */}
      {showPayModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="modal-panel"
            style={{
              background: "#fff",
              borderRadius: 20,
              maxWidth: 480,
              width: "100%",
              padding: 24,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
              Konfirmasi Pembayaran Langganan
            </h3>
            <p
              style={{ fontSize: 12, color: "var(--mut)", marginBottom: 14 }}
            >
              Transfer sesuai nominal ke rekening resmi Havena Kost:
              <br />
              <b>BCA 018-882-9901 a.n. PT Havena Kost Indonesia</b>
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Paket Pilihan
              </label>
              <input
                className="finput"
                value={payPlan}
                disabled
                style={{ background: "#F1F5F9" }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                URL Bukti Transfer (opsional)
              </label>
              <input
                className="finput"
                placeholder="https://drive.google.com/..."
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
              />
            </div>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                type="button"
                className="btn btn-line"
                onClick={() => setShowPayModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-emerald"
                onClick={() => {
                  setShowPayModal(false);
                  alert(
                    "Konfirmasi pembayaran berhasil dikirim! Admin akan memverifikasi dalam waktu maksimal 1x24 jam.",
                  );
                }}
              >
                Kirim Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
