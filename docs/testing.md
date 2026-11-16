# Testing

Backend diuji dengan Vitest. Test integration memanggil Route Handler secara
langsung dan memakai database Neon terpisah (`TEST_DATABASE_URL`), bukan
database development/produksi.

## Menjalankan

```bash
npm run test:db:migrate
npm test
```

Global setup otomatis menjalankan migration ke `TEST_DATABASE_URL`. Jika
variabel itu tidak ada, test gagal sebelum menyentuh database.

## Cakupan test

### Integration (`tests/api.test.ts`)

| Area | Yang diuji |
| --- | --- |
| Health | Database connected + versi PostGIS |
| Session | Login, get-session, logout |
| Registrasi | Role tidak bisa dieskalasi menjadi admin |
| Profil | `role` ditolak saat PATCH profil |
| Owner approval | Admin approve owner; owner pending tidak bisa submit listing |
| Listing | Draft tidak tampil publik; owner lain mendapat 404; admin approve → publik |
| PostGIS | Nearby search menghasilkan `distanceMeters` dan hanya listing published |
| Fasilitas | Owner mengganti fasilitas, filter fasilitas di pencarian publik |
| Foto | Presign hanya untuk listing milik owner (owner lain 404) |
| Kamar + QR | Kamar fisik, generate QR, token, URL review |
| Review publik | Submit tanpa login, pending, tidak membocorkan status pencocokan |
| Review privacy | Nama lengkap penghuni tidak muncul di response publik |
| Turnstile | Siteverify gagal → 422 |
| Verifikasi owner | Review pending diverifikasi dengan occupancy → published |
| Duplikasi | Occupancy terverifikasi tidak bisa dipakai review kedua (409) |
| QR lifecycle | QR nonaktif menolak review; regenerate menghasilkan token baru |
| Suspensi | Owner suspended tetap bisa baca profil/alasan, endpoint lain 403 |
| Review invalid | Rating di luar 1–5 ditolak 422 |
| Moderasi admin | Hide → hilang dari publik, publish kembali, audit log tercatat |
| Keuangan | Isolasi owner, rekap income/expense/monthly |
| Langganan | Admin buat paket, owner bayar, admin approve, langganan aktif |
| Admin | Dashboard totals/growth, audit log |
| Otorisasi | Owner tidak bisa akses `/api/admin/*` (403) |

### Unit (`tests/unit.test.ts`)

- Normalisasi nama konservatif.
- Slug.
- Validasi harga terbalik.
- Pasangan latitude/longitude wajib lengkap.
- Rating 1–5.
- Haversine.

## Hasil terakhir

```text
Test Files  2 passed (2)
Tests       27 passed (27)
```

Perintah verifikasi lain:

```bash
npx tsc --noEmit     # tanpa error
npm run build        # sukses
```

## Test manual yang sudah dilakukan

- `GET /api/health` pada dev server → PostGIS 3.5.7.
- Presigned PUT ke R2 → HEAD object → GET object → DELETE object berhasil.
- `GET /api/public/facilities` mengembalikan 13 fasilitas seed.
- QR token tidak dikenal → 404 dengan envelope error standar.
- Bootstrap admin di database test → user dibuat dengan role `admin`.

## Yang tidak diuji otomatis

- Upload foto sungguhan ke R2 (butuh network + bucket; diuji manual).
- Turnstile dengan token Cloudflare asli (test memakai `test-bypass` atau mock).
- Pembayaran gateway (memang tidak dipakai).
- Frontend/dashboard (belum dibuat).
