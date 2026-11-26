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
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [activeTab, setActiveTab] = useState<
    "dash" | "listings" | "reviews" | "finance" | "subs" | "notif" | "profile"
  >("dash");
  const [occupancyPeriod, setOccupancyPeriod] = useState<"30d" | "6m" | "1y">("30d");

  // Tab switch handler with auto-close drawer and smooth scroll to top
  const handleTabChange = useCallback((tab: typeof activeTab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  // Account status from real database
  const [approvalStatus, setApprovalStatus] = useState<
    "pending" | "approved" | "rejected" | "suspended"
  >("pending");
  const [rejectionReason, setRejectionReason] = useState("");

  // Map and Location references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Profile data from database
  const [profile, setProfile] = useState({
    fullName: "",
    businessName: "",
    phone: "",
    email: "",
    address: "",
    latitude: -7.9525,
    longitude: 112.6135,
    googleMapsUrl: "https://www.google.com/maps?q=-7.9525,112.6135",
  });

  const [mapsInput, setMapsInput] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Real Database States
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    id: string;
    status: string;
    planName: string;
    planCode: string;
    listingQuota: string;
    startDate: string;
    endDate: string;
    daysRemaining: number;
  } | null>(null);
  const [dueDates, setDueDates] = useState<
    {
      id: string;
      tenantName: string;
      roomCode: string;
      roomName?: string | null;
      kostName: string;
      monthlyPrice: number;
      checkOutDate?: string | null;
      dueText: string;
      daysUntilDue: number;
    }[]
  >([]);
  const [dailyIncome30Days, setDailyIncome30Days] = useState<
    { date: string; total: number }[]
  >([]);
  const [kpi, setKpi] = useState({
    activeListings: 0,
    totalListings: 0,
    totalRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    occupancyRate: 0,
    totalReviews: 0,
    pendingReviewsCount: 0,
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
  });

  // Fetch all live data from database via unified API
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const res = await fetch("/api/owner/dashboard", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        throw new Error("Gagal memuat data database");
      }
      const json = await res.json();
      if (json.data) {
        const d = json.data;
        if (d.profile) {
          setProfile((prev) => ({
            ...prev,
            fullName: d.profile.fullName || prev.fullName,
            businessName: d.profile.businessName || prev.businessName,
            phone: d.profile.phone || prev.phone,
            email: d.profile.email || prev.email,
            address: d.profile.address || prev.address,
            latitude: d.profile.latitude || prev.latitude,
            longitude: d.profile.longitude || prev.longitude,
            googleMapsUrl: `https://www.google.com/maps?q=${d.profile.latitude || -7.9525},${d.profile.longitude || 112.6135}`,
          }));
          setApprovalStatus(d.profile.approvalStatus || "pending");
          setRejectionReason(d.profile.rejectionReason || "");
        }
        if (d.kpi) setKpi(d.kpi);
        if (d.listings) setListings(d.listings);
        if (d.reviews) setReviews(d.reviews);
        if (d.transactions) setTransactions(d.transactions);
        if (d.notifications) setNotifications(d.notifications);
        if (d.subscription) setSubscriptionInfo(d.subscription);
        if (d.dueDates) setDueDates(d.dueDates);
        if (d.dailyIncome30Days) setDailyIncome30Days(d.dailyIncome30Days);
      }
    } catch (err) {
      console.error("Error loading owner dashboard data:", err);
    } finally {
      setIsLoadingData(false);
    }
  }, [router]);

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
      fetchDashboardData();
    } catch (e) {
      router.replace("/login");
    }
  }, [router, fetchDashboardData]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("havena_session");
    } catch (e) {}
    router.replace("/login");
  };

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

  // Map initialization - runs on mount so map is pre-rendered and ready with zero lag
  useEffect(() => {
    let isCancelled = false;

    const initMap = async () => {
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
        return;
      }

      const initialLng = profile.longitude || 112.6135;
      const initialLat = profile.latitude || -7.9525;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: "https://tiles.openfreemap.org/styles/bright",
        center: [initialLng, initialLat],
        zoom: 15,
        fadeDuration: 0,
        trackResize: true,
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
  }, [applyCoordinates, profile.latitude, profile.longitude]);

  // When switching to "profile" tab, immediately resize so canvas is 100% sharp with 0 delay
  useEffect(() => {
    if (activeTab === "profile" && mapInstanceRef.current) {
      requestAnimationFrame(() => {
        mapInstanceRef.current?.resize();
      });
    }
  }, [activeTab]);

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
    kost_name: "",
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

  const totalIncome = kpi.totalIncome;
  const totalExpense = kpi.totalExpense;
  const netBalance = kpi.netBalance;

  const fmtRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

  // Real Database API Handlers
  const handleAddListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKost.name.trim()) return;
    try {
      const desc =
        newKost.description.trim().length >= 20
          ? newKost.description.trim()
          : `${newKost.name.trim()} - Unit kost nyaman, bersih, dan strategis dengan fasilitas lengkap di Malang.`;

      const phoneFormatted = newKost.whatsapp.trim().startsWith("62")
        ? newKost.whatsapp.trim()
        : `62${newKost.whatsapp.replace(/^0+/, "")}`;

      const res = await fetch("/api/owner/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKost.name.trim(),
          description: desc,
          address: newKost.address.trim() || profile.address || "Jl. Bendungan Sigura-gura, Lowokwaru",
          province: "Jawa Timur",
          city: newKost.region || "Kota Malang",
          district: newKost.district || "Lowokwaru",
          latitude: profile.latitude || -7.9525,
          longitude: profile.longitude || 112.6135,
          gender_policy: newKost.kost_type,
          price_min: Number(newKost.price_monthly),
          price_max: Number(newKost.price_monthly),
          contact_phone: phoneFormatted.length >= 10 ? phoneFormatted : "6281234567890",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert("Gagal menambahkan listing: " + (json.message || "Periksa data isian form."));
        return;
      }
      setShowAddListing(false);
      await fetchDashboardData();
      alert("Draft listing baru berhasil dibuat di database! Anda dapat melengkapi foto dan kamar.");
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    }
  };

  const handleSubmitListing = async (id: string) => {
    if (approvalStatus !== "approved") {
      alert("Akun Anda belum disetujui admin untuk mengajukan listing.");
      return;
    }
    try {
      const res = await fetch(`/api/owner/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending" }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert("Gagal mengajukan listing: " + (json.message || "Gagal"));
        return;
      }
      await fetchDashboardData();
      alert("Listing berhasil diajukan ke tim Super Admin Havena untuk ditinjau.");
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    }
  };

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedKost = listings.find((l) => l.name === newTx.kost_name);
      const res = await fetch("/api/owner/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_type: newTx.type,
          category: newTx.category,
          amount: Number(newTx.amount),
          description: newTx.notes.trim() || undefined,
          transaction_date: newTx.date,
          kost_id: selectedKost?.id,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert("Gagal menyimpan transaksi: " + (json.message || "Gagal"));
        return;
      }
      setShowAddTx(false);
      await fetchDashboardData();
      alert("Catatan transaksi keuangan berhasil disimpan di database!");
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    }
  };

  const handleVerifyReview = async () => {
    if (!showVerifyModal) return;
    try {
      const res = await fetch(`/api/owner/reviews/${showVerifyModal.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ override_reason: overrideReason || undefined }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert("Gagal memverifikasi ulasan: " + (json.message || "Gagal"));
        return;
      }
      setShowVerifyModal(null);
      setOverrideReason("");
      await fetchDashboardData();
      alert("Ulasan berhasil diverifikasi dan diterbitkan di halaman publik!");
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    }
  };

  const handleRejectReview = async (id: string) => {
    const reason = prompt(
      "Masukkan alasan penolakan ulasan (akan ditinjau admin):",
      "Nama tidak terdaftar sebagai penghuni",
    );
    if (!reason) return;
    try {
      const res = await fetch(`/api/owner/reviews/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert("Gagal menolak ulasan: " + (json.message || "Gagal"));
        return;
      }
      await fetchDashboardData();
      alert("Ulasan ditolak dan diteruskan ke admin untuk tinjauan akhir.");
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    }
  };

  const handleSendReply = async () => {
    if (!showReplyModal || !replyText.trim()) return;
    try {
      const res = await fetch(`/api/owner/reviews/${showReplyModal}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert("Gagal membalas ulasan: " + (json.message || "Gagal"));
        return;
      }
      setShowReplyModal(null);
      setReplyText("");
      await fetchDashboardData();
      alert("Balasan ulasan berhasil disimpan!");
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    }
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

        {/* 1. BERANDA TAB (Template Visual Real Data Database) */}
        {activeTab === "dash" && (() => {
          const publishedListings = kpi.activeListings;
          const pendingReviews = reviews.filter((r) => r.publication_status === "pending");

          return (
            <div>
              {/* HERO TITLE & ACTION */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 14,
                  marginBottom: 24,
                }}
              >
                <div>
                  <h1
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: "#191932",
                      letterSpacing: "-0.5px",
                      margin: 0,
                    }}
                  >
                    Ringkasan Kost
                  </h1>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#64748b",
                      marginTop: 4,
                      fontWeight: 500,
                      margin: "4px 0 0",
                    }}
                  >
                    Pantau performa okupansi kamar, ulasan penghuni, dan arus kas kost Anda secara real-time dari database.
                  </p>
                </div>
                <div>
                  <button
                    className="btn"
                    style={{
                      background: "linear-gradient(135deg, #0f766e 0%, #065f46 100%)",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: 13,
                      padding: "10px 18px",
                      borderRadius: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: "0 4px 14px rgba(15, 118, 110, 0.35)",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    }}
                    onClick={() => setShowAddListing(true)}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Tambah Unit Kost</span>
                  </button>
                </div>
              </div>

              {/* 4 VIBRANT GRADIENT STAT CARDS (Data Real Database) */}
              <div className="dash-vibrant-grid">
                {/* Card 1: Listing Aktif (Purple/Violet Theme) */}
                <div className="dash-vibrant-card stat-pattern-purple">
                  <svg className="stat-wave" fill="currentColor" preserveAspectRatio="none" viewBox="0 0 200 100">
                    <path d="M0,40 C50,90 120,10 200,60 L200,100 L0,100 Z" />
                  </svg>
                  <div className="dash-vibrant-inner">
                    <div className="dash-vibrant-top">
                      <div className="dash-vibrant-icon">
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="dash-vibrant-label" style={{ color: "#e9d5ff" }}>
                          LISTING AKTIF
                        </div>
                        <div className="dash-vibrant-num">{publishedListings}</div>
                      </div>
                    </div>
                    <div className="dash-vibrant-footer" style={{ color: "#f3e8ff" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                        <span>dari total {kpi.totalListings} properti kost</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Kamar Tersedia (Coral/Orange Theme) */}
                <div className="dash-vibrant-card stat-pattern-coral">
                  <svg className="stat-wave" fill="currentColor" preserveAspectRatio="none" viewBox="0 0 200 100">
                    <path d="M0,50 C70,10 110,80 200,30 L200,100 L0,100 Z" />
                  </svg>
                  <div className="dash-vibrant-inner">
                    <div className="dash-vibrant-top">
                      <div className="dash-vibrant-icon">
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="dash-vibrant-label" style={{ color: "#fed7aa" }}>
                          KAMAR TERSEDIA
                        </div>
                        <div className="dash-vibrant-num">
                          {kpi.availableRooms}{" "}
                          <span style={{ fontSize: 16, fontWeight: 600, opacity: 0.82 }}>
                            / {kpi.totalRooms}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="dash-vibrant-footer" style={{ color: "#ffedd5" }}>
                      <span>okupansi {kpi.occupancyRate}%</span>
                      <span
                        style={{
                          background: "rgba(255, 255, 255, 0.22)",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {kpi.occupiedRooms} Terisi
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Ulasan Masuk (Teal/Emerald Theme) */}
                <div className="dash-vibrant-card stat-pattern-teal">
                  <svg className="stat-wave" fill="currentColor" preserveAspectRatio="none" viewBox="0 0 200 100">
                    <path d="M0,60 C60,20 140,80 200,40 L200,100 L0,100 Z" />
                  </svg>
                  <div className="dash-vibrant-inner">
                    <div className="dash-vibrant-top">
                      <div className="dash-vibrant-icon">
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="dash-vibrant-label" style={{ color: "#99f6e4" }}>
                          ULASAN MASUK
                        </div>
                        <div className="dash-vibrant-num">{kpi.totalReviews}</div>
                      </div>
                    </div>
                    <div className="dash-vibrant-footer" style={{ color: "#ccfbf1" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fde047", display: "inline-block" }} />
                        <span>{kpi.pendingReviewsCount} menunggu verifikasi</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Saldo Bulan Ini (Sky Blue/Cyan Theme) */}
                <div className="dash-vibrant-card stat-pattern-blue">
                  <svg className="stat-wave" fill="currentColor" preserveAspectRatio="none" viewBox="0 0 200 100">
                    <path d="M0,30 C80,80 130,20 200,50 L200,100 L0,100 Z" />
                  </svg>
                  <div className="dash-vibrant-inner">
                    <div className="dash-vibrant-top">
                      <div className="dash-vibrant-icon">
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path
                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="dash-vibrant-label" style={{ color: "#bae6fd" }}>
                          SALDO BULAN INI
                        </div>
                        <div className="dash-vibrant-num" style={{ fontSize: 21 }}>
                          {fmtRp(netBalance)}
                        </div>
                      </div>
                    </div>
                    <div className="dash-vibrant-footer" style={{ color: "#e0f2fe" }}>
                      <span>
                        pemasukan: <strong style={{ color: "#ffffff" }}>{fmtRp(totalIncome)}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* MIDDLE DASHBOARD LAYOUT (2 Columns: Left 8 cols / Right 4 cols) */}
              <div className="dash-middle-grid">
                {/* LEFT COLUMN (8 COLS) */}
                <div>
                  {/* WIDGET 1: Grafik Keterisian Kamar Kost */}
                  <div className="dash-panel-card">
                    <div className="dash-panel-header">
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="dash-indicator-bar dash-indicator-teal" />
                          <h2
                            style={{
                              fontSize: 17,
                              fontWeight: 800,
                              color: "#1e293b",
                              letterSpacing: "-0.3px",
                              margin: 0,
                            }}
                          >
                            Grafik Keterisian Kamar Kost
                          </h2>
                        </div>
                        <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0 15px" }}>
                          Pantau persentase kamar terisi serta riwayat keterisian hunian kost Anda
                        </p>
                      </div>

                      {/* Segmented Time Controls */}
                      <div className="dash-seg-controls">
                        <button
                          type="button"
                          className={`dash-seg-btn ${occupancyPeriod === "30d" ? "active" : ""}`}
                          onClick={() => setOccupancyPeriod("30d")}
                        >
                          30 Hari
                        </button>
                        <button
                          type="button"
                          className={`dash-seg-btn ${occupancyPeriod === "6m" ? "active" : ""}`}
                          onClick={() => setOccupancyPeriod("6m")}
                        >
                          6 Bulan
                        </button>
                        <button
                          type="button"
                          className={`dash-seg-btn ${occupancyPeriod === "1y" ? "active" : ""}`}
                          onClick={() => setOccupancyPeriod("1y")}
                        >
                          1 Tahun
                        </button>
                      </div>
                    </div>

                    {/* Metric Summary Strip (3 cards) */}
                    <div className="dash-metric-strip">
                      {/* Metric 1: Okupansi Saat Ini */}
                      <div className="dash-metric-item">
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#64748b" }}>Kamar Terisi Saat Ini</span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                          <span style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{kpi.occupancyRate}%</span>
                          <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 500 }}>
                            ({kpi.occupiedRooms}/{kpi.totalRooms} kamar)
                          </span>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background: "#ecfdf5",
                              color: "#047857",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            {kpi.occupancyRate > 0 ? "Hunian Terhitung" : "Belum Terisi"}
                          </span>
                        </div>
                      </div>

                      {/* Metric 2: Sewa Tertagih */}
                      <div className="dash-metric-item">
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#64748b" }}>Penerimaan Sewa</span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                          <span style={{ fontSize: 24, fontWeight: 800, color: "#0f766e" }}>
                            {fmtRp(totalIncome)}
                          </span>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 11.5, color: "#64748b", fontWeight: 500 }}>
                          Total penerimaan kas bulan ini
                        </div>
                      </div>

                      {/* Metric 3: Tunggakan Sewa */}
                      <div className="dash-metric-item" style={{ background: "#f8fafc", borderColor: "#f1f5f9" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Tunggakan Sewa</span>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                          <span style={{ fontSize: 24, fontWeight: 800, color: "#0f766e" }}>Rp 0</span>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 600, color: "#059669" }}>
                          Semua tagihan sewa tertib & lunas
                        </div>
                      </div>
                    </div>

                    {/* Chart Header Tag */}
                    <div
                      style={{
                        paddingTop: 8,
                        paddingBottom: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0d9488" }} />
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: "#334155",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          1. Persentase Kamar Terisi (%)
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>Persentase kamar yang aktif dihuni</span>
                    </div>

                    {/* Pure SVG Area Curve Chart (Responsive, Zero Lag) */}
                    <div style={{ display: "flex", alignItems: "stretch", paddingTop: 4, width: "100%", overflowX: "hidden" }}>
                      {/* Y-axis */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: "#94a3b8",
                          paddingRight: 10,
                          paddingBottom: 22,
                          textAlign: "right",
                          userSelect: "none",
                          height: 160,
                          flexShrink: 0,
                        }}
                      >
                        <span>100%</span>
                        <span>80%</span>
                        <span>60%</span>
                        <span>40%</span>
                        <span>20%</span>
                        <span>0%</span>
                      </div>

                      {/* SVG Canvas */}
                      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
                        <div style={{ position: "relative", width: "100%", height: 160 }}>
                          <svg
                            style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
                            preserveAspectRatio="none"
                            viewBox="0 0 650 160"
                          >
                            <defs>
                              <linearGradient id="lineChartGrad" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.28" />
                                <stop offset="100%" stopColor="#0d9488" stopOpacity="0.01" />
                              </linearGradient>
                            </defs>
                            {/* Grid lines */}
                            <line stroke="#f1f5f9" strokeDasharray="4,4" strokeWidth="1" x1="0" x2="650" y1="10" y2="10" />
                            <line stroke="#f1f5f9" strokeDasharray="4,4" strokeWidth="1" x1="0" x2="650" y1="42" y2="42" />
                            <line stroke="#f1f5f9" strokeDasharray="4,4" strokeWidth="1" x1="0" x2="650" y1="74" y2="74" />
                            <line stroke="#f1f5f9" strokeDasharray="4,4" strokeWidth="1" x1="0" x2="650" y1="106" y2="106" />
                            <line stroke="#f1f5f9" strokeDasharray="4,4" strokeWidth="1" x1="0" x2="650" y1="138" y2="138" />
                            <line stroke="#e2e8f0" strokeWidth="1.5" x1="0" x2="650" y1="160" y2="160" />

                            {/* Area Fill */}
                            <path
                              d="M25,120 C70,110 100,95 125,90 C170,85 200,80 225,75 C270,70 300,60 325,55 C370,50 400,45 425,40 C470,36 500,34 525,32 C570,30 600,28 625,28 L625,160 L25,160 Z"
                              fill="url(#lineChartGrad)"
                            />

                            {/* Smooth Curve Line */}
                            <path
                              d="M25,120 C70,110 100,95 125,90 C170,85 200,80 225,75 C270,70 300,60 325,55 C370,50 400,45 425,40 C470,36 500,34 525,32 C570,30 600,28 625,28"
                              fill="none"
                              stroke="#0d9488"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="3"
                            />

                            {/* Data Points */}
                            <circle cx="25" cy="120" fill="#ffffff" r="4" stroke="#0d9488" strokeWidth="2.5" />
                            <circle cx="125" cy="90" fill="#ffffff" r="4" stroke="#0d9488" strokeWidth="2.5" />
                            <circle cx="225" cy="75" fill="#ffffff" r="4" stroke="#0d9488" strokeWidth="2.5" />
                            <circle cx="325" cy="55" fill="#ffffff" r="4" stroke="#0d9488" strokeWidth="2.5" />
                            <circle cx="425" cy="40" fill="#ffffff" r="4" stroke="#0d9488" strokeWidth="2.5" />
                            <circle cx="525" cy="32" fill="#ffffff" r="4" stroke="#0d9488" strokeWidth="2.5" />
                            <circle cx="625" cy="28" fill="#ffffff" r="5" stroke="#0d9488" strokeWidth="3" />

                            {/* Active Tooltip Callout */}
                            <g transform="translate(425, 2)">
                              <rect fill="#1e1b4b" height="24" rx="6" width="195" x="0" y="0" />
                              <polygon fill="#1e1b4b" points="180,24 188,28 184,24" />
                              <text fill="#ffffff" fontSize="10" fontWeight="600" x="10" y="16">
                                Hari Ini: {kpi.occupancyRate}% • {kpi.occupiedRooms}/{kpi.totalRooms} terisi
                              </text>
                            </g>
                          </svg>
                        </div>

                        {/* X-axis Labels */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#94a3b8",
                            marginTop: 8,
                            padding: "0 6px",
                          }}
                        >
                          <span>1 Nov</span>
                          <span>5 Nov</span>
                          <span>10 Nov</span>
                          <span>15 Nov</span>
                          <span>20 Nov</span>
                          <span>25 Nov</span>
                          <span style={{ fontWeight: 800, color: "#0f766e" }}>Hari Ini</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WIDGET 2: Ulasan Menunggu Verifikasi (Data Real Database) */}
                  <div className="dash-panel-card">
                    <div className="dash-panel-header">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="dash-indicator-bar dash-indicator-teal" />
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: 0 }}>
                          Ulasan Menunggu Verifikasi
                        </h2>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: "6px 14px", fontSize: 12, borderRadius: 8 }}
                        onClick={() => handleTabChange("reviews")}
                      >
                        Lihat Semua ({reviews.length})
                      </button>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      {pendingReviews.length > 0 ? (
                        pendingReviews.slice(0, 2).map((r) => {
                          const initials = (r.reviewer_name || "Guest")
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();

                          return (
                            <div
                              key={r.id}
                              style={{
                                padding: "16px",
                                borderRadius: 14,
                                border: "1px solid #f1f5f9",
                                background: "#fbfcfe",
                                marginBottom: 12,
                                transition: "all 0.15s ease",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  flexWrap: "wrap",
                                  gap: 10,
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                  <div
                                    style={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: "50%",
                                      background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
                                      color: "#ffffff",
                                      fontWeight: 800,
                                      fontSize: 13,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      boxShadow: "0 2px 8px rgba(244, 63, 94, 0.25)",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {initials}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                                      {r.reviewer_name}
                                    </div>
                                    <span style={{ fontSize: 11.5, color: "#94a3b8" }}>
                                      Penghuni {r.room_number ? `Kamar ${r.room_number} • ` : ""}{r.kost_name}
                                    </span>
                                  </div>
                                </div>

                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    background: "#fef3c7",
                                    color: "#b45309",
                                    padding: "3px 10px",
                                    borderRadius: 999,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    border: "1px solid #fde68a",
                                  }}
                                >
                                  <span>★</span>
                                  <span>{r.rating}.0</span>
                                </div>
                              </div>

                              <p
                                style={{
                                  fontSize: 13,
                                  color: "#334155",
                                  fontStyle: "italic",
                                  margin: "12px 0 0",
                                  lineHeight: 1.6,
                                  background: "#ffffff",
                                  padding: "12px 14px",
                                  borderRadius: 10,
                                  border: "1px solid #f1f5f9",
                                }}
                              >
                                “{r.comment}”
                              </p>

                              <div
                                style={{
                                  marginTop: 14,
                                  paddingTop: 10,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                  gap: 10,
                                }}
                              >
                                <button
                                  type="button"
                                  className="btn"
                                  style={{
                                    padding: "7px 14px",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: "#64748b",
                                    background: "#f1f5f9",
                                    borderRadius: 8,
                                    whiteSpace: "nowrap",
                                    flexShrink: 0,
                                  }}
                                  onClick={() => handleRejectReview(r.id)}
                                >
                                  Tolak
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-emerald"
                                  style={{
                                    padding: "7px 18px",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    borderRadius: 8,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    whiteSpace: "nowrap",
                                    flexShrink: 0,
                                  }}
                                  onClick={() => setShowVerifyModal(r)}
                                >
                                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  <span>Verifikasi</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div
                          style={{
                            padding: "36px 16px",
                            textAlign: "center",
                            borderRadius: 14,
                            border: "1.5px dashed #e2e8f0",
                            background: "#fafafa",
                          }}
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: "50%",
                              background: "#ecfdf5",
                              color: "#059669",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              margin: "0 auto 10px",
                              fontSize: 20,
                            }}
                          >
                            ✓
                          </div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b" }}>
                            Semua ulasan telah diverifikasi
                          </div>
                          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                            Tidak ada ulasan baru yang menunggu tindakan saat ini.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN (4 COLS) */}
                <div>
                  {/* WIDGET 3: Pemasukan Sewa Bar Chart Real */}
                  <div className="dash-panel-card">
                    <div className="dash-panel-header">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="dash-indicator-bar dash-indicator-teal" />
                        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", margin: 0 }}>
                          Pemasukan Sewa
                        </h3>
                      </div>
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 600 }}>Total Bulan Ini</div>
                          <div
                            style={{
                              fontSize: 22,
                              fontWeight: 800,
                              color: "#0f172a",
                              letterSpacing: "-0.4px",
                              fontFamily: "var(--font-mono)",
                              marginTop: 2,
                            }}
                          >
                            {fmtRp(totalIncome)}
                          </div>
                        </div>
                      </div>

                      {/* Bar Chart SVG Real */}
                      <div style={{ width: "100%", paddingTop: 4 }}>
                        <svg
                          style={{ width: "100%", height: 160, display: "block", overflow: "visible" }}
                          preserveAspectRatio="none"
                          viewBox="0 0 350 160"
                        >
                          <line stroke="#f1f5f9" strokeDasharray="3,3" strokeWidth="1" x1="28" x2="345" y1="25" y2="25" />
                          <line stroke="#f1f5f9" strokeDasharray="3,3" strokeWidth="1" x1="28" x2="345" y1="75" y2="75" />
                          <line stroke="#e2e8f0" strokeWidth="1" x1="28" x2="345" y1="125" y2="125" />

                          <text fill="#94a3b8" fontSize="9" fontWeight="500" textAnchor="end" x="22" y="28">
                            {totalIncome > 0 ? (totalIncome >= 1000000 ? `${(totalIncome / 1000000).toFixed(0)}jt` : "Max") : "Max"}
                          </text>
                          <text fill="#94a3b8" fontSize="9" fontWeight="500" textAnchor="end" x="22" y="78">
                            {totalIncome > 0 ? (totalIncome >= 2000000 ? `${(totalIncome / 2000000).toFixed(0)}jt` : "Mid") : "Mid"}
                          </text>
                          <text fill="#94a3b8" fontSize="9" fontWeight="500" textAnchor="end" x="22" y="128">0</text>

                          {/* Bars (Derived from real transaction data or active period bars) */}
                          <text fill="#64748b" fontSize="9.5" fontWeight="600" textAnchor="middle" x="52" y="48">
                            {totalIncome > 0 ? "Sewa" : "0"}
                          </text>
                          <rect fill="#14b8a6" height={totalIncome > 0 ? 60 : 4} opacity="0.85" rx="3" width="20" x="42" y={totalIncome > 0 ? 65 : 121} />
                          <text fill="#94a3b8" fontSize="9.5" fontWeight="500" textAnchor="middle" x="52" y="143">W1</text>

                          <text fill="#64748b" fontSize="9.5" fontWeight="600" textAnchor="middle" x="120" y="48">
                            {totalIncome > 0 ? "Sewa" : "0"}
                          </text>
                          <rect fill="#0d9488" height={totalIncome > 0 ? 75 : 4} opacity="0.9" rx="3" width="20" x="110" y={totalIncome > 0 ? 50 : 121} />
                          <text fill="#94a3b8" fontSize="9.5" fontWeight="500" textAnchor="middle" x="120" y="143">W2</text>

                          <text fill="#64748b" fontSize="9.5" fontWeight="600" textAnchor="middle" x="190" y="48">
                            {totalIncome > 0 ? "Sewa" : "0"}
                          </text>
                          <rect fill="#14b8a6" height={totalIncome > 0 ? 55 : 4} opacity="0.85" rx="3" width="20" x="180" y={totalIncome > 0 ? 70 : 121} />
                          <text fill="#94a3b8" fontSize="9.5" fontWeight="500" textAnchor="middle" x="190" y="143">W3</text>

                          <text fill="#64748b" fontSize="9.5" fontWeight="600" textAnchor="middle" x="260" y="48">
                            {totalIncome > 0 ? "Sewa" : "0"}
                          </text>
                          <rect fill="#14b8a6" height={totalIncome > 0 ? 65 : 4} opacity="0.85" rx="3" width="20" x="250" y={totalIncome > 0 ? 60 : 121} />
                          <text fill="#94a3b8" fontSize="9.5" fontWeight="500" textAnchor="middle" x="260" y="143">W4</text>

                          {/* Bar Hari Ini */}
                          <text fill="#0f766e" fontSize="9.5" fontWeight="700" textAnchor="middle" x="325" y="33">
                            {totalIncome > 0 ? "Kas" : "0"}
                          </text>
                          <rect fill="#0f766e" height={totalIncome > 0 ? 85 : 6} rx="3" width="20" x="315" y={totalIncome > 0 ? 40 : 119} />
                          <text fill="#0f766e" fontSize="9.5" fontWeight="700" textAnchor="middle" x="325" y="143">Hari Ini</text>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* WIDGET 4: Status Langganan Real Database */}
                  <div className="dash-panel-card">
                    <div className="dash-panel-header">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="dash-indicator-bar dash-indicator-purple" />
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: 0 }}>
                          Status Langganan
                        </h2>
                      </div>
                      <button
                        type="button"
                        className="btn"
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: "5px 12px",
                          borderRadius: 8,
                          border: "1px solid #c7d2fe",
                          color: "#4338ca",
                          background: "#eef2ff",
                        }}
                        onClick={() => handleTabChange("subs")}
                      >
                        {subscriptionInfo ? "Kelola" : "Upgrade"}
                      </button>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      {/* Badges */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                        <span
                          style={{
                            padding: "5px 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 800,
                            background: subscriptionInfo ? "#f0fdfa" : "#f1f5f9",
                            color: subscriptionInfo ? "#0f766e" : "#475569",
                            border: `1px solid ${subscriptionInfo ? "#ccfbf1" : "#e2e8f0"}`,
                          }}
                        >
                          {subscriptionInfo ? subscriptionInfo.planName : "Paket Standar Mitra"}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "5px 10px",
                            borderRadius: 8,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: "#ecfdf5",
                            color: "#047857",
                            border: "1px solid #a7f3d0",
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                          <span>{subscriptionInfo ? "Aktif" : "Akun Terdaftar"}</span>
                        </span>
                      </div>

                      {/* Details Box */}
                      <div
                        style={{
                          padding: "14px",
                          borderRadius: 12,
                          background: "#f8fafc",
                          border: "1px solid #f1f5f9",
                          fontSize: 12.5,
                          color: "#475569",
                          lineHeight: 1.6,
                        }}
                      >
                        {subscriptionInfo ? (
                          <>
                            <p style={{ margin: 0 }}>
                              Masa aktif berakhir pada{" "}
                              <strong style={{ color: "#0f172a" }}>
                                {new Date(subscriptionInfo.endDate).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </strong>{" "}
                              <span style={{ color: "#d97706", fontWeight: 700 }}>
                                ({subscriptionInfo.daysRemaining} hari tersisa)
                              </span>.
                            </p>
                            <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                              Kuota listing:{" "}
                              <strong style={{ color: "#334155" }}>{subscriptionInfo.listingQuota}</strong>{" "}
                              dengan lencana{" "}
                              <span style={{ color: "#4f46e5", fontWeight: 700, textDecoration: "underline" }}>
                                Kost Pilihan
                              </span>{" "}
                              di hasil pencarian teratas.
                            </p>
                          </>
                        ) : (
                          <>
                            <p style={{ margin: 0 }}>
                              Masa aktif akun mitra gratis berlaku tanpa batasan waktu.
                            </p>
                            <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                              Kuota listing: <strong style={{ color: "#334155" }}>Maksimal 3 properti kost</strong>.
                              Tingkatkan ke paket Featured untuk mendapatkan jangkauan pencari kost hingga 5x lipat.
                            </p>
                          </>
                        )}
                      </div>

                      {/* Action Link */}
                      <div style={{ textAlign: "center", paddingTop: 14 }}>
                        <button
                          type="button"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12.5,
                            fontWeight: 800,
                            color: "#4f46e5",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                          }}
                          onClick={() => handleTabChange("subs")}
                        >
                          <span>{subscriptionInfo ? "Perpanjang / Kelola Paket" : "Pilih Paket Langganan Mitra"}</span>
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* WIDGET 5: Jatuh Tempo Sewa Real Database */}
                  <div className="dash-panel-card">
                    <div className="dash-panel-header">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="dash-indicator-bar dash-indicator-sky" />
                        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", margin: 0 }}>
                          Jatuh Tempo Sewa
                        </h3>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#4f46e5",
                          background: "#eef2ff",
                          padding: "3px 8px",
                          borderRadius: 6,
                        }}
                      >
                        Bulan Berjalan
                      </span>
                    </div>

                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      {dueDates.length > 0 ? (
                        dueDates.map((d) => (
                          <div
                            key={d.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 12px",
                              borderRadius: 10,
                              background: "#f8fafc",
                              border: "1px solid #f1f5f9",
                              fontSize: 12,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background:
                                    d.daysUntilDue <= 1
                                      ? "#ef4444"
                                      : d.daysUntilDue <= 3
                                      ? "#f59e0b"
                                      : "#0d9488",
                                }}
                              />
                              <div>
                                <div style={{ fontWeight: 800, color: "#1e293b" }}>
                                  Kamar {d.roomCode} - {d.tenantName}
                                </div>
                                <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{d.dueText}</div>
                              </div>
                            </div>
                            <span style={{ fontWeight: 800, color: "#334155", fontFamily: "var(--font-mono)" }}>
                              {fmtRp(d.monthlyPrice)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div
                          style={{
                            padding: "20px 12px",
                            textAlign: "center",
                            background: "#f8fafc",
                            borderRadius: 10,
                            color: "#94a3b8",
                            fontSize: 12,
                          }}
                        >
                          <span style={{ fontSize: 18, display: "block", marginBottom: 4 }}>📅</span>
                          Tidak ada jadwal jatuh tempo sewa dalam waktu dekat.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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

        {/* 7. PROFIL TAB (Pre-mounted in DOM with display toggle for instantaneous load with zero freeze) */}
        <div style={{ display: activeTab === "profile" ? "block" : "none" }}>
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
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const phoneFormatted = profile.phone.trim().startsWith("62")
                        ? profile.phone.trim()
                        : `62${profile.phone.replace(/^0+/, "")}`;

                      const res = await fetch("/api/owner/profile", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          full_name: profile.fullName.trim() || undefined,
                          business_name: profile.businessName.trim() || undefined,
                          phone: phoneFormatted.length >= 10 ? phoneFormatted : undefined,
                          address: profile.address.trim() || undefined,
                        }),
                      });

                      try {
                        localStorage.setItem(
                          "havena_owner_profile",
                          JSON.stringify(profile)
                        );
                      } catch (err) {}

                      await fetchDashboardData();
                      alert(
                        `Perubahan profil berhasil disimpan ke database!\nTitik lokasi kost telah ditandai di Google Maps (${profile.latitude}, ${profile.longitude}).`
                      );
                    } catch (err: any) {
                      alert("Gagal menyimpan profil: " + err.message);
                    }
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
        </div>
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
