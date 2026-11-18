import React from "react";

export function FeaturesSection() {
  const features = [
    {
      icon: "i-shield",
      title: "100% Pemilik Asli Terverifikasi",
      desc: "Setiap listing dicek tim Super Admin sebelum tayang. Langganan berakhir otomatis ditarik dari pencarian.",
    },
    {
      icon: "i-pin",
      title: "Jarak Kampus Riil",
      desc: "Dihitung dari koordinat asli kost ke kampus tujuan, bukan perkiraan lisan atau iklan semu.",
    },
    {
      icon: "i-wa",
      title: "Chat WhatsApp Langsung",
      desc: "Tanpa agen dan tanpa markup komisi. WhatsApp langsung ke pemilik, pesan tanya sudah disiapkan.",
    },
    {
      icon: "i-star",
      title: "Ulasan Transparan & Bersih",
      desc: "Rating dari penghuni asli, dimoderasi dari spam dan kata kasar demi menjaga keaslian info.",
    },
  ];

  return (
    <section className="sec container" style={{ paddingTop: 40, paddingBottom: 50 }}>
      <div className="feat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {features.map((f, i) => (
          <div key={i} className="feat-card">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--emerald-soft2)",
                color: "var(--emerald-dark)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <svg className="ic" style={{ width: 22, height: 22 }}>
                <use href={`#${f.icon}`} />
              </svg>
            </div>
            <h4 style={{ fontSize: 15, fontWeight: 800, color: "var(--teal-950)", marginBottom: 6 }}>
              {f.title}
            </h4>
            <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6, margin: 0 }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
