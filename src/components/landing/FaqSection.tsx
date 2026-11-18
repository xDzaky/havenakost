"use client";

import React, { useState } from "react";

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "Apakah saya perlu membuat akun untuk mencari kost?",
      a: "Tidak perlu. Seluruh fitur pencarian — filter spesifikasi, peta interaktif, hitung jarak otomatis, ulasan asli, dan kontak WhatsApp pemilik — 100% gratis dan langsung tersambung tanpa registrasi.",
    },
    {
      q: "Bagaimana jarak \"terdekat\" dihitung?",
      a: "Jarak dihitung dengan rumus Haversine akurat (garis lurus di permukaan bumi) dari koordinat GPS kost ke titik destinasi yang kamu pilih, misalnya gerbang kampus UM, UB, atau landmark di Malang.",
    },
    {
      q: "Berapa radius pemindaian kost terdekat?",
      a: "Secara default kami memindai 3 km terdekat dari kampus atau titik yang kamu pilih. Kamu juga bisa memilih opsi 1 km, 5 km, 10 km, atau Semua Jarak di toolbar hasil.",
    },
    {
      q: "Apakah harga yang tampil sudah final?",
      a: "Harga bulanan yang tertera ditulis langsung oleh pemilik kost. Untuk pembayaran per 3 bulan, 6 bulan, atau tahunan biasanya pemilik memberikan diskon khusus — tanyakan langsung via WhatsApp.",
    },
    {
      q: "Bagaimana jika kamar kost sudah penuh?",
      a: "Kamu dapat mengaktifkan toggle \"Hanya Kamar Tersedia\" pada sidebar filter untuk menyembunyikan kost yang kamarnya sedang penuh.",
    },
    {
      q: "Saya pemilik kost — bagaimana cara mendaftarkan kost saya?",
      a: "Klik menu di kanan atas dan pilih \"Dashboard Pemilik\", kamu dapat langsung memasukkan data kost, kamar, fasilitas, dan foto untuk dipromosikan di Havena Kost.",
    },
  ];

  return (
    <section className="sec container" id="faqSec" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div className="sec-head" style={{ textAlign: "center", marginBottom: 36 }}>
        <span className="sec-eyebrow">
          Tanya Jawab
          <svg viewBox="0 0 120 8" preserveAspectRatio="none">
            <path d="M2 6 C 34 1, 82 1, 118 4" />
          </svg>
        </span>
        <h2 className="sec-title">
          Pertanyaan yang <span className="hl">Sering Ditanyakan</span>
        </h2>
      </div>

      <div
        className="faq"
        style={{
          maxWidth: 780,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {faqs.map((f, i) => {
          const isOpen = openIdx === i;
          return (
            <div
              key={i}
              className={`faq-item ${isOpen ? "open" : ""}`}
              style={{
                background: "#fff",
                borderRadius: 14,
                border: "1px solid var(--line)",
                overflow: "hidden",
                boxShadow: "var(--sh-sm)",
                transition: "all 0.25s ease",
              }}
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="faq-q"
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--teal-950)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    className="fq-num"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: isOpen ? "var(--emerald)" : "var(--emerald-soft2)",
                      color: isOpen ? "#fff" : "var(--emerald-dark)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>{f.q}</span>
                </div>
                <svg
                  className="ic chev"
                  style={{
                    width: 15,
                    height: 15,
                    color: "var(--mut)",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.25s ease",
                    flexShrink: 0,
                  }}
                >
                  <use href="#i-chevd" />
                </svg>
              </button>

              {isOpen && (
                <div
                  className="faq-a"
                  style={{
                    padding: "0 20px 18px 54px",
                    fontSize: 13,
                    color: "var(--ink2)",
                    lineHeight: 1.65,
                  }}
                >
                  <div className="faq-a-in">{f.a}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
