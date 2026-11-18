import React from "react";
import Link from "next/link";

export function CtaSection() {
  return (
    <section className="sec container" style={{ paddingTop: 30, paddingBottom: 60 }}>
      <div
        className="cta"
        style={{
          background: "linear-gradient(135deg, var(--teal-900), var(--teal-950))",
          borderRadius: 28,
          padding: "50px 40px",
          textAlign: "center",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.2)",
        }}
      >
        <div style={{ position: "relative", zIndex: 2, maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12, color: "#fff" }}>
            Punya Kost di Malang Raya?
          </h2>
          <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.6, marginBottom: 24 }}>
            Promosikan kostmu langsung ke calon mahasiswa dan pekerja. Bebas biaya pendaftaran awal, kelola kamar dan ulasan dengan mudah dari dashboard.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/owner"
              className="btn btn-emerald"
              style={{
                borderRadius: 999,
                padding: "12px 28px",
                fontSize: 14,
                fontWeight: 800,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>Daftarkan Kost Sekarang</span>
              <svg className="ic" style={{ width: 14, height: 14 }}>
                <use href="#i-arr" />
              </svg>
            </Link>
            <Link
              href="/login"
              style={{
                borderRadius: 999,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 700,
                color: "#E2E8F0",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                textDecoration: "none",
              }}
            >
              Masuk Akun
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
