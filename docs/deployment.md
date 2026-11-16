# Deployment

Target: Vercel + Neon + Cloudflare R2 + Cloudflare Turnstile.

## 1. Neon

1. Buat project Neon (PostgreSQL 17) di region terdekat.
2. Salin connection string **pooled** ke `DATABASE_URL`.
3. PostGIS diaktifkan oleh migration (`CREATE EXTENSION IF NOT EXISTS postgis`).
4. Jalankan migration:

```bash
npm run db:migrate
```

5. Seed katalog fasilitas:

```bash
npm run db:seed
```

Jangan memakai database produksi untuk test. Buat database/branch terpisah dan
set `TEST_DATABASE_URL`.

## 2. Environment Vercel

Set semua variabel dari `.env.example`:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `APP_BASE_URL`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_PUBLIC_URL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
- `REVIEW_RATE_LIMIT_HMAC_SECRET`

`BETTER_AUTH_URL` dan `APP_BASE_URL` harus URL HTTPS produksi. Jangan pernah
menaruh secret di `NEXT_PUBLIC_*`.

## 3. Build dan deploy

```bash
npm run typecheck
npm test
npm run build
```

Hubungkan repository ke Vercel. Build command `npm run build`. Jalankan
`npm run db:migrate` secara terkontrol (CI/manual) sebelum deploy yang
mengubah schema; jangan menjalankan migration destruktif otomatis.

## 4. Bootstrap admin produksi

Sekali saja, dengan environment produksi:

```bash
ADMIN_BOOTSTRAP_EMAIL=... ADMIN_BOOTSTRAP_PASSWORD='...' npm run admin:create
```

Jangan membuat endpoint publik untuk registrasi admin.

## 5. Turnstile

- Site key dipakai frontend untuk widget.
- Secret key hanya di server, divalidasi ke endpoint Siteverify.
- Daftarkan domain produksi di dashboard Turnstile.
- Token sekali pakai; backend menolak token invalid/expired/reused.

## 6. R2

- Buat bucket privat.
- Buat API token S3 dengan izin object read/write pada bucket tersebut.
- Set CORS bucket agar frontend boleh `PUT` dari domain produksi:
  - AllowedOrigins: domain aplikasi.
  - AllowedMethods: `PUT`, `GET`, `HEAD`.
  - AllowedHeaders: `Content-Type`, `Content-Length`.
- Bila memakai domain publik, set `R2_PUBLIC_URL`.

## 7. Health check

`GET /api/health` mengembalikan status database dan versi PostGIS. Gunakan
untuk smoke test setelah deploy.

## 8. Setelah deploy

1. Login owner → lengkapi profil.
2. Admin approve owner.
3. Owner buat listing + kamar + QR.
4. Owner ajukan listing pending.
5. Admin approve listing.
6. Uji review publik via QR.
7. Owner verifikasi review.
8. Cek notifikasi dan audit log.

## Catatan Vercel

- Route Handler berjalan sebagai serverless function; koneksi `postgres.js`
  memakai `max: 10` dan `prepare: false` agar aman dengan pooler Neon.
- Jangan mengandalkan in-memory state (rate limit review memakai database).
- Jika memakai region Vercel, dekatkan dengan region Neon untuk mengurangi
  latency.
