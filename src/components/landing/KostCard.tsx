import React from "react";
import type { KostListing } from "@/types/kost";

interface KostCardProps {
  kost: KostListing;
  destShort?: string;
  onOpenDetail: (id: string) => void;
}

const TYPE_CONFIG = {
  putra: { label: "Putra", bg: "#0369A1" },
  putri: { label: "Putri", bg: "#DB2777" },
  campur: { label: "Campur", bg: "#0D9488" },
  pasutri: { label: "Pasutri", bg: "#7C3AED" },
};

const FIC: Record<string, [string, string]> = {
  has_ac: ["i-spark", "AC"],
  has_private_bath: ["i-bath", "KM Dalam"],
  has_wifi: ["i-wifi", "WiFi"],
  is_24_hours: ["i-clock", "24 Jam"],
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

export function KostCard({ kost, destShort = "UM", onOpenDetail }: KostCardProps) {
  const cov = kost.photos && kost.photos.length > 0
    ? kost.photos.find((p) => p.is_cover)?.photo_url || kost.photos[0].photo_url
    : "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=720&q=80";

  const typeInfo = TYPE_CONFIG[kost.kost_type] || TYPE_CONFIG.campur;
  const distStr =
    kost._d != null
      ? kost._d < 1000
        ? `${Math.round(kost._d / 10) * 10} m`
        : `${(kost._d / 1000).toFixed(1).replace(".", ",")} km`
      : "";

  const priceStr = "Rp " + Number(kost.price_monthly || 0).toLocaleString("id-ID");

  const facs = kost.facilities || {};
  const activeKeys = Object.keys(FIC).filter((k) => facs[k as keyof typeof facs]);
  const displayKeys = activeKeys.slice(0, 3);
  const moreCount = Math.max(0, activeKeys.length - 3);

  const waUrl =
    "https://wa.me/" +
    (kost.whatsapp_number || "6281234567890") +
    "?text=" +
    encodeURIComponent(
      `Halo, saya tertarik dengan ${kost.name} di Havena Kost. Apakah masih ada kamar kosong?`
    );

  return (
    <article
      className={`kcard ${kost.is_featured ? "feat" : ""}`}
      onClick={() => onOpenDetail(kost.id)}
      style={{
        background: "#fff",
        borderRadius: 18,
        border: "1px solid var(--line)",
        overflow: "hidden",
        boxShadow: "var(--sh-sm)",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* MEDIA COVER */}
      <div
        className="kc-media"
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "62%",
          overflow: "hidden",
          background: "#F1F5F9",
        }}
      >
        <img
          src={cov}
          alt={kost.name}
          loading="lazy"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.4s ease",
          }}
        />

        {/* TOP BADGES */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            right: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          {/* KOST TYPE BADGE */}
          <span
            style={{
              background: typeInfo.bg,
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              padding: "4px 9px",
              borderRadius: 6,
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            {typeInfo.label}
          </span>

          {/* DISTANCE PILL */}
          {distStr && (
            <span
              style={{
                background: "rgba(15, 23, 42, 0.72)",
                backdropFilter: "blur(6px)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 9px",
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <svg className="ic" style={{ width: 12, height: 12, color: "#2DD4BF" }}>
                <use href="#i-pin" />
              </svg>
              {distStr} dari {destShort}
            </span>
          )}
        </div>

        {/* BOTTOM MEDIA INFO (PHOTO COUNT & RATING - NO BACKGROUND AS REQUESTED) */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 10,
            right: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            textShadow: "0 1px 3px rgba(0,0,0,0.8)",
            color: "#fff",
            pointerEvents: "none",
          }}
        >
          {/* PHOTO COUNT - CLEAN NO BACKGROUND */}
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <svg className="ic" style={{ width: 13, height: 13, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}>
              <use href="#i-camera" />
            </svg>
            {kost.photos ? kost.photos.length : 0} Foto
          </span>

          {/* RATING - CLEAN NO BACKGROUND */}
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: "#FDE047",
            }}
          >
            <svg
              className="ic"
              style={{
                width: 14,
                height: 14,
                fill: "#FBBF24",
                stroke: "none",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))",
              }}
            >
              <use href="#i-star" />
            </svg>
            <span style={{ color: "#fff" }}>
              {(kost.rating || 4.8).toFixed(1)}{" "}
              <small style={{ fontSize: 10.5, opacity: 0.85 }}>
                ({kost.reviews_count || 12})
              </small>
            </span>
          </span>
        </div>
      </div>

      {/* BODY */}
      <div
        className="kc-body"
        style={{
          padding: "14px 14px 16px",
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
        }}
      >
        {/* KOST NAME */}
        <h3
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: "var(--teal-950)",
            lineHeight: 1.35,
            marginBottom: 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
          }}
        >
          {kost.name}
        </h3>

        {/* DISTRICT */}
        <div
          style={{
            fontSize: 11.5,
            color: "var(--mut)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 10,
          }}
        >
          <svg className="ic" style={{ width: 12, height: 12, flexShrink: 0 }}>
            <use href="#i-pin" />
          </svg>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {kost.district}, {kost.region}
          </span>
        </div>

        {/* FACILITIES - MODERN CLEAN CHIPS */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            marginBottom: 12,
            minHeight: 24,
          }}
        >
          {displayKeys.map((fk) => (
            <span
              key={fk}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "#F1F5F9",
                color: "#475569",
                border: "1px solid #E2E8F0",
                borderRadius: 6,
                padding: "3px 7px",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <svg className="ic" style={{ width: 11, height: 11, color: "#0D9488" }}>
                <use href={`#${FIC[fk][0]}`} />
              </svg>
              {FIC[fk][1]}
            </span>
          ))}
          {moreCount > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "#F8FAFC",
                color: "#64748B",
                border: "1px solid #E2E8F0",
                borderRadius: 6,
                padding: "3px 6px",
                fontSize: 10.5,
                fontWeight: 700,
              }}
            >
              +{moreCount}
            </span>
          )}
        </div>

        {/* PRICE & ROOM AVAILABILITY */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingTop: 10,
            borderTop: "1px dashed var(--line)",
            marginTop: "auto",
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--teal-950)" }}>
              {priceStr}
              <small style={{ fontSize: 11, fontWeight: 500, color: "var(--mut)", marginLeft: 2 }}>
                /bln
              </small>
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 6,
              padding: "2px 8px",
              background: kost.available_rooms > 0 ? "var(--emerald-soft2)" : "#FEE2E2",
              color: kost.available_rooms > 0 ? "var(--emerald-dark)" : "#DC2626",
            }}
          >
            {kost.available_rooms > 0 ? `Sisa ${kost.available_rooms} kamar` : "Kamar Penuh"}
          </span>
        </div>

        {/* POLISHED ACTION BUTTONS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {/* LIHAT DETAIL - MODERN OUTLINE TEAL */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(kost.id);
            }}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1.5px solid #0D9488",
              background: "#F0FDFA",
              color: "#0D9488",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              transition: "all 0.2s ease",
            }}
          >
            <svg className="ic" style={{ width: 13, height: 13 }}>
              <use href="#i-eye" />
            </svg>
            <span>Detail</span>
          </button>

          {/* WHATSAPP - MODERN VIBRANT GREEN */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              background: "#10B981",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              boxShadow: "0 2px 6px rgba(16, 185, 129, 0.28)",
              transition: "all 0.2s ease",
            }}
          >
            <svg className="ic" style={{ width: 13, height: 13 }}>
              <use href="#i-wa" />
            </svg>
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </article>
  );
}
