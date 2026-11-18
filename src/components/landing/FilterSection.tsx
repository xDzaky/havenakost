"use client";

import React, { useState, useMemo } from "react";
import type { KostListing, Landmark } from "@/types/kost";
import { KostCard } from "./KostCard";
import { LeafletMap } from "./LeafletMap";

interface FilterSectionProps {
  kosts: KostListing[];
  campuses: Landmark[];
  areas: Array<{ name: string; lat: number; lng: number; region: string }>;
  selectedDest: Landmark;
  onSelectDest: (dest: Landmark) => void;
  onOpenDetail: (id: string) => void;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function FilterSection({
  kosts,
  campuses,
  areas,
  selectedDest,
  onSelectDest,
  onOpenDetail,
}: FilterSectionProps) {
  // State for search and radius
  const [scanRadius, setScanRadius] = useState<number>(3000); // 3 km default
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [sortOption, setSortOption] = useState<string>("nearest");

  // Sidebar filter states
  const [selectedType, setSelectedType] = useState<string>("all");
  const [priceMax, setPriceMax] = useState<number>(2500000);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [selectedFacs, setSelectedFacs] = useState<string[]>([]);
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Search autocomplete drop
  const [searchDropOpen, setSearchDropOpen] = useState(false);

  // Pagination state: 15 cards per page
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Filter and sort items
  const filteredKosts = useMemo(() => {
    let result = kosts.map((k) => {
      const d = haversine(selectedDest.lat, selectedDest.lng, k.lat, k.lng);
      return { ...k, _d: d };
    });

    // Radius scan filter
    if (scanRadius > 0) {
      result = result.filter((k) => k._d <= scanRadius);
    }

    // Text search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (k) =>
          k.name.toLowerCase().includes(q) ||
          k.address.toLowerCase().includes(q) ||
          k.district.toLowerCase().includes(q)
      );
    }

    // Type filter
    if (selectedType !== "all") {
      result = result.filter((k) => k.kost_type === selectedType);
    }

    // Price max filter
    if (priceMax != null) {
      result = result.filter((k) => k.price_monthly <= priceMax);
    }

    // Period filter
    if (selectedPeriods.length > 0) {
      result = result.filter(
        (k) =>
          k.payment_periods &&
          selectedPeriods.some((p) => k.payment_periods.includes(p))
      );
    }

    // Facility filter
    if (selectedFacs.length > 0) {
      result = result.filter((k) => {
        const f = k.facilities || {};
        return selectedFacs.every((facKey) => (f as any)[facKey]);
      });
    }

    // Available room filter
    if (onlyAvailable) {
      result = result.filter((k) => k.available_rooms > 0);
    }

    // Sort
    result.sort((a, b) => {
      if (sortOption === "price_asc") return a.price_monthly - b.price_monthly;
      if (sortOption === "price_desc") return b.price_monthly - a.price_monthly;
      if (sortOption === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortOption === "newest") return b.id > a.id ? 1 : -1;
      return (a._d || 0) - (b._d || 0);
    });

    return result;
  }, [
    kosts,
    selectedDest,
    scanRadius,
    searchQuery,
    selectedType,
    priceMax,
    selectedPeriods,
    selectedFacs,
    onlyAvailable,
    sortOption,
  ]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedDest,
    scanRadius,
    searchQuery,
    selectedType,
    priceMax,
    selectedPeriods,
    selectedFacs,
    onlyAvailable,
    sortOption,
  ]);

  // Paginated cards (15 per page)
  const totalPages = Math.max(1, Math.ceil(filteredKosts.length / pageSize));
  const pagedKosts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredKosts.slice(start, start + pageSize);
  }, [filteredKosts, currentPage, pageSize]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedType("all");
    setPriceMax(5000000);
    setSelectedPeriods([]);
    setSelectedFacs([]);
    setOnlyAvailable(false);
    setSearchQuery("");
    setScanRadius(3000);
    setSortOption("nearest");
  };

  const togglePeriod = (p: string) => {
    setSelectedPeriods((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const toggleFac = (fKey: string) => {
    setSelectedFacs((prev) =>
      prev.includes(fKey) ? prev.filter((x) => x !== fKey) : [...prev, fKey]
    );
  };

  // Autocomplete suggestion items
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const res: Array<{ type: string; label: string; sub: string; data: Landmark }> = [];

    campuses.forEach((c) => {
      if (c.name.toLowerCase().includes(q) || c.short.toLowerCase().includes(q)) {
        res.push({
          type: "campus",
          label: c.name,
          sub: "Kampus / Landmark",
          data: c,
        });
      }
    });

    areas.forEach((a) => {
      if (a.name.toLowerCase().includes(q)) {
        res.push({
          type: "area",
          label: a.name,
          sub: `Area · ${a.region}`,
          data: { id: a.name, name: a.name, short: a.name.split(" ")[0], lat: a.lat, lng: a.lng },
        });
      }
    });

    return res.slice(0, 6);
  }, [searchQuery, campuses, areas]);

  return (
    <section id="filter-section" className="sec container" style={{ paddingTop: 30 }}>
      {/* SECTION HEADER */}
      <div className="sec-head" style={{ textAlign: "center", marginBottom: 28 }}>
        <span className="sec-eyebrow">
          Filter Pencarian
          <svg viewBox="0 0 120 8" preserveAspectRatio="none">
            <path d="M2 6 C 34 1, 82 1, 118 4" />
          </svg>
        </span>
        <h2 className="sec-title">
          Temukan Kost yang Sesuai <span className="hl">Kebutuhanmu</span>
        </h2>
        <p className="sec-desc">
          Sesuaikan pilihan kost berdasarkan tipe penghuni, anggaran, periode sewa,
          dan fasilitas yang kamu butuhkan.
        </p>
      </div>

      {/* SEARCH RESULTS TOOLBAR */}
      <div
        className="toolrow"
        id="toolRow"
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "12px 18px",
          border: "1px solid var(--line)",
          boxShadow: "var(--sh-sm)",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* LEFT TOOLBAR: SEARCH & RADIUS */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          {/* SEARCH DESTINATION */}
          <div style={{ position: "relative", minWidth: 260, maxWidth: 340 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#F8FAFC",
                border: "1px solid var(--line)",
                borderRadius: 999,
                padding: "6px 14px",
                gap: 8,
              }}
            >
              <svg className="ic" style={{ width: 14, height: 14, color: "#0D9488" }}>
                <use href="#i-pin" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchDropOpen(true);
                }}
                onFocus={() => setSearchDropOpen(true)}
                placeholder={`Pilih Lokasi (${selectedDest.short})...`}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 12.5,
                  fontWeight: 600,
                  width: "100%",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchDropOpen(false);
                  }}
                  style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}
                >
                  <svg className="ic" style={{ width: 13, height: 13, color: "var(--mut)" }}>
                    <use href="#i-x" />
                  </svg>
                </button>
              )}
            </div>

            {/* SUGGESTION DROPDOWN */}
            {searchDropOpen && suggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  borderRadius: 12,
                  boxShadow: "var(--sh-lg)",
                  border: "1px solid var(--line)",
                  zIndex: 80,
                  overflow: "hidden",
                }}
              >
                {suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectDest(s.data);
                      setSearchQuery(s.label);
                      setSearchDropOpen(false);
                    }}
                    style={{
                      padding: "9px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      borderBottom: "1px solid #F1F5F9",
                      fontSize: 12,
                    }}
                    className="sd-item"
                  >
                    <svg className="ic" style={{ width: 14, height: 14, color: "#0D9488" }}>
                      <use href="#i-pin" />
                    </svg>
                    <div>
                      <b style={{ display: "block", color: "var(--teal-950)" }}>{s.label}</b>
                      <small style={{ color: "var(--mut)" }}>{s.sub}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SCAN RADIUS PILLS */}
          <div className="tool-radius-wrap">
            <span className="tool-radius-lbl">Scan Radius:</span>
            <div className="radius-pills" id="radiusPills">
              {[
                { rad: 1000, label: "1 km" },
                { rad: 3000, label: "3 km (Default)" },
                { rad: 5000, label: "5 km" },
                { rad: 10000, label: "10 km" },
                { rad: 0, label: "Semua" },
              ].map((r) => (
                <button
                  key={r.rad}
                  type="button"
                  onClick={() => setScanRadius(r.rad)}
                  className={`rad-pill ${scanRadius === r.rad ? "on" : ""}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT TOOLBAR: COUNT, SORT, VIEW */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 12.5, color: "var(--ink2)", fontWeight: 600 }}>
            Menampilkan <b>{filteredKosts.length}</b> kost{" "}
            {scanRadius > 0 ? `radius ${scanRadius / 1000} km` : ""} dari{" "}
            <b>{selectedDest.short}</b>
          </div>

          <button
            type="button"
            className="btn-filter"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            style={{
              display: "none",
              alignItems: "center",
              gap: 6,
              background: "#F8FAFC",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <svg className="ic" style={{ width: 14, height: 14 }}>
              <use href="#i-filter" />
            </svg>
            Filter
          </button>

          <select
            className="sortsel"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "#fff",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--ink2)",
              cursor: "pointer",
            }}
          >
            <option value="nearest">Terdekat dari Tujuan</option>
            <option value="price_asc">Harga Terendah</option>
            <option value="price_desc">Harga Tertinggi</option>
            <option value="rating">Rating Tertinggi</option>
            <option value="newest">Terbaru Ditambahkan</option>
          </select>

          <div
            className="vseg"
            style={{
              display: "inline-flex",
              background: "#EEF4F6",
              padding: 3,
              borderRadius: 8,
              border: "1px solid var(--line)",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "on" : ""}
              style={{
                border: "none",
                background: viewMode === "list" ? "#fff" : "transparent",
                color: viewMode === "list" ? "var(--teal-950)" : "var(--mut)",
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                boxShadow: viewMode === "list" ? "var(--sh-sm)" : "none",
              }}
            >
              <svg className="ic" style={{ width: 13, height: 13 }}>
                <use href="#i-grid" />
              </svg>
              Daftar
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={viewMode === "map" ? "on" : ""}
              style={{
                border: "none",
                background: viewMode === "map" ? "#fff" : "transparent",
                color: viewMode === "map" ? "var(--teal-950)" : "var(--mut)",
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                boxShadow: viewMode === "map" ? "var(--sh-sm)" : "none",
              }}
            >
              <svg className="ic" style={{ width: 13, height: 13 }}>
                <use href="#i-map" />
              </svg>
              Peta
            </button>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div
        className="res-layout"
        id="resLayout"
        style={{
          display: "grid",
          gridTemplateColumns: "270px 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* LEFT COLUMN: FILTER SIDEBAR */}
        <aside
          className={`faside ${mobileDrawerOpen ? "drawer-open" : ""}`}
          style={{
            background: "#fff",
            borderRadius: 20,
            border: "1px solid var(--line)",
            padding: "20px 18px",
            boxShadow: "var(--sh-sm)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: "1px solid var(--line)",
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--teal-950)", display: "flex", alignItems: "center", gap: 7, margin: 0 }}>
              <svg className="ic" style={{ width: 15, height: 15, color: "#0D9488" }}>
                <use href="#i-filter" />
              </svg>
              Filter Spesifikasi
            </h3>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                background: "var(--emerald-soft2)",
                color: "var(--emerald-dark)",
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              Live
            </span>
          </div>

          {/* 1. TIPE PENGHUNI */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--teal-950)", marginBottom: 8, textTransform: "uppercase" }}>
              Tipe Penghuni
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {[
                { v: "all", label: "Semua" },
                { v: "putri", label: "Putri" },
                { v: "putra", label: "Putra" },
                { v: "campur", label: "Campur" },
                { v: "pasutri", label: "Pasutri" },
              ].map((t) => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setSelectedType(t.v)}
                  className={`pill-chip ${selectedType === t.v ? "on" : ""}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. HARGA BULANAN SLIDER */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--teal-950)", textTransform: "uppercase" }}>
                Harga / Bulan
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--emerald-dark)" }}>
                {priceMax >= 5000000 ? "Maks. Rp 5 jt+" : `Maks. Rp ${(priceMax / 1000000).toFixed(1)} jt`}
              </span>
            </div>
            <input
              type="range"
              min={500000}
              max={5000000}
              step={100000}
              value={priceMax}
              onChange={(e) => setPriceMax(parseInt(e.target.value, 10))}
              style={{ width: "100%", accentColor: "#0D9488", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--mut)", marginTop: 4 }}>
              <span>Rp 500 rb</span>
              <span>Rp 2.5 jt</span>
              <span>Rp 5 jt+</span>
            </div>
          </div>

          {/* 3. PERIODE SEWA */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--teal-950)", marginBottom: 8, textTransform: "uppercase" }}>
              Periode Sewa Diterima
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {["Bulanan", "Per 3 Bulan", "Per 6 Bulan", "Tahunan"].map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => togglePeriod(period)}
                  className={`pill-chip ${selectedPeriods.includes(period) ? "on" : ""}`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* 4. FASILITAS KAMAR & BERSAMA */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--teal-950)", marginBottom: 8, textTransform: "uppercase" }}>
              Fasilitas Kamar &amp; Bersama
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12 }}>
              {[
                { k: "has_private_bath", label: "Kamar Mandi Dalam" },
                { k: "has_ac", label: "AC" },
                { k: "has_wifi", label: "WiFi Cepat" },
                { k: "has_water_heater", label: "Water Heater" },
                { k: "car_parking", label: "Parkir Mobil" },
                { k: "has_shared_kitchen", label: "Dapur Bersama" },
                { k: "has_bed", label: "Kasur" },
                { k: "has_wardrobe", label: "Lemari" },
                { k: "has_desk", label: "Meja Belajar" },
                { k: "is_24_hours", label: "Akses 24 Jam" },
              ].map((item) => (
                <label key={item.k} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={selectedFacs.includes(item.k)}
                    onChange={() => toggleFac(item.k)}
                    style={{ accentColor: "#0D9488", width: 14, height: 14, cursor: "pointer" }}
                  />
                  <span style={{ color: "var(--ink2)" }}>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 5. KETERSEDIAAN KAMAR TOGGLE */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0",
              borderTop: "1px dashed var(--line)",
              borderBottom: "1px dashed var(--line)",
              marginBottom: 16,
            }}
          >
            <div>
              <b style={{ fontSize: 12.5, display: "block", color: "var(--teal-950)" }}>
                Hanya Kamar Tersedia
              </b>
              <small style={{ fontSize: 11, color: "var(--mut)" }}>
                Sembunyikan kost yang penuh
              </small>
            </div>
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              style={{ accentColor: "#0D9488", width: 16, height: 16, cursor: "pointer" }}
            />
          </div>

          {/* RESET FILTER BUTTON */}
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "#F8FAFC",
              color: "var(--ink2)",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.2s ease",
            }}
          >
            <svg className="ic" style={{ width: 13, height: 13 }}>
              <use href="#i-refresh" />
            </svg>
            <span>Reset Semua Filter</span>
          </button>
        </aside>

        {/* RIGHT COLUMN: LIST / MAP RESULTS + PAGINATION */}
        <div style={{ minWidth: 0 }}>
          {viewMode === "map" ? (
            <LeafletMap
              kosts={filteredKosts}
              dest={selectedDest}
              scanRadius={scanRadius}
              onOpenDetail={onOpenDetail}
            />
          ) : (
            <>
              {filteredKosts.length === 0 ? (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 20,
                    border: "1px dashed var(--line)",
                    padding: "60px 20px",
                    textAlign: "center",
                  }}
                >
                  <svg className="ic" style={{ width: 44, height: 44, color: "var(--faint)", marginBottom: 12 }}>
                    <use href="#i-search" />
                  </svg>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: "var(--teal-950)", marginBottom: 6 }}>
                    Tidak ada kost yang cocok dalam radius ini
                  </h4>
                  <p style={{ fontSize: 13, color: "var(--mut)", marginBottom: 18 }}>
                    Coba pilih scan radius &quot;5 km&quot; atau klik &quot;Reset Semua Filter&quot;.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="btn btn-teal btn-sm"
                    style={{ margin: "0 auto", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <svg className="ic" style={{ width: 13, height: 13 }}>
                      <use href="#i-refresh" />
                    </svg>
                    Reset Filter
                  </button>
                </div>
              ) : (
                <>
                  {/* RESPONSIVE CARDS GRID (2 COLUMNS ON MOBILE AS REQUESTED) */}
                  <div
                    className="cards responsive-cards-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 18,
                    }}
                  >
                    {pagedKosts.map((kost) => (
                      <KostCard
                        key={kost.id}
                        kost={kost}
                        destShort={selectedDest.short}
                        onOpenDetail={onOpenDetail}
                      />
                    ))}
                  </div>

                  {/* PAGINATION CONTROLS: 15 CARDS PER PAGE */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      marginTop: 32,
                      padding: "16px 0",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* PREV BUTTON */}
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        const el = document.getElementById("filter-section");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 10,
                        border: "1px solid var(--line)",
                        background: currentPage === 1 ? "#F1F5F9" : "#fff",
                        color: currentPage === 1 ? "var(--faint)" : "var(--ink2)",
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: currentPage === 1 ? "none" : "var(--sh-sm)",
                      }}
                    >
                      <svg className="ic" style={{ width: 13, height: 13 }}>
                        <use href="#i-chevl" />
                      </svg>
                      <span>Sebelumnya</span>
                    </button>

                    {/* PAGE NUMBERS */}
                    <div style={{ display: "flex", gap: 4 }}>
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                        let pageNum = i + 1;
                        if (totalPages > 5 && currentPage > 3) {
                          pageNum = currentPage - 2 + i;
                          if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                        }
                        if (pageNum < 1 || pageNum > totalPages) return null;

                        const isCurrent = pageNum === currentPage;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => {
                              setCurrentPage(pageNum);
                              const el = document.getElementById("filter-section");
                              if (el) el.scrollIntoView({ behavior: "smooth" });
                            }}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              border: isCurrent ? "none" : "1px solid var(--line)",
                              background: isCurrent ? "var(--emerald)" : "#fff",
                              color: isCurrent ? "#fff" : "var(--ink2)",
                              fontSize: 12.5,
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* NEXT BUTTON */}
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        const el = document.getElementById("filter-section");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 10,
                        border: "1px solid var(--line)",
                        background: currentPage === totalPages ? "#F1F5F9" : "#fff",
                        color: currentPage === totalPages ? "var(--faint)" : "var(--ink2)",
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: currentPage === totalPages ? "none" : "var(--sh-sm)",
                      }}
                    >
                      <span>Berikutnya</span>
                      <svg className="ic" style={{ width: 13, height: 13 }}>
                        <use href="#i-chevr" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
