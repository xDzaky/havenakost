import React from "react";

export function StepsSection() {
  return (
    <section className="sec container" id="stepsSec" style={{ paddingTop: 60, paddingBottom: 40 }}>
      <div className="sec-head" style={{ textAlign: "center", marginBottom: 36 }}>
        <span className="sec-eyebrow">
          Cara Kerja
          <svg viewBox="0 0 120 8" preserveAspectRatio="none">
            <path d="M2 6 C 34 1, 82 1, 118 4" />
          </svg>
        </span>
        <h2 className="sec-title">
          3 Langkah Menuju <span className="hl">Kost Idaman</span>
        </h2>
        <p className="sec-desc">
          Nggak perlu bikin akun atau isi formulir panjang. Tentukan tujuan, saring yang
          cocok, lalu chat pemiliknya langsung.
        </p>
      </div>

      <div className="steps">
        <div className="step-card">
          <div className="step-ico">
            <svg className="ic">
              <use href="#i-pin" />
            </svg>
            <span className="step-num">1</span>
          </div>
          <h4>Tentukan Titik Tujuanmu</h4>
          <p>
            Klik kampus atau area yang jadi tujuan — UM, UB, UMM, Polinema, UIN, ITN,
            Dau, sampai Kota Batu. Jarak tiap kost langsung dihitung dari titik itu.
          </p>
        </div>

        <div className="step-card">
          <div className="step-ico">
            <svg className="ic">
              <use href="#i-filter" />
            </svg>
            <span className="step-num">2</span>
          </div>
          <h4>Saring yang Paling Cocok</h4>
          <p>
            Pilih tipe penghuni, budget bulanan, periode sewa, dan fasilitas yang kamu
            butuh. Semua kost juga kelihatan di peta biar gampang dibayangkan.
          </p>
        </div>

        <div className="step-card">
          <div className="step-ico">
            <svg className="ic">
              <use href="#i-wa" />
            </svg>
            <span className="step-num">3</span>
          </div>
          <h4>Chat Pemilik via WhatsApp</h4>
          <p>
            Sekali klik, WhatsApp kebuka dengan pesan yang sudah disiapkan. Tanya
            harga, jadwal survei, atau sisa kamar langsung ke pemiliknya.
          </p>
        </div>
      </div>
    </section>
  );
}
