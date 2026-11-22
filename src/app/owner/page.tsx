"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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

  // Responsive mobile drawer state
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  // Tab switch handler with auto-close drawer and smooth scroll to top
  const handleTabChange = useCallback((tab: typeof activeTab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  // Account status
  const [approvalStatus] = useState<
    "pending" | "approved" | "rejected" | "suspended"
  >("approved");
  const [rejectionReason] = useState(
    "Data KTP dan izin usaha perlu dilengkapi kembali.",
  );

  // Map and Location references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Profile data with Google Maps coordinates
  const [profile, setProfile] = useState({
    fullName: "Ratna Kusuma Dewi",
    businessName: "Griya Cendekia Management",
    phone: "6281234567890",
    email: "ratna.kusuma@gmail.com",
    address: "Jl. Bendungan Sigura-gura No. 14, Lowokwaru, Kota Malang",
    latitude: -7.9525,
    longitude: 112.6135,
    googleMapsUrl: "https://www.google.com/maps?q=-7.9525,112.6135",
  });

  const [mapsInput, setMapsInput] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Restore saved profile & maps coordinates from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("havena_owner_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        setProfile((prev) => ({
          ...prev,
          ...parsed,
          latitude: parsed.latitude ? Number(parsed.latitude) : prev.latitude,
          longitude: parsed.longitude ? Number(parsed.longitude) : prev.longitude,
          googleMapsUrl:
            parsed.googleMapsUrl ||
            `https://www.google.com/maps?q=${parsed.latitude || -7.9525},${parsed.longitude || 112.6135}`,
        }));
      }
    } catch (e) {}
  }, []);

  const applyCoordinates = useCallback((lat: number, lng: number) => {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));
    const mapsUrl = `https://www.google.com/maps?q=${roundedLat},${roundedLng}`;

    setProfile((prev) => ({
      ...prev,
      latitude: roundedLat,
      longitude: roundedLng,
      googleMapsUrl: mapsUrl,
    }));

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({ center: [roundedLng, roundedLat], zoom: 16 });
    }
    if (markerRef.current) {
      markerRef.current.setLngLat([roundedLng, roundedLat]);
    }
  }, []);

  const handleUseGPS = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Browser Anda tidak mendukung fitur Geolocation.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        applyCoordinates(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setIsLocating(false);
        alert("Gagal membaca GPS: " + err.message + ". Pastikan izin lokasi aktif.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleApplyMapsInput = async () => {
    const query = mapsInput.trim();
    if (!query) return;

    // Pattern 1: Raw Lat, Lng directly (-7.9525, 112.6135)
    const coordMatch = query.match(/([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        applyCoordinates(lat, lng);
        setMapsInput("");
        return;
      }
    }

    // Pattern 2: Google Maps URL query string
    const urlCoordMatch = query.match(/[@?&](?:q=|ll=|loc:)?([-+]?\d{1,2}\.\d+)[,/]([-+]?\d{1,3}\.\d+)/);
    if (urlCoordMatch) {
      const lat = parseFloat(urlCoordMatch[1]);
      const lng = parseFloat(urlCoordMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        applyCoordinates(lat, lng);
        setMapsInput("");
        return;
      }
    }

    // Pattern 3: Text search via Nominatim
    try {
      setIsLocating(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + ", Malang, Jawa Timur"
        )}&limit=1`,
        { headers: { "Accept-Language": "id" } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        applyCoordinates(parseFloat(data[0].lat), parseFloat(data[0].lon));
        setMapsInput("");
      } else {
        alert("Lokasi tidak ditemukan. Coba masukkan nama jalan/kampus atau koordinat langsung.");
      }
    } catch (e) {
      alert("Gagal mencari lokasi. Silakan klik atau geser pin langsung pada peta.");
    } finally {
      setIsLocating(false);
    }
  };

  const handleReverseGeocode = async () => {
    if (!profile.latitude || !profile.longitude) return;
    try {
      setIsReverseGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${profile.latitude}&lon=${profile.longitude}`,
        { headers: { "Accept-Language": "id" } }
      );
      const data = await res.json();
      if (data && data.display_name) {
        setProfile((prev) => ({
          ...prev,
          address: data.display_name,
        }));
      }
    } catch (e) {
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Map initialization when Profile tab is active
  useEffect(() => {
    if (activeTab !== "profile") return;

    let isCancelled = false;

    const initMap = async () => {
      await new Promise((r) => setTimeout(r, 80));
      if (isCancelled || !mapContainerRef.current) return;

      let maplibregl: any = (window as any).maplibregl;
      if (!maplibregl) {
        try {
          const mod = (await import("maplibre-gl")) as any;
          maplibregl = mod.default || mod;
        } catch (e) {
          return;
        }
      }
      if (isCancelled || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.resize();
        } catch (e) {}
        return;
      }

      const initialLng = profile.longitude || 112.6135;
      const initialLat = profile.latitude || -7.9525;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: "https://tiles.openfreemap.org/styles/bright",
        center: [initialLng, initialLat],
        zoom: 15,
        attributionControl: false,
      });

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: true, showZoom: true }),
        "top-right"
      );

      const markerEl = document.createElement("div");
      markerEl.className = "hk-map-picker-pin";
      markerEl.style.width = "38px";
      markerEl.style.height = "38px";
      markerEl.style.display = "flex";
      markerEl.style.alignItems = "center";
      markerEl.style.justifyContent = "center";
      markerEl.style.cursor = "grab";
      markerEl.innerHTML = `
        <div style="width:34px;height:34px;background:#EF4444;border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 6px 18px rgba(239,68,68,0.5);display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);color:#fff;font-size:14px;font-weight:900;">🏠</span>
        </div>
      `;

      const marker = new maplibregl.Marker({
        element: markerEl,
        draggable: true,
        anchor: "bottom",
      })
        .setLngLat([initialLng, initialLat])
        .addTo(map);

      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        applyCoordinates(lngLat.lat, lngLat.lng);
      });

      map.on("click", (e: any) => {
        marker.setLngLat(e.lngLat);
        applyCoordinates(e.lngLat.lat, e.lngLat.lng);
      });

      map.on("load", () => {
        if (!isCancelled) {
          map.resize();
        }
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    };

    initMap();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, applyCoordinates, profile.latitude, profile.longitude]);

  // Clean up map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

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
  const [payPlan] = useState("Paket Featured 6 Bulan (Rp 450.000)");
  const [proofUrl, setProofUrl] = useState("");

  // Lock body scroll when drawer or any modal is open
  useEffect(() => {
    const isAnyModalOpen =
      mobileNavOpen ||
      showAddListing ||
      showAddTx ||
      showVerifyModal !== null ||
      showReplyModal !== null ||
      showPayModal;

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [
    mobileNavOpen,
    showAddListing,
    showAddTx,
    showVerifyModal,
    showReplyModal,
    showPayModal,
  ]);

  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileNavOpen(false);
        setShowAddListing(false);
        setShowAddTx(false);
        setShowVerifyModal(null);
        setShowReplyModal(null);
        setShowPayModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--teal-950)",
            }}
          >
            Memverifikasi sesi login...
          </div>
        </div>
      </div>
    );
  }

  // Active tab labels for header breadcrumb
  const tabTitles: Record<string, string> = {
    dash: "Ringkasan Kost",
    listings: "Listing Properti",
    reviews: "Ulasan Penghuni",
    finance: "Arus Kas Keuangan",
    subs: "Paket Langganan",
    notif: "Pusat Notifikasi",
    profile: "Profil Akun Mitra",
  };

  return (
    <div className="dash-layout">
      {/* MOBILE STICKY TOPBAR (Visible on tablet & mobile < 1024px) */}
      <header className="dash-mobile-header" aria-label="Menu navigasi atas">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="dash-mobile-menu-btn"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Buka menu navigasi"
          >
            <svg
              className="ic"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              style={{ width: 20, height: 20 }}
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <img
              src="/image/HavenaKost.svg"
              alt="Havena Kost"
              style={{ height: 28 }}
            />
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                color: "var(--emerald)",
                background: "var(--emerald-soft2)",
                padding: "2px 6px",
                borderRadius: 5,
                border: "1px solid var(--emerald-soft)",
              }}
            >
              MITRA
            </span>
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="dash-mobile-icon-btn"
            onClick={() => handleTabChange("notif")}
            title="Notifikasi"
            aria-label="Notifikasi"
          >
            <svg
              className="ic"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ width: 18, height: 18 }}
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="dash-mobile-badge">{unreadCount}</span>
            )}
          </button>
          <button
            type="button"
            className="dash-mobile-avatar-btn"
            onClick={() => handleTabChange("profile")}
            title="Profil Akun"
            aria-label="Profil Akun"
          >
            {(currentUser?.name || profile.fullName).charAt(0)}
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER BACKDROP */}
      <div
        className={`dash-drawer-backdrop ${mobileNavOpen ? "open" : ""}`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      {/* SIDEBAR (Desktop fixed left, Mobile slide-over drawer) */}
      <aside
        className={`dash-sidebar ${mobileNavOpen ? "mobile-open" : ""}`}
        aria-label="Sidebar Navigasi"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <Link href="/" className="dash-brand" style={{ marginBottom: 0 }}>
            <img
              src="/image/HavenaKost.svg"
              alt="Havena Kost"
              className="brand-logo-img"
              style={{ height: 34 }}
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
          <button
            type="button"
            className="dash-sidebar-close"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Tutup menu navigasi"
          >
            ✕
          </button>
        </div>

        <nav className="dash-nav">
          <button
            type="button"
            className={`dash-nav-btn ${activeTab === "dash" ? "active" : ""}`}
            onClick={() => handleTabChange("dash")}
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
            onClick={() => handleTabChange("listings")}
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
                background: "var(--bg)",
                padding: "2px 7px",
                borderRadius: 6,
              }}
            >
              {listings.length}
            </span>
          </button>

          <button
            type="button"
            className={`dash-nav-btn ${activeTab === "reviews" ? "active" : ""}`}
            onClick={() => handleTabChange("reviews")}
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
            onClick={() => handleTabChange("finance")}
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
            onClick={() => handleTabChange("subs")}
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
            onClick={() => handleTabChange("notif")}
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
            onClick={() => handleTabChange("profile")}
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
              flexShrink: 0,
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
            <div
              style={{
                fontSize: 10.5,
                color: "var(--mut)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
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
              padding: 6,
              borderRadius: 8,
            }}
            aria-label="Logout"
          >
            <svg
              style={{ width: 18, height: 18 }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
          <Link
            href="/"
            title="Ke Halaman Publik"
            style={{
              color: "var(--mut)",
              display: "flex",
              padding: 6,
              borderRadius: 8,
            }}
            aria-label="Halaman Publik"
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

      {/* MOBILE BOTTOM NAVIGATION DOCK (Native mobile feel for thumbs) */}
      <nav className="dash-mobile-dock" aria-label="Navigasi Cepat Bawah">
        <button
          type="button"
          className={`dash-mobile-dock-btn ${activeTab === "dash" ? "active" : ""}`}
          onClick={() => handleTabChange("dash")}
        >
          <svg
            className="dock-icon"
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
          <span>Beranda</span>
        </button>

        <button
          type="button"
          className={`dash-mobile-dock-btn ${activeTab === "listings" ? "active" : ""}`}
          onClick={() => handleTabChange("listings")}
        >
          <svg
            className="dock-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
            <path d="M9.5 21v-6h5v6" />
          </svg>
          <span>Listing</span>
        </button>

        <button
          type="button"
          className={`dash-mobile-dock-btn ${activeTab === "reviews" ? "active" : ""}`}
          onClick={() => handleTabChange("reviews")}
        >
          <svg
            className="dock-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
          <span>Ulasan</span>
          {reviews.some((r) => r.publication_status === "pending") && (
            <span className="dock-dot" />
          )}
        </button>

        <button
          type="button"
          className={`dash-mobile-dock-btn ${activeTab === "finance" ? "active" : ""}`}
          onClick={() => handleTabChange("finance")}
        >
          <svg
            className="dock-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 10h18" />
            <circle cx="16" cy="14" r="1.5" />
          </svg>
          <span>Keuangan</span>
        </button>

        <button
          type="button"
          className={`dash-mobile-dock-btn ${
            ["subs", "notif", "profile"].includes(activeTab) ? "active" : ""
          }`}
          onClick={() => setMobileNavOpen(true)}
        >
          <svg
            className="dock-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
          <span>Menu</span>
          {unreadCount > 0 && <span className="dock-dot" />}
        </button>
      </nav>

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
              style={{ flexShrink: 0 }}
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
              style={{ flexShrink: 0 }}
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
                <h1>{tabTitles.dash}</h1>
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

            {/* KPI CARDS (2x2 on mobile, 4 in row on desktop) */}
            <div className="dash-grid-kpi">
              <div className="dash-kpi-card">
                <div className="kpi-label">Listing Aktif</div>
                <div className="kpi-num" style={{ color: "var(--emerald)" }}>
                  {listings.filter((l) => l.status === "published").length}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--mut)",
                    marginTop: 4,
                  }}
                >
                  dari {listings.length} properti
                </div>
              </div>

              <div className="dash-kpi-card">
                <div className="kpi-label">Kamar Tersedia</div>
                <div className="kpi-num" style={{ color: "var(--teal)" }}>
                  {listings.reduce((s, l) => s + l.available_rooms, 0)} /{" "}
                  {listings.reduce((s, l) => s + l.total_rooms, 0)}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--mut)",
                    marginTop: 4,
                  }}
                >
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
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--mut)",
                    marginTop: 4,
                  }}
                >
                  {
                    reviews.filter((r) => r.publication_status === "pending")
                      .length
                  }{" "}
                  menunggu verifikasi
                </div>
              </div>

              <div className="dash-kpi-card">
                <div className="kpi-label">Saldo Bulan Ini</div>
                <div
                  className="kpi-num"
                  style={{ color: "var(--wa-dark)", fontSize: 20 }}
                >
                  {fmtRp(netBalance)}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--mut)",
                    marginTop: 4,
                  }}
                >
                  pemasukan {fmtRp(totalIncome)}
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS: Responsive 2-column or 1-column stack */}
            <div className="dash-grid-2col">
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
                    onClick={() => handleTabChange("reviews")}
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
                          background: "#fff",
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
                            flexWrap: "wrap",
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
                    onClick={() => handleTabChange("subs")}
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
                      flexWrap: "wrap",
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
                    onClick={() => handleTabChange("subs")}
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
                <h1>{tabTitles.listings}</h1>
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

            {/* DESKTOP TABLE VIEW (Screens >= 768px) */}
            <div className="dash-desktop-view">
              <div className="dash-table-card">
                <div className="dash-table-wrap">
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
                                  flexShrink: 0,
                                }}
                              />
                              <div>
                                <div
                                  style={{
                                    fontWeight: 800,
                                    color: "var(--ink)",
                                  }}
                                >
                                  {item.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "var(--faint)",
                                  }}
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
            </div>

            {/* MOBILE CARD VIEW (Screens < 768px, zero awkward scroll) */}
            <div className="dash-mobile-view">
              {listings.map((item) => {
                const occPercent = Math.round(
                  ((item.total_rooms - item.available_rooms) /
                    Math.max(1, item.total_rooms)) *
                    100,
                );
                return (
                  <div key={item.id} className="dash-listing-mcard">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      <img
                        src={item.photo_url}
                        alt=""
                        style={{
                          width: 76,
                          height: 60,
                          borderRadius: 10,
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              textTransform: "capitalize",
                              fontWeight: 700,
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "var(--emerald-soft2)",
                              color: "var(--emerald-dark)",
                            }}
                          >
                            {item.kost_type}
                          </span>
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontSize: 9.5,
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
                        </div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 13.5,
                            color: "var(--ink)",
                            lineHeight: 1.3,
                          }}
                        >
                          {item.name}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--faint)",
                            marginTop: 2,
                          }}
                        >
                          {item.district}, {item.region}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 10px",
                        background: "var(--bg)",
                        borderRadius: 10,
                        marginBottom: 10,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <span style={{ color: "var(--mut)" }}>Harga: </span>
                        <b style={{ color: "var(--emerald-dark)" }}>
                          {fmtRp(item.price_monthly)}
                        </b>
                        <span style={{ fontSize: 10, color: "var(--mut)" }}>
                          /bln
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ color: "var(--mut)" }}>Kamar: </span>
                        <b>
                          {item.available_rooms}/{item.total_rooms}
                        </b>
                        <span
                          style={{
                            fontSize: 10,
                            color:
                              item.available_rooms > 0
                                ? "var(--wa-dark)"
                                : "var(--rose)",
                            marginLeft: 4,
                          }}
                        >
                          ({item.available_rooms > 0 ? "Tersedia" : "Penuh"})
                        </span>
                      </div>
                    </div>

                    {/* Mini Occupancy Bar */}
                    <div style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 10.5,
                          color: "var(--mut)",
                          marginBottom: 4,
                        }}
                      >
                        <span>Tingkat Okupansi</span>
                        <b>{occPercent}%</b>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: "#E2E8F0",
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${occPercent}%`,
                            height: "100%",
                            background:
                              occPercent > 80
                                ? "var(--emerald)"
                                : "var(--teal)",
                            borderRadius: 999,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>

                    {/* Touch Action Buttons */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {item.status === "draft" && (
                        <button
                          className="btn btn-teal btn-sm"
                          style={{ flex: 1 }}
                          onClick={() => handleSubmitListing(item.id)}
                        >
                          Ajukan
                        </button>
                      )}
                      <button
                        className="btn btn-line btn-sm"
                        style={{ flex: 1 }}
                        onClick={() =>
                          alert(
                            `Buka QR Code Ulasan untuk ${item.name}: Cetak QR untuk ditempel di pintu kamar penghuni.`,
                          )
                        }
                      >
                        QR Kamar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. ULASAN TAB */}
        {activeTab === "reviews" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>{tabTitles.reviews}</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Ulasan yang dikirim penghuni via QR code kamar harus
                  diverifikasi sebelum tampil di website publik.
                </p>
              </div>
            </div>

            <div className="dash-table-card">
              <div style={{ padding: "16px 18px" }}>
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
                        flexWrap: "wrap",
                        gap: 8,
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
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div>
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
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
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
                <h1>{tabTitles.finance}</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Catat pemasukan sewa dan pengeluaran operasional (listrik, air,
                  wifi, kebersihan).
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

            {/* Financial summary KPIs */}
            <div className="dash-grid-kpi">
              <div className="dash-kpi-card">
                <div className="kpi-label">Total Pemasukan</div>
                <div
                  className="kpi-num"
                  style={{ color: "var(--wa-dark)", fontSize: 20 }}
                >
                  {fmtRp(totalIncome)}
                </div>
              </div>
              <div className="dash-kpi-card">
                <div className="kpi-label">Total Pengeluaran</div>
                <div
                  className="kpi-num"
                  style={{ color: "var(--rose-dark)", fontSize: 20 }}
                >
                  {fmtRp(totalExpense)}
                </div>
              </div>
              <div className="dash-kpi-card">
                <div className="kpi-label">Saldo Bersih</div>
                <div
                  className="kpi-num"
                  style={{ color: "var(--teal)", fontSize: 20 }}
                >
                  {fmtRp(netBalance)}
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="dash-desktop-view">
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
                <div className="dash-table-wrap">
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
            </div>

            {/* Mobile Card Feed View */}
            <div className="dash-mobile-view">
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "var(--teal-950)",
                  marginBottom: 10,
                }}
              >
                Riwayat Transaksi (November 2026)
              </div>
              {transactions.map((t) => (
                <div key={t.id} className="dash-tx-mcard">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 10,
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
                        {t.category}
                      </span>
                      <span style={{ fontSize: 10.5, color: "var(--faint)" }}>
                        {t.date}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: "var(--ink)",
                      }}
                    >
                      {t.notes || t.kost_name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--mut)" }}>
                      {t.kost_name}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      fontWeight: 800,
                      fontSize: 13.5,
                      fontVariantNumeric: "tabular-nums",
                      color:
                        t.type === "income"
                          ? "var(--wa-dark)"
                          : "var(--rose-dark)",
                      flexShrink: 0,
                    }}
                  >
                    {t.type === "income" ? "+" : "-"} {fmtRp(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. LANGGANAN TAB */}
        {activeTab === "subs" && (
          <div>
            <div className="dash-head">
              <div>
                <h1>{tabTitles.subs}</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Tingkatkan visibilitas unit kost Anda dengan fitur prioritas
                  dan badge Kost Pilihan.
                </p>
              </div>
            </div>

            <div className="dash-grid-subs">
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
                <h1>{tabTitles.notif}</h1>
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
                        flexWrap: "wrap",
                        gap: 6,
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
                <h1>{tabTitles.profile}</h1>
                <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>
                  Informasi kontak yang akan ditampilkan kepada calon penyewa
                  saat klik tombol WhatsApp.
                </p>
              </div>
            </div>

            <div className="dash-table-card" style={{ maxWidth: 740 }}>
              <div style={{ padding: 24 }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    try {
                      localStorage.setItem(
                        "havena_owner_profile",
                        JSON.stringify(profile)
                      );
                    } catch (err) {}
                    alert(
                      `Perubahan profil berhasil disimpan!\nTitik lokasi kost telah ditandai di Google Maps (${profile.latitude}, ${profile.longitude}).`
                    );
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

                  <div className="dash-grid-form" style={{ marginBottom: 16 }}>
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

                  <div style={{ marginBottom: 18 }}>
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
                      placeholder="cth: Jl. Bendungan Sigura-gura No. 14, Lowokwaru, Kota Malang"
                      value={profile.address}
                      onChange={(e) =>
                        setProfile({ ...profile, address: e.target.value })
                      }
                      required
                    />
                  </div>

                  {/* SET LOKASI GOOGLE MAPS / PENANDA TITIK KOST */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, #F8FAFC, #F0FDFA)",
                      border: "1.5px solid var(--emerald-soft)",
                      borderRadius: 16,
                      padding: "18px 16px",
                      marginBottom: 24,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span style={{ fontSize: 16 }}>📍</span>
                          <span
                            style={{
                              fontSize: 13.5,
                              fontWeight: 800,
                              color: "var(--teal-950)",
                            }}
                          >
                            Titik Lokasi Kost (Google Maps)
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: 11.5,
                            color: "var(--mut)",
                            marginTop: 2,
                          }}
                        >
                          Tandai titik gerbang/lokasi kost agar calon penyewa
                          dapat menemukan rute yang akurat di Google Maps.
                        </p>
                      </div>

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn btn-emerald btn-sm"
                          onClick={handleUseGPS}
                          disabled={isLocating}
                          style={{ fontSize: 11, padding: "6px 12px" }}
                        >
                          {isLocating ? "Mencari GPS..." : "📍 Lokasi GPS Saya"}
                        </button>
                        <a
                          href={profile.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, padding: "6px 12px" }}
                        >
                          Buka Google Maps ↗
                        </a>
                      </div>
                    </div>

                    {/* Quick Search or Paste Google Maps URL */}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        className="finput"
                        placeholder="Tempel link Google Maps atau cari nama jalan / kampus..."
                        value={mapsInput}
                        onChange={(e) => setMapsInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyMapsInput();
                          }
                        }}
                        style={{ flex: 1, minWidth: 200, fontSize: 12 }}
                      />
                      <button
                        type="button"
                        className="btn btn-line btn-sm"
                        onClick={handleApplyMapsInput}
                        disabled={isLocating}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {isLocating ? "Memproses..." : "Cari / Terapkan Titik"}
                      </button>
                    </div>

                    {/* Interactive Map Picker */}
                    <div
                      style={{
                        position: "relative",
                        marginBottom: 12,
                        borderRadius: 14,
                        overflow: "hidden",
                        border: "1.5px solid var(--line)",
                        boxShadow: "var(--sh-sm)",
                      }}
                    >
                      <div
                        ref={mapContainerRef}
                        className="map-picker-container"
                        style={{ height: 280 }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: 10,
                          left: 10,
                          right: 10,
                          background: "rgba(15, 23, 42, 0.78)",
                          color: "#fff",
                          padding: "6px 10px",
                          borderRadius: 8,
                          fontSize: 10.5,
                          textAlign: "center",
                          backdropFilter: "blur(4px)",
                          pointerEvents: "none",
                        }}
                      >
                        💡 <b>Petunjuk:</b> Klik di mana saja pada peta atau geser pin merah 🏠 untuk menyesuaikan titik lokasi kost Anda.
                      </div>
                    </div>

                    {/* Current Coordinate and Action Bar */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "#fff",
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--mut)",
                            fontWeight: 600,
                          }}
                        >
                          Koordinat Tersimpan:
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: 800,
                            fontFamily: "var(--font-mono)",
                            color: "var(--teal-950)",
                          }}
                        >
                          {profile.latitude}, {profile.longitude}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={handleReverseGeocode}
                          disabled={isReverseGeocoding}
                          title="Ambil alamat lengkap dari titik pin di peta"
                          style={{ fontSize: 11 }}
                        >
                          {isReverseGeocoding
                            ? "Membaca Alamat..."
                            : "Gunakan Alamat dari Peta"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-line btn-sm"
                          onClick={() => {
                            if (typeof window !== "undefined" && navigator.clipboard) {
                              navigator.clipboard.writeText(profile.googleMapsUrl);
                              setCopiedLink(true);
                              setTimeout(() => setCopiedLink(false), 2000);
                            }
                          }}
                          style={{ fontSize: 11 }}
                        >
                          {copiedLink ? "✓ Tersalin!" : "Salin Link Maps"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-emerald"
                    style={{ width: "100%", minHeight: 44 }}
                  >
                    Simpan Perubahan Profil & Titik Lokasi
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: TAMBAH LISTING */}
      {showAddListing && (
        <div
          className="dash-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddListing(false);
          }}
        >
          <div className="dash-modal-panel">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>
                Tambah Properti Kost Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowAddListing(false)}
                style={{
                  fontSize: 18,
                  cursor: "pointer",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                }}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddListing}>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{ fontSize: 12, fontWeight: 700, display: "block" }}
                >
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
              <div className="dash-grid-form" style={{ marginBottom: 12 }}>
                <div>
                  <label
                    style={{ fontSize: 12, fontWeight: 700, display: "block" }}
                  >
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
                  <label
                    style={{ fontSize: 12, fontWeight: 700, display: "block" }}
                  >
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
              <div className="dash-grid-form" style={{ marginBottom: 12 }}>
                <div>
                  <label
                    style={{ fontSize: 12, fontWeight: 700, display: "block" }}
                  >
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
                  <label
                    style={{ fontSize: 12, fontWeight: 700, display: "block" }}
                  >
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
                <label
                  style={{ fontSize: 12, fontWeight: 700, display: "block" }}
                >
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
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="btn btn-line"
                  style={{ minHeight: 42, flex: 1 }}
                  onClick={() => setShowAddListing(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-emerald"
                  style={{ minHeight: 42, flex: 1 }}
                >
                  Simpan Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TAMBAH TRANSAKSI KEUANGAN */}
      {showAddTx && (
        <div
          className="dash-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddTx(false);
          }}
        >
          <div className="dash-modal-panel">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>
                Catat Transaksi Keuangan Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTx(false)}
                style={{
                  fontSize: 18,
                  cursor: "pointer",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                }}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddTx}>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{ fontSize: 12, fontWeight: 700, display: "block" }}
                >
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
                <label
                  style={{ fontSize: 12, fontWeight: 700, display: "block" }}
                >
                  Kategori
                </label>
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
                <label
                  style={{ fontSize: 12, fontWeight: 700, display: "block" }}
                >
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
                <label
                  style={{ fontSize: 12, fontWeight: 700, display: "block" }}
                >
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
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="btn btn-line"
                  style={{ minHeight: 42, flex: 1 }}
                  onClick={() => setShowAddTx(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-emerald"
                  style={{ minHeight: 42, flex: 1 }}
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VERIFIKASI ULASAN */}
      {showVerifyModal && (
        <div
          className="dash-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowVerifyModal(null);
          }}
        >
          <div className="dash-modal-panel">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>
                Verifikasi Ulasan Penghuni
              </h3>
              <button
                type="button"
                onClick={() => setShowVerifyModal(null)}
                style={{
                  fontSize: 18,
                  cursor: "pointer",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                }}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <p
              style={{
                fontSize: 12.5,
                color: "var(--mut)",
                marginBottom: 14,
              }}
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
              <b>{showVerifyModal.reviewer_name}</b> (
              {showVerifyModal.room_number})
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
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn btn-line"
                style={{ minHeight: 42, flex: 1 }}
                onClick={() => setShowVerifyModal(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-emerald"
                style={{ minHeight: 42, flex: 1 }}
                onClick={handleVerifyReview}
              >
                Verifikasi & Terbitkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BALAS ULASAN */}
      {showReplyModal && (
        <div
          className="dash-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReplyModal(null);
          }}
        >
          <div className="dash-modal-panel">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>
                Balas Ulasan Penghuni
              </h3>
              <button
                type="button"
                onClick={() => setShowReplyModal(null)}
                style={{
                  fontSize: 18,
                  cursor: "pointer",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                }}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--mut)",
                marginBottom: 14,
              }}
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
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn btn-line"
                style={{ minHeight: 42, flex: 1 }}
                onClick={() => setShowReplyModal(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-emerald"
                style={{ minHeight: 42, flex: 1 }}
                onClick={handleSendReply}
              >
                Kirim Balasan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: PEMBAYARAN LANGGANAN */}
      {showPayModal && (
        <div
          className="dash-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPayModal(false);
          }}
        >
          <div className="dash-modal-panel">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>
                Konfirmasi Pembayaran Langganan
              </h3>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                style={{
                  fontSize: 18,
                  cursor: "pointer",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                }}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--mut)",
                marginBottom: 14,
              }}
            >
              Transfer sesuai nominal ke rekening resmi Havena Kost:
              <br />
              <b>BCA 018-882-9901 a.n. PT Havena Kost Indonesia</b>
            </p>
            <div style={{ marginBottom: 12 }}>
              <label
                style={{ fontSize: 12, fontWeight: 700, display: "block" }}
              >
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
              <label
                style={{ fontSize: 12, fontWeight: 700, display: "block" }}
              >
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
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn btn-line"
                style={{ minHeight: 42, flex: 1 }}
                onClick={() => setShowPayModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-emerald"
                style={{ minHeight: 42, flex: 1 }}
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
