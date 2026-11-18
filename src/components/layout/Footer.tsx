import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer style={{ background: "#0B1120", color: "#94A3B8", paddingTop: 50, paddingBottom: 30, borderTop: "1px solid #1E293B" }}>
      <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32, marginBottom: 40 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <img src="/image/HavenaKost.svg" alt="Havena Kost" style={{ height: 32 }} />
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
              Havena<span style={{ color: "#2DD4BF" }}>Kost</span>
            </span>
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.65, color: "#94A3B8" }}>
            Platform pencarian kost berbasis lokasi di Malang Raya — Kota Malang, Kabupaten Malang, dan Kota Batu. Terhubung langsung ke WhatsApp pemilik kost tanpa perantara.
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: 13, fontWeight: 800, color: "#fff", textTransform: "uppercase", marginBottom: 14 }}>
            Kampus Populer
          </h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 12.5, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>Kost Dekat Universitas Negeri Malang (UM)</li>
            <li>Kost Dekat Universitas Brawijaya (UB)</li>
            <li>Kost Dekat UMM Kampus III</li>
            <li>Kost Dekat Polinema</li>
            <li>Kost Dekat UIN Maliki Malang</li>
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: 13, fontWeight: 800, color: "#fff", textTransform: "uppercase", marginBottom: 14 }}>
            Portal &amp; Akun
          </h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 12.5, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>
              <Link href="/owner" style={{ color: "#2DD4BF", textDecoration: "none" }}>
                Dashboard Pemilik Kost
              </Link>
            </li>
            <li>
              <Link href="/admin" style={{ color: "#94A3B8", textDecoration: "none" }}>
                Super Admin Portal
              </Link>
            </li>
            <li>
              <Link href="/login" style={{ color: "#94A3B8", textDecoration: "none" }}>
                Masuk Akun (Login)
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="container" style={{ borderTop: "1px solid #1E293B", paddingTop: 20, textAlign: "center", fontSize: 12, color: "#64748B" }}>
        &copy; {new Date().getFullYear()} Havena Kost Malang Raya. Seluruh hak cipta dilindungi.
      </div>
    </footer>
  );
}
