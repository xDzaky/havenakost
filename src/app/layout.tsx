import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Havena Kost — Cari Kost Terdekat di Malang Raya Tanpa Ribet Login",
  description:
    "Direktori kost berbasis lokasi di Kota Malang, Kabupaten Malang, dan Kota Batu. Cari kost terdekat dari kampus, hubungi pemilik langsung via WhatsApp tanpa perlu akun.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%230F4C5C'/%3E%3Cpath d='M6 11 12 6l6 5v8h-4v-4h-4v4H6z' fill='%232DD4BF'/%3E%3C/svg%3E",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
          crossOrigin=""
          defer
        ></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
