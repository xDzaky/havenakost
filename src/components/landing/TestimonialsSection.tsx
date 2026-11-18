"use client";

import React from "react";

export function TestimonialsSection() {
  const reviews = [
    {
      name: "Siti Rahmawati",
      status: "Penghuni Saat Ini",
      kost: "Kost Putri Muslimah Mandiri",
      comment:
        "Sangat nyaman dan tenang! Dekat banget ke kampus UM jalan kaki cuma 7 menit. Pemilik kost ramah dan tanggap kalau ada fasilitas yang perlu diperbaiki.",
      stars: 5,
    },
    {
      name: "Dimas Anggara",
      status: "Penghuni Saat Ini",
      kost: "Kost Griya Cendekia Syariah",
      comment:
        "Internet WiFi cepat banget tembus 50Mbps, pas buat kuliah online dan nugas larut malam. Air lancar, kamar mandi dalam bersih.",
      stars: 5,
    },
    {
      name: "Fajar Hidayat",
      status: "Alumni Penghuni",
      kost: "Kost Sigura-gura Nada",
      comment:
        "Lokasi strategis di Sigura-gura, banyak tempat makan murah, fotokopi, dan laundry. Parkir motor luas dan aman ada CCTV 24 jam.",
      stars: 5,
    },
    {
      name: "Nadia Safitri",
      status: "Penghuni Saat Ini",
      kost: "Kost Putri Sumbersari Indah",
      comment:
        "Suasana kamar bersih dan terawat. Ibu kost baik sekali, sering bagi-bagi makanan saat hari libur. Sangat merekomendasikan untuk mahasiswa UB/UM.",
      stars: 5,
    },
    {
      name: "Rizky Ramadhani",
      status: "Pernah Survei",
      kost: "Kost Putra Tlogomas Asri",
      comment:
        "Waktu survei tempatnya sesuai banget sama foto di Havena Kost. Chat WA pemilik langsung dibalas dalam hitungan menit.",
      stars: 4,
    },
    {
      name: "Kevin Prasetyo",
      status: "Penghuni Saat Ini",
      kost: "Kost Suhat Residence",
      comment:
        "Fasilitas AC dan water heater berfungsi sangat baik. Akses 24 jam bebas tanpa jam malam kaku, cocok buat mahasiswa yang aktif organisasi.",
      stars: 5,
    },
  ];

  return (
    <section className="sec container" id="testiSec" style={{ paddingTop: 60, paddingBottom: 60 }}>
      <div className="sec-head" style={{ textAlign: "center", marginBottom: 36 }}>
        <span className="sec-eyebrow">
          Kata Mereka
          <svg viewBox="0 0 120 8" preserveAspectRatio="none">
            <path d="M2 6 C 34 1, 82 1, 118 4" />
          </svg>
        </span>
        <h2 className="sec-title">
          Cerita Penghuni <span className="hl">Havena Kost</span>
        </h2>
        <p className="sec-desc">
          Ulasan asli dari penghuni dan penyurvei kost di seluruh Malang Raya.
        </p>
      </div>

      {/* INFINITE MARQUEE LOOP FOR TESTIMONIALS */}
      <div className="testi-wrap">
        <div className="testi-track">
          {[...reviews, ...reviews].map((r, i) => (
            <div key={`testi-${i}`} className="tcard">
              <svg className="ic quote-ico">
                <use href="#i-quote" />
              </svg>
              <p>&ldquo;{r.comment}&rdquo;</p>
              <div className="stars">
                {Array.from({ length: 5 }).map((_, s) => (
                  <svg
                    key={s}
                    className={`ic ${s < r.stars ? "" : "off"}`}
                    style={{
                      fill: s < r.stars ? "#FBBF24" : "none",
                      color: s < r.stars ? "#FBBF24" : "var(--line2)",
                    }}
                  >
                    <use href="#i-star" />
                  </svg>
                ))}
              </div>
              <div className="tfoot">
                <div
                  className="avatar"
                  style={{
                    background:
                      i % 4 === 0
                        ? "var(--emerald-dark)"
                        : i % 4 === 1
                        ? "var(--sky)"
                        : i % 4 === 2
                        ? "var(--gold-dark)"
                        : "#7C3AED",
                  }}
                >
                  {r.name.charAt(0)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <b>{r.name}</b>
                  <small>
                    {r.status} &middot; {r.kost}
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
