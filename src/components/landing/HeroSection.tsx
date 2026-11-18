"use client";

import React, { useState, useEffect } from "react";
import type { Landmark } from "@/types/kost";

interface HeroSectionProps {
  campuses: Landmark[];
  selectedDest: Landmark;
  onSelectCampus: (campus: Landmark) => void;
  onSearchSubmit: (query: string) => void;
}

export function HeroSection({
  campuses,
  selectedDest,
  onSelectCampus,
  onSearchSubmit,
}: HeroSectionProps) {
  const [rotIdx, setRotIdx] = useState(0);
  const [searchVal, setSearchVal] = useState("");

  const rotatingWords = [
    "Universitas Negeri Malang (UM)",
    "Universitas Brawijaya (UB)",
    "UMM Kampus III",
    "Polinema",
    "UIN Maulana Malik Ibrahim",
    "ITN Malang",
    "Unisma",
    "Kota Wisata Batu",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setRotIdx((prev) => (prev + 1) % rotatingWords.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [rotatingWords.length]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      onSearchSubmit(searchVal.trim());
      const el = document.getElementById("filter-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="hero" style={{ position: "relative", overflow: "hidden", paddingBottom: 60 }}>
      {/* BACKGROUND MESH & BLOBS */}
      <div className="hero-bg">
        <div className="hero-mesh" />
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
        <div className="hero-grid-bg" />
      </div>

      <div className="hero-in container" style={{ position: "relative", zIndex: 2 }}>
        {/* TITLE */}
        <h1
          className="hero-title"
          style={{
            animation: "fadeUp 0.7s 0.1s var(--ease) both",
            textAlign: "center",
          }}
        >
          Cari Kost Terdekat di<br />
          <span className="grad">Malang Raya</span>{" "}
          <span className="under">
            Tanpa Ribet
            <svg viewBox="0 0 200 12" preserveAspectRatio="none">
              <path d="M3 9 C 50 2, 130 2, 197 6" />
            </svg>
          </span>
        </h1>

        {/* SUBTITLE */}
        <p
          className="hero-sub"
          style={{
            animation: "fadeUp 0.7s 0.2s var(--ease) both",
            textAlign: "center",
            maxWidth: 620,
            margin: "0 auto 20px",
          }}
        >
          Kota Malang, Kabupaten Malang &amp; Kota Batu — diurutkan otomatis dari
          yang <b>paling dekat</b> dengan destinasi kamu. Hubungi pemilik langsung via
          WhatsApp, <b>tanpa akun, tanpa biaya.</b>
        </p>

        {/* ROTATING DESTINATION TEASER */}
        <div
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "var(--mut)",
            marginBottom: 24,
            fontWeight: 600,
          }}
        >
          Populer di kalangan mahasiswa — dekatkan kos-mu ke{" "}
          <b
            style={{
              color: "var(--emerald-dark)",
              borderBottom: "1.5px dashed var(--emerald)",
              paddingBottom: 1,
              transition: "all 0.3s ease",
            }}
          >
            {rotatingWords[rotIdx]}
          </b>
        </div>

        {/* SEARCH BAR */}
        <div
          className="hero-search-wrap"
          style={{
            animation: "fadeUp 0.7s 0.3s var(--ease) both",
            maxWidth: 580,
            margin: "0 auto 26px",
          }}
        >
          <form
            onSubmit={handleFormSubmit}
            className="hero-search"
            style={{
              display: "flex",
              alignItems: "center",
              background: "#fff",
              borderRadius: 999,
              padding: "6px 8px 6px 18px",
              boxShadow: "0 8px 30px rgba(13, 148, 136, 0.12)",
              border: "1.5px solid var(--line)",
            }}
          >
            <svg
              className="ic"
              style={{
                width: 18,
                height: 18,
                color: "var(--mut)",
                marginRight: 10,
                flexShrink: 0,
              }}
            >
              <use href="#i-search" />
            </svg>
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Cari kampus, jalan, atau area di Malang..."
              style={{
                border: "none",
                outline: "none",
                width: "100%",
                fontSize: 13.5,
                color: "var(--teal-950)",
                background: "transparent",
              }}
            />
            <button
              type="submit"
              className="btn btn-emerald"
              style={{
                borderRadius: 999,
                padding: "10px 22px",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              <svg className="ic" style={{ width: 14, height: 14, marginRight: 4 }}>
                <use href="#i-search" />
              </svg>
              Cari
            </button>
          </form>
        </div>

        {/* HERO STATS BAR */}
        <div
          className="hero-stats"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 20,
            margin: "0 auto 24px",
            animation: "fadeUp 0.7s 0.4s var(--ease) both",
          }}
        >
          <div className="hstat" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--ink2)" }}>
            <svg className="ic" style={{ width: 16, height: 16, color: "var(--emerald)" }}>
              <use href="#i-check" />
            </svg>
            <span>
              <b style={{ color: "var(--teal-950)", fontWeight: 800 }}>300+</b> Kost Terverifikasi
            </span>
          </div>

          <div className="hstat" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--ink2)" }}>
            <svg className="ic" style={{ width: 16, height: 16, color: "var(--emerald)" }}>
              <use href="#i-door" />
            </svg>
            <span>
              <b style={{ color: "var(--teal-950)", fontWeight: 800 }}>1.240+</b> Kamar Tersedia
            </span>
          </div>

          <div className="hstat" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--ink2)" }}>
            <svg className="ic" style={{ width: 16, height: 16, color: "var(--emerald)" }}>
              <use href="#i-building" />
            </svg>
            <span>
              <b style={{ color: "var(--teal-950)", fontWeight: 800 }}>3</b> Wilayah Malang Raya
            </span>
          </div>

          <div className="hstat" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--ink2)" }}>
            <svg className="ic" style={{ width: 16, height: 16, color: "var(--emerald)" }}>
              <use href="#i-wallet" />
            </svg>
            <span>
              <b style={{ color: "var(--teal-950)", fontWeight: 800 }}>100%</b> Gratis Tanpa Akun
            </span>
          </div>
        </div>

        {/* CAMPUS & LANDMARK SHORTCUT PILLS WITH INFINITE MARQUEE LOOP */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginTop: 10,
            animation: "fadeUp 0.8s 0.5s var(--ease) both",
          }}
        >
          {/* INFINITE MARQUEE ROW */}
          <div className="marquee-wrap">
            <div className="marquee-track">
              {[...campuses, ...campuses].map((c, i) => {
                const isSelected = selectedDest.id === c.id;
                return (
                  <button
                    key={`mq-${c.id}-${i}`}
                    type="button"
                    onClick={() => onSelectCampus(c)}
                    className={`mq-chip ${isSelected ? "on" : ""}`}
                    style={{
                      background: isSelected ? "var(--emerald)" : "rgba(255,255,255,0.9)",
                      color: isSelected ? "#fff" : "var(--ink2)",
                      borderColor: isSelected ? "var(--emerald)" : "var(--line)",
                    }}
                  >
                    <svg className="ic" style={{ width: 13, height: 13, color: isSelected ? "#fff" : "var(--emerald-dark)" }}>
                      <use href="#i-pin" />
                    </svg>
                    <span>{c.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STATIC WRAPPED PILLS ROW */}
          <div
            className="pills"
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 8,
              marginTop: 10,
            }}
          >
            {campuses.slice(0, 11).map((c) => {
              const isSelected = selectedDest.id === c.id;
              return (
                <button
                  key={`pill-${c.id}`}
                  type="button"
                  onClick={() => onSelectCampus(c)}
                  className={`pill ${isSelected ? "on" : ""}`}
                >
                  <svg className="ic" style={{ width: 13, height: 13 }}>
                    <use href="#i-pin" />
                  </svg>
                  <span>{c.short}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* INFINITE ANIMATED HERO WAVE */}
      <div className="hero-wave">
        <svg viewBox="0 0 2880 74" preserveAspectRatio="none">
          <path d="M0,40 C120,62 240,66 360,52 C600,28 840,20 1080,38 C1320,56 1560,64 1800,46 C2040,28 2280,22 2520,36 C2640,44 2760,56 2880,50 L2880,74 L0,74 Z" />
        </svg>
      </div>
    </section>
  );
}
