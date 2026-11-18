"use client";

import React, { useState } from "react";
import type { KostListing, Landmark } from "@/types/kost";

interface DetailModalProps {
  kost: KostListing | null;
  dest: Landmark;
  reviews?: Array<{
    id: string;
    kost_id: string;
    reviewer_name: string;
    reviewer_status: string;
    rating: number;
    comment: string;
    created_at: string;
  }>;
  onClose: () => void;
}

const FIC: Record<string, [string, string]> = {
  has_ac: ["i-spark", "AC"],
  has_private_bath: ["i-bath", "KM Dalam"],
  has_wifi: ["i-wifi", "WiFi Cepat"],
  is_24_hours: ["i-clock", "Akses 24 Jam"],
  motor_parking: ["i-moto", "Parkir Motor"],
  car_parking: ["i-car", "Parkir Mobil"],
  has_water_heater: ["i-heater", "Water Heater"],
  has_shared_kitchen: ["i-pot", "Dapur Bersama"],
  has_drying_area: ["i-sun", "Area Jemur"],
  has_bed: ["i-bed", "Kasur"],
  has_wardrobe: ["i-wardrobe", "Lemari"],
  has_desk: ["i-desk", "Meja Belajar"],
  has_fan: ["i-fan", "Kipas Angin"],
};

const TYPE_CONFIG = {
  putra: { label: "Kost Putra", bg: "#0369A1" },
  putri: { label: "Kost Putri", bg: "#DB2777" },
  campur: { label: "Kost Campur", bg: "#0D9488" },
  pasutri: { label: "Kost Pasutri & Karyawan", bg: "#7C3AED" },
};

export function DetailModal({ kost, dest, reviews = [], onClose }: DetailModalProps) {
  const [tab, setTab] = useState<"info" | "fac" | "rev">("info");
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!kost) return null;

  const photos = kost.photos && kost.photos.length > 0
    ? kost.photos
    : [{ id: "p1", photo_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=720&q=80", is_cover: true }];

  const currentPhoto = photos[Math.min(galleryIdx, photos.length - 1)];

  const distStr =
    kost._d != null
      ? kost._d < 1000
        ? `${Math.round(kost._d / 10) * 10} m`
        : `${(kost._d / 1000).toFixed(1).replace(".", ",")} km`
      : "";

  const priceStr = "Rp " + Number(kost.price_monthly || 0).toLocaleString("id-ID");
  const typeInfo = TYPE_CONFIG[kost.kost_type] || TYPE_CONFIG.campur;
  const facs = kost.facilities || {};
  const activeFacs = Object.keys(FIC).filter((k) => facs[k as keyof typeof facs]);

  const waUrl =
    "https://wa.me/" +
    (kost.whatsapp_number || "6281234567890") +
    "?text=" +
    encodeURIComponent(
      `Halo, saya tertarik dengan ${kost.name} yang saya temukan di Havena Kost. Apakah masih ada kamar kosong?`
    );

  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${kost.lat},${kost.lng}`;

  const kostReviews = reviews.filter((r) => r.kost_id === kost.id);

  const handleCopyWa = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(kost.whatsapp_number || "081234567890");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-panel"
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 22,
          boxShadow: "var(--sh-lg)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* CLOSE BUTTON */}
        <button
          type="button"
          onClick={onClose}
          className="modal-x"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            zIndex: 10,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.9)",
            border: "1px solid var(--line)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--sh-sm)",
          }}
        >
          <svg className="ic" style={{ width: 16, height: 16 }}>
            <use href="#i-x" />
          </svg>
        </button>

        {/* GALLERY */}
        <div
          className="dm-gallery"
          style={{
            position: "relative",
            width: "100%",
            height: 300,
            background: "#0F172A",
          }}
        >
          <img
            src={currentPhoto.photo_url}
            alt={kost.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setGalleryIdx((galleryIdx - 1 + photos.length) % photos.length)
                }
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.85)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg className="ic" style={{ width: 18, height: 18 }}>
                  <use href="#i-chevl" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setGalleryIdx((galleryIdx + 1) % photos.length)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.85)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg className="ic" style={{ width: 18, height: 18 }}>
                  <use href="#i-chevr" />
                </svg>
              </button>

              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  display: "flex",
                  gap: 6,
                }}
              >
                {photos.map((p, idx) => (
                  <img
                    key={p.id || idx}
                    src={p.photo_url}
                    alt=""
                    onClick={() => setGalleryIdx(idx)}
                    style={{
                      width: 44,
                      height: 44,
                      objectFit: "cover",
                      borderRadius: 6,
                      border: idx === galleryIdx ? "2px solid #2DD4BF" : "2px solid transparent",
                      cursor: "pointer",
                      opacity: idx === galleryIdx ? 1 : 0.7,
                    }}
                  />
                ))}
              </div>

              <span
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 12,
                  background: "rgba(0, 0, 0, 0.65)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 6,
                }}
              >
                {galleryIdx + 1} / {photos.length}
              </span>
            </>
          )}
        </div>

        {/* HEAD */}
        <div style={{ padding: "20px 24px 14px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--teal-950)", marginBottom: 6 }}>
            {kost.name}
          </h2>
          <div style={{ fontSize: 13, color: "var(--mut)", display: "flex", alignItems: "center", gap: 5, marginBottom: 12 }}>
            <svg className="ic" style={{ width: 14, height: 14 }}>
              <use href="#i-pin" />
            </svg>
            <span>{kost.address} &middot; {kost.district}, {kost.region}</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span style={{ background: typeInfo.bg, color: "#fff", fontSize: 11.5, fontWeight: 800, padding: "4px 10px", borderRadius: 6 }}>
              {typeInfo.label}
            </span>
            {distStr && (
              <span style={{ background: "var(--emerald-soft2)", color: "var(--emerald-dark)", fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <svg className="ic" style={{ width: 12, height: 12 }}>
                  <use href="#i-pin" />
                </svg>
                {distStr} dari {dest.short}
              </span>
            )}
            <span style={{ background: kost.available_rooms > 0 ? "#DCFCE7" : "#FEE2E2", color: kost.available_rooms > 0 ? "#166534" : "#DC2626", fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 6 }}>
              {kost.available_rooms > 0 ? `Sisa ${kost.available_rooms} kamar` : "Kamar Penuh"}
            </span>
          </div>
        </div>

        {/* TABS */}
        <div
          className="dm-tabs"
          style={{
            display: "flex",
            gap: 16,
            padding: "0 24px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <button
            type="button"
            onClick={() => setTab("info")}
            style={{
              padding: "10px 0",
              border: "none",
              background: "none",
              fontSize: 13.5,
              fontWeight: 800,
              cursor: "pointer",
              color: tab === "info" ? "var(--emerald-dark)" : "var(--mut)",
              borderBottom: tab === "info" ? "2.5px solid var(--emerald)" : "2.5px solid transparent",
            }}
          >
            Informasi
          </button>
          <button
            type="button"
            onClick={() => setTab("fac")}
            style={{
              padding: "10px 0",
              border: "none",
              background: "none",
              fontSize: 13.5,
              fontWeight: 800,
              cursor: "pointer",
              color: tab === "fac" ? "var(--emerald-dark)" : "var(--mut)",
              borderBottom: tab === "fac" ? "2.5px solid var(--emerald)" : "2.5px solid transparent",
            }}
          >
            Fasilitas ({activeFacs.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("rev")}
            style={{
              padding: "10px 0",
              border: "none",
              background: "none",
              fontSize: 13.5,
              fontWeight: 800,
              cursor: "pointer",
              color: tab === "rev" ? "var(--emerald-dark)" : "var(--mut)",
              borderBottom: tab === "rev" ? "2.5px solid var(--emerald)" : "2.5px solid transparent",
            }}
          >
            Ulasan ({kostReviews.length || kost.reviews_count || 12})
          </button>
        </div>

        {/* TAB BODIES */}
        <div style={{ padding: "18px 24px", flexGrow: 1 }}>
          {tab === "info" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--teal-950)" }}>
                    {priceStr} <small style={{ fontSize: 13, color: "var(--mut)", fontWeight: 500 }}>/ bulan</small>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12, color: "var(--mut)" }}>
                  Periode diterima: <b style={{ color: "var(--teal-950)", display: "block" }}>{kost.payment_periods ? kost.payment_periods.join(" &middot; ") : "Bulanan"}</b>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <h5 style={{ fontSize: 13, fontWeight: 800, color: "var(--teal-950)", marginBottom: 6 }}>
                  Deskripsi Kost
                </h5>
                <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.65 }}>
                  {kost.description}
                </p>
              </div>

              <div style={{ background: "#F8FAFC", borderRadius: 14, padding: 14, border: "1px solid var(--line)" }}>
                <h5 style={{ fontSize: 12.5, fontWeight: 800, color: "var(--teal-950)", marginBottom: 10 }}>
                  Spesifikasi & Keamanan
                </h5>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12.5 }}>
                  <div>⚡ Listrik: <b>{facs.electricity_type || "Termasuk Listrik"}</b></div>
                  <div>🚪 Sisa Kamar: <b>{kost.available_rooms} unit</b></div>
                  <div>🔑 Akses: <b>{facs.is_24_hours ? "Bebas 24 Jam" : "Jam Malam Tertib"}</b></div>
                  <div>📍 Titik GPS: <b className="mono">{kost.lat.toFixed(4)}, {kost.lng.toFixed(4)}</b></div>
                </div>
              </div>
            </div>
          )}

          {tab === "fac" && (
            <div>
              <h5 style={{ fontSize: 13, fontWeight: 800, color: "var(--teal-950)", marginBottom: 12 }}>
                Fasilitas Lengkap
              </h5>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                {activeFacs.map((fk) => (
                  <div
                    key={fk}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "var(--ink2)",
                      background: "#F8FAFC",
                      padding: "8px 12px",
                      borderRadius: 9,
                      border: "1px solid var(--line)",
                    }}
                  >
                    <svg className="ic" style={{ width: 16, height: 16, color: "#0D9488" }}>
                      <use href={`#${FIC[fk][0]}`} />
                    </svg>
                    <span>{FIC[fk][1]}</span>
                  </div>
                ))}
              </div>

              {facs.extra_tags && facs.extra_tags.length > 0 && (
                <div>
                  <h6 style={{ fontSize: 12, fontWeight: 800, color: "var(--mut)", marginBottom: 8, textTransform: "uppercase" }}>
                    Keunggulan Tambahan
                  </h6>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {facs.extra_tags.map((tag) => (
                      <span key={tag} className="chip on" style={{ cursor: "default" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "rev" && (
            <div>
              <h5 style={{ fontSize: 13, fontWeight: 800, color: "var(--teal-950)", marginBottom: 12 }}>
                Ulasan Penghuni Asli
              </h5>
              {kostReviews.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {kostReviews.map((r) => (
                    <div key={r.id} style={{ background: "#F8FAFC", borderRadius: 12, padding: 12, border: "1px solid var(--line)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <b>{r.reviewer_name} <small style={{ color: "var(--mut)", fontWeight: 500 }}>({r.reviewer_status})</small></b>
                        <span style={{ color: "#F59E0B", fontWeight: 800 }}>★ {r.rating}</span>
                      </div>
                      <p style={{ fontSize: 12.5, color: "var(--ink2)", margin: 0 }}>{r.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--mut)" }}>
                  <svg className="ic" style={{ width: 36, height: 36, color: "var(--faint)", marginBottom: 8 }}>
                    <use href="#i-quote" />
                  </svg>
                  <p style={{ fontSize: 13 }}>Kost ini baru terverifikasi di Havena Kost. Jadilah yang pertama memberikan ulasan setelah survei!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div
          style={{
            padding: "14px 24px 20px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              minWidth: 180,
              background: "#10B981",
              color: "#fff",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 13,
              padding: "10px 16px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 2px 8px rgba(16,185,129,0.35)",
            }}
          >
            <svg className="ic" style={{ width: 16, height: 16 }}>
              <use href="#i-wa" />
            </svg>
            <span>Chat WhatsApp Pemilik</span>
          </a>

          <button
            type="button"
            onClick={handleCopyWa}
            style={{
              background: "#F1F5F9",
              border: "1px solid var(--line)",
              color: "var(--ink2)",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 12.5,
              padding: "10px 14px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg className="ic" style={{ width: 14, height: 14 }}>
              <use href={copied ? "#i-check" : "#i-copy"} />
            </svg>
            <span>{copied ? "Tersalin!" : "Salin No. WA"}</span>
          </button>

          <a
            href={gmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              color: "var(--ink2)",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 12.5,
              padding: "10px 14px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg className="ic" style={{ width: 14, height: 14, color: "#0D9488" }}>
              <use href="#i-map" />
            </svg>
            <span>Petunjuk Arah</span>
          </a>
        </div>
      </div>
    </div>
  );
}
