# Havena Kost

Platform direktori dan pencarian kost wilayah Malang Raya. Repository ini kini
memuat **backend API** (Next.js App Router + TypeScript) dan dataset kost hasil
scrape Google Maps untuk kebutuhan eksplorasi data.

## Status deployment

| Item | Nilai |
|---|---|
| Produksi | <https://havenakost.vercel.app> |
| Health check | <https://havenakost.vercel.app/api/health> |
| Repository | <https://github.com/xDzaky/havenakost> |
| Database | Neon PostgreSQL + PostGIS (3 migrasi applied) |
| Storage / anti-bot | Cloudflare R2 (bucket privat) + Turnstile |
| Test suite | 27 test Vitest lulus; smoke test 12 cek; e2e demo 21 langkah |

Panduan setup, deploy, dan testing lengkap: **[docs/panduan-lengkap.md](docs/panduan-lengkap.md)**.

## Backend API

Stack: **Next.js 16 App Router, TypeScript strict, Neon PostgreSQL + PostGIS,
Drizzle ORM, Better Auth, Cloudflare R2, Cloudflare Turnstile, Zod, qrcode**.

Fitur utama:

- Registrasi/login owner dan admin (Better Auth, role-based).
- Approval owner dan listing oleh admin.
- CRUD listing, fasilitas, foto R2, kamar fisik, dan data penghuni privat.
- Pencarian publik dengan filter harga/fasilitas/gender + radius PostGIS.
- QR Code unik per kamar dan review publik tanpa login.
- Pencocokan review dengan data penghuni + verifikasi owner + moderasi admin.
- Notifikasi in-app, laporan keuangan owner, langganan manual, audit log admin.

### Menjalankan

```bash
cp .env.example .env        # isi DATABASE_URL, secret, R2, Turnstile
npm install
npm run db:migrate          # apply migration ke DATABASE_URL
npm run db:seed             # seed katalog fasilitas
npm run dev                 # http://localhost:3000
```

Bootstrap admin (sekali, jangan lewat registrasi publik):

```bash
ADMIN_BOOTSTRAP_EMAIL=admin@example.com \
ADMIN_BOOTSTRAP_PASSWORD='password-panjang-aman' \
npm run admin:create
```

### Testing dan build

```bash
npm run typecheck
npm run test:db:migrate     # siapkan database test terpisah
npm test
npm run build
```

Smoke test cepat ke API yang sedang berjalan (read-only):

```bash
./scripts/smoke-test.sh https://havenakost.vercel.app

ADMIN_EMAIL=admin@havenakost.app ADMIN_PASSWORD='...' \
  ./scripts/smoke-test.sh https://havenakost.vercel.app
```

E2E demo lengkap (owner → approval → listing → kamar → QR → publik) yang
**menulis data**:

```bash
ADMIN_EMAIL=admin@havenakost.app ADMIN_PASSWORD='...' \
  ./scripts/e2e-demo.sh https://havenakost.vercel.app
```

Test integration memakai `TEST_DATABASE_URL` dan **tidak** menyentuh database
development/produksi. Token Turnstile `test-bypass` hanya aktif saat
`NODE_ENV=test`.

### Dokumentasi backend

- [**Panduan lengkap (setup, deploy, testing)**](docs/panduan-lengkap.md)
- [Arsitektur backend](docs/backend-architecture.md)
- [Skema database](docs/database-schema.md)
- [Daftar endpoint API](docs/api-endpoints.md)
- [Autentikasi & otorisasi](docs/authentication.md)
- [Alur verifikasi review](docs/review-verification-flow.md)
- [Storage R2](docs/storage-r2.md)
- [Deployment](docs/deployment.md)
- [Testing](docs/testing.md)
- [OpenAPI](docs/openapi.yaml)

> Credential hanya boleh berada di `.env` (sudah di-`.gitignore`). Jangan
> menaruh `DATABASE_URL`, `BETTER_AUTH_SECRET`, `R2_SECRET_ACCESS_KEY`, atau
> `TURNSTILE_SECRET_KEY` di source code maupun response API.

## Dataset Kost Malang — hasil scrape Google Maps

Jawaban singkat: **bisa**. [`gosom/google-maps-scraper`](https://github.com/gosom/google-maps-scraper)
memang dibuat untuk mengambil listing Google Maps (nama, alamat, telepon,
rating, website, koordinat, link) berdasarkan kata kunci + area. Di project ini
datanya sudah diambil dan disimpan supaya kamu bisa cek satu per satu di Google
Maps.

Hasil saat ini: **3.485 listing unik** di Kota Malang & sekitarnya
(**3.356** terdeteksi sebagai kost/kos, **3.382** di wilayah Kota Malang),
semua punya koordinat dan link Google Maps.

## Buka datanya

| File | Isi |
|---|---|
| `viewer.html` | **Buka ini dulu.** Tabel + pencarian + filter, tiap baris ada tombol “Google Maps ↗”. Bisa dibuka langsung di browser (double-click). |
| `data/kost-malang.csv` | Data bersih: nama, kategori, alamat, telepon, website, rating, jumlah ulasan, harga, lat/lng, link Google Maps. |
| `data/kost-malang.md` | Versi tabel Markdown (enak dibaca/di-copy). |
| `data/kost-malang.geojson` | Untuk peta/PostGIS/QGIS. |
| `data/kost-malang.kml` | Import ke **Google My Maps** → semua pin muncul di peta. |
| `data/kost-malang-raw.csv` / `.json` | Output mentah (kolom lengkap ala scraper). |
| `data/queries.txt` | 36 kata kunci yang dipakai. |
| `data/queries-extra.txt` | 41 kata kunci tambahan (kelurahan & variasi). |

### Cek di Google Maps

1. Buka `viewer.html`, klik **Google Maps ↗** pada baris mana pun → langsung
   membuka listing aslinya (`https://www.google.com/maps?cid=...`).
2. Atau import `data/kost-malang.kml` ke <https://www.google.com/mymaps>
   (Create new map → Import) untuk melihat semua pin sekaligus.

## Statistik singkat

- Total listing unik: **3.485** (dedupe berdasarkan `data_id` Google)
- Terdeteksi kost/kos: **3.356**; sisanya ditandai `cek` (hostel/penginapan dsb.)
- Punya nomor telepon: **2.412** · punya website: **421** · punya rating: **2.845**
- Rating rata-rata: **4,64**
- Sebaran kecamatan: Lowokwaru 1.313 · Sukun 448 · Klojen 345 · Blimbing 289 ·
  Kedungkandang 281 · sisanya Dau/Karang Ploso/Pakis/Singosari dll.

## Cara scrape ulang

### Opsi A — pakai repo aslinya (butuh Chromium/Playwright)

```bash
# 1. Ambil binary rilis
curl -L -o /tmp/gms \
  https://github.com/gosom/google-maps-scraper/releases/download/v1.18.3/google_maps_scraper-1.18.3-linux-amd64
chmod +x /tmp/gms

# 2. Pasang browser Playwright (sekali saja, ~170 MB dari CDN Playwright)
PLAYWRIGHT_INSTALL_ONLY=1 /tmp/gms

# 3. Scrape
./scripts/run-scrape.sh          # set GMS_BIN=/tmp/gms kalau beda path
```

Opsi `-grid-bbox` di repo bisa dipakai kalau ingin lebih dari ±120 hasil per
kata kunci:

```bash
/tmp/gms -input data/queries.txt -results data/raw.csv \
  -geo "-7.9666,112.6326" -zoom 15 -depth 10 -c 2 \
  -grid-bbox "-8.03,112.55,-7.88,112.71" -grid-cell 1.0
```

### Opsi B — tanpa browser (yang dipakai untuk data ini)

```bash
python3 scripts/scrape_maps.py                 # 36 query utama
python3 scripts/scrape_maps.py --queries data/queries-extra.txt --append
python3 scripts/build_report.py data/kost-malang-raw.csv
```

Script ini memakai **endpoint dan aturan parsing yang sama** dengan repo
(`gmaps/searchjob.go` + `gmaps/multiple.go`), jadi hasilnya setara, tetapi tidak
perlu mengunduh Chromium. Kenapa dipakai: unduhan browser Playwright di jaringan
ini sangat lambat (±30 KB/s), sedangkan endpoint-nya bisa diakses langsung.

## Keterbatasan yang perlu diketahui

- Google Maps membatasi ±120 hasil per kata kunci; karena itu dipakai banyak
  kata kunci per kecamatan/kelurahan. Tetap mungkin ada kost yang belum terdaftar
  di Google Maps atau tidak muncul.
- Kolom `relevan_kost = cek` berarti nama/kategori/alamatnya tidak mengandung
  kata kost/kos — biasanya hostel, hotel, atau guest house di sekitar kampus.
- Data diambil 15 November 2026; harga/tarif tidak tersedia di listing Google
  Maps (kolom `harga` umumnya kosong).
- Scraping Google Maps membebani layanan mereka. Gunakan wajar, jangan
  dijalankan berulang terus-menerus, dan patuhi ToS Google.

## Struktur project

```
havenakost/
├── viewer.html                 # tabel interaktif + link Google Maps
├── data/
│   ├── queries.txt
│   ├── queries-extra.txt
│   ├── kost-malang.csv
│   ├── kost-malang.md
│   ├── kost-malang.geojson
│   ├── kost-malang.kml
│   ├── kost-malang-raw.csv
│   └── kost-malang-raw.json
├── scripts/
│   ├── smoke-test.sh           # smoke test read-only ke API berjalan
│   ├── e2e-demo.sh             # E2E owner → listing → approve → publik
│   ├── scrape_maps.py          # scraper (endpoint sama dengan repo gosom)
│   ├── build_report.py         # bersihkan + buat CSV/GeoJSON/KML/MD/viewer
│   └── run-scrape.sh           # jalankan binary repo gosom
└── docs/
    └── teknis.md               # detail teknis & pemetaan field
```
