# Panduan Lengkap: Setup, Deploy, dan Testing

Dokumen ini adalah panduan end-to-end untuk menjalankan, men-deploy, dan menguji
backend **Havena Kost**. Isinya sudah diverifikasi terhadap deployment produksi
(Vercel + Neon + Cloudflare R2 + Cloudflare Turnstile).

- Produksi: <https://havenakost.vercel.app>
- Health check: <https://havenakost.vercel.app/api/health>
- Repository: <https://github.com/xDzaky/havenakost>

Daftar isi:

1. [Arsitektur singkat](#1-arsitektur-singkat)
2. [Prasyarat](#2-prasyarat)
3. [Environment variables](#3-environment-variables)
4. [Setup lokal](#4-setup-lokal)
5. [Setup layanan eksternal](#5-setup-layanan-eksternal)
6. [Deploy ke Vercel](#6-deploy-ke-vercel)
7. [Testing otomatis](#7-testing-otomatis)
8. [Testing manual end-to-end (API produksi)](#8-testing-manual-end-to-end-api-produksi)
9. [Testing upload foto R2](#9-testing-upload-foto-r2)
10. [Testing review QR + Turnstile](#10-testing-review-qr--turnstile)
11. [Testing langganan (subscription)](#11-testing-langganan-subscription)
12. [Checklist acceptance](#12-checklist-acceptance)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Arsitektur singkat

| Komponen | Teknologi |
| --- | --- |
| Runtime | Next.js 16 App Router (Route Handlers, serverless di Vercel) |
| Bahasa | TypeScript strict |
| Database | Neon PostgreSQL 17 + PostGIS 3.5, Drizzle ORM (`postgres.js`, `prepare: false`) |
| Auth | Better Auth (email + password, cookie session, role `owner` / `admin`) |
| Storage | Cloudflare R2 (S3 API, bucket privat, foto disajikan lewat proxy backend) |
| Anti-bot | Cloudflare Turnstile (divalidasi server-side) |
| Validasi | Zod |
| Test | Vitest (unit + integration, database test terpisah) |

Semua endpoint memakai envelope response yang sama:

```json
{ "success": true, "message": "Request berhasil", "data": {}, "meta": null }
{ "success": false, "message": "Terjadi kesalahan", "errors": null }
```

Daftar endpoint lengkap: [`docs/api-endpoints.md`](api-endpoints.md),
spesifikasi OpenAPI: [`docs/openapi.yaml`](openapi.yaml).

---

## 2. Prasyarat

- Node.js **24.x** (lihat `engines` di `package.json`) dan npm.
- Akun Neon (PostgreSQL + PostGIS).
- Akun Cloudflare dengan R2 dan Turnstile.
- Akun Vercel dan GitHub.
- `curl` + `jq` untuk script testing.
- (Opsional) `vercel` dan `gh` CLI untuk deploy/otomasi.

---

## 3. Environment variables

Salin `.env.example` menjadi `.env`, lalu isi nilainya.

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | ya | Connection string PostgreSQL. Gunakan endpoint **pooled** Neon. |
| `TEST_DATABASE_URL` | untuk test | Database/branch terpisah. Test **menimpa** `DATABASE_URL` dengan nilai ini. |
| `BETTER_AUTH_SECRET` | ya | Minimal 32 karakter. Buat: `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | ya | URL publik aplikasi (contoh `https://havenakost.vercel.app`). |
| `APP_BASE_URL` | ya | URL publik aplikasi, dipakai untuk `trustedOrigins` dan link QR. |
| `R2_ACCOUNT_ID` | ya* | Account ID Cloudflare. |
| `R2_ACCESS_KEY_ID` | ya* | Access key token S3 R2. |
| `R2_SECRET_ACCESS_KEY` | ya* | Secret key token S3 R2. |
| `R2_BUCKET_NAME` | ya* | Nama bucket (privat). |
| `R2_ENDPOINT` | ya* | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. |
| `R2_PUBLIC_URL` | tidak | Kosongkan bila bucket privat (foto lewat proxy `/api/public/photos`). |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ya* | Site key widget Turnstile (aman untuk client). |
| `TURNSTILE_SECRET_KEY` | ya* | Secret key Turnstile (server-side saja). |
| `REVIEW_RATE_LIMIT_HMAC_SECRET` | ya* | HMAC untuk fingerprint rate limit. Buat: `openssl rand -hex 32`. |
| `ADMIN_BOOTSTRAP_EMAIL` | tidak | Hanya untuk script `npm run admin:create`. |
| `ADMIN_BOOTSTRAP_PASSWORD` | tidak | Hanya untuk script bootstrap admin (minimal 12 karakter). |
| `ADMIN_BOOTSTRAP_NAME` | tidak | Nama admin saat bootstrap. |

`ya*` = wajib untuk fitur terkait (R2 untuk foto, Turnstile untuk submit review,
HMAC untuk rate limit review). Runtime akan mengembalikan `503` dengan kode
`TURNSTILE_NOT_CONFIGURED` bila secret Turnstile belum diisi.

> Jangan pernah commit `.env` atau `api.md`. Keduanya sudah masuk `.gitignore`.

---

## 4. Setup lokal

```bash
cp .env.example .env      # isi DATABASE_URL, secret, R2, Turnstile
npm install

npm run db:migrate        # apply migration ke DATABASE_URL (mengaktifkan PostGIS)
npm run db:seed           # seed 13 katalog fasilitas
npm run dev               # http://localhost:3000
```

Bootstrap admin (sekali saja, bukan lewat registrasi publik):

```bash
ADMIN_BOOTSTRAP_EMAIL=admin@example.com \
ADMIN_BOOTSTRAP_PASSWORD='password-panjang-aman' \
npm run admin:create
```

Perintah harian lain:

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Dev server. |
| `npm run build` | Build produksi. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run test` | Seluruh test Vitest. |
| `npm run test:db:migrate` | Migrasi database test. |
| `npm run db:generate` | Generate SQL migration baru dari schema. |
| `npm run db:studio` | Drizzle Studio. |
| `npm run db:seed` | Seed fasilitas. |
| `npm run admin:create` | Bootstrap akun admin. |

---

## 5. Setup layanan eksternal

### 5.1 Neon (database)

1. Buat project Neon (PostgreSQL 17, region terdekat dengan Vercel).
2. Salin connection string **pooled** ke `DATABASE_URL`.
3. PostGIS tidak perlu diaktifkan manual — migration
   `drizzle/0001_postgis_location.sql` menjalankan `CREATE EXTENSION` dan
   membuat trigger sinkronisasi `geography(Point,4326)`.
4. Jalankan `npm run db:migrate`, lalu `npm run db:seed`.

Untuk testing, buat database/branch terpisah lalu isi `TEST_DATABASE_URL`.
Test integration **tidak** menyentuh database development karena
`tests/setup.ts` menimpa `DATABASE_URL` dengan `TEST_DATABASE_URL`.

### 5.2 Cloudflare R2 (foto)

1. Buat bucket **privat** (contoh `havenakost`).
2. Buat API token S3 dengan izin object read/write pada bucket tersebut.
3. Isi `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
   `R2_BUCKET_NAME`, `R2_ENDPOINT`.
4. Set CORS bucket agar browser boleh upload langsung:
   - AllowedOrigins: domain frontend (termasuk `http://localhost:3000` saat dev)
   - AllowedMethods: `PUT`, `GET`, `HEAD`
   - AllowedHeaders: `Content-Type`, `Content-Length`
5. Biarkan `R2_PUBLIC_URL` kosong; foto publik dilayani melalui
   `GET /api/public/photos?key=kosts/...` (hanya untuk listing published).

### 5.3 Cloudflare Turnstile

1. Buat widget Turnstile (mode managed).
2. Isi `NEXT_PUBLIC_TURNSTILE_SITE_KEY` dan `TURNSTILE_SECRET_KEY`.
3. Daftarkan **hostname** di dashboard Turnstile:
   - `localhost` (untuk dev)
   - `havenakost.vercel.app`
   - domain kustom bila ada
4. Token Turnstile sekali pakai. Backend menolak token invalid/expired/reused
   dengan `422` dan `errors.codes`.

### 5.4 Better Auth

```bash
openssl rand -base64 32   # BETTER_AUTH_SECRET
openssl rand -hex 32      # REVIEW_RATE_LIMIT_HMAC_SECRET
```

Di produksi `BETTER_AUTH_URL` dan `APP_BASE_URL` **wajib** URL HTTPS yang sama
dengan domain yang dipakai client, karena keduanya dipakai sebagai
`trustedOrigins` dan atribut cookie `secure` aktif.

---

## 6. Deploy ke Vercel

### 6.1 Import project

1. Push repo ke GitHub (`main`).
2. Vercel → **Add New Project** → import repo.
3. Framework terdeteksi otomatis **Next.js**. Build command `npm run build`,
   output default. Node.js **24.x** (dipin lewat `engines`).
4. Set environment variables untuk **Production**, **Preview**, dan
   **Development** (lihat tabel bagian 3). Nilai `BETTER_AUTH_URL` dan
   `APP_BASE_URL` = `https://havenakost.vercel.app`.

### 6.2 Migrasi database produksi

Migration **tidak** dijalankan otomatis oleh build. Jalankan terkontrol dari
mesin lokal/CI dengan environment produksi:

```bash
DATABASE_URL='postgresql://...' npm run db:migrate
DATABASE_URL='postgresql://...' npm run db:seed
```

Lakukan sebelum men-deploy perubahan schema.

### 6.3 Bootstrap admin produksi

```bash
DATABASE_URL='postgresql://...' \
BETTER_AUTH_SECRET='<secret produksi>' \
BETTER_AUTH_URL='https://havenakost.vercel.app' \
APP_BASE_URL='https://havenakost.vercel.app' \
ADMIN_BOOTSTRAP_EMAIL='admin@example.com' \
ADMIN_BOOTSTRAP_PASSWORD='<password-kuat>' \
npm run admin:create
```

### 6.4 Deploy & verifikasi

```bash
vercel --prod          # atau biarkan auto-deploy dari GitHub
curl -s https://havenakost.vercel.app/api/health | jq
```

Response sehat: `data.status = "ok"`, `data.database = "connected"`,
`data.postgis` berisi versi PostGIS.

### 6.5 Catatan penting

- **Auto-deploy**: setiap push ke `main` memicu deployment produksi.
- **Preview deployment** memakai env yang sama, sehingga `BETTER_AUTH_URL`
  tetap domain produksi. Login dari URL preview akan gagal karena origin tidak
  ada di `trustedOrigins`. Untuk testing gunakan domain produksi, atau set
  `BETTER_AUTH_URL`/`APP_BASE_URL` khusus environment Preview.
- Jangan mengandalkan state in-memory; rate limit review disimpan di database.

---

## 7. Testing otomatis

### 7.1 Unit + integration (Vitest)

```bash
npm run test:db:migrate    # siapkan database test (opsional, global-setup juga migrasi)
npm test
```

Hasil terverifikasi: **2 file test, 27 test lulus**. Cakupan lengkap ada di
[`docs/testing.md`](testing.md) — meliputi health, sesi/auth, eskalasi role,
approval owner & listing, pencarian PostGIS, fasilitas, presign foto, kamar &
QR, submit review publik, privasi data penghuni, verifikasi owner, duplikasi
occupancy, lifecycle QR, suspensi owner, moderasi admin, keuangan, langganan,
dashboard admin, dan otorisasi lintas role.

### 7.2 Typecheck & build

```bash
npm run typecheck
npm run build
```

### 7.3 Smoke test (read-only)

Script ini hanya melakukan GET + login, aman dijalankan ke produksi:

```bash
# publik saja
./scripts/smoke-test.sh https://havenakost.vercel.app

# dengan cek endpoint admin
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='...' \
  ./scripts/smoke-test.sh https://havenakost.vercel.app

# lokal
./scripts/smoke-test.sh http://localhost:3000
```

Exit code `0` bila semua lolos.

### 7.4 E2E demo (menulis data)

Membuat owner baru → approval admin → listing → kamar → QR → penghuni →
submit → approve → verifikasi endpoint publik → (arsip listing).

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='...' \
  ./scripts/e2e-demo.sh https://havenakost.vercel.app

# simpan data demo (jangan diarsipkan)
ADMIN_EMAIL=... ADMIN_PASSWORD=... \
  ./scripts/e2e-demo.sh https://havenakost.vercel.app --keep
```

Akun owner demo tidak bisa dihapus lewat API (tidak ada endpoint hapus akun).

---

## 8. Testing manual end-to-end (API produksi)

Semua contoh memakai `B=https://havenakost.vercel.app`. Untuk lokal, ganti
dengan `http://localhost:3000`. Cookie disimpan dengan `-c/-b`.

```bash
B=https://havenakost.vercel.app
ADMIN_JAR=/tmp/admin.cj ; OWNER_JAR=/tmp/owner.cj
```

### 8.1 Login admin

```bash
curl -s -c $ADMIN_JAR -X POST "$B/api/auth/sign-in/email" \
  -H 'Content-Type: application/json' -H "Origin: $B" \
  -d '{"email":"admin@example.com","password":"<password>"}' | jq
```

### 8.2 Registrasi owner

```bash
curl -s -c $OWNER_JAR -X POST "$B/api/auth/sign-up/email" \
  -H 'Content-Type: application/json' -H "Origin: $B" \
  -d '{"email":"owner@example.com","password":"Password123!","name":"Pemilik Kost"}' | jq
```

Field `role` diabaikan; semua registrasi publik menjadi `owner` dengan status
`pending`.

### 8.3 Lengkapi profil owner

```bash
curl -s -b $OWNER_JAR -c $OWNER_JAR -X PATCH "$B/api/owner/profile" \
  -H 'Content-Type: application/json' -H "Origin: $B" \
  -d '{"full_name":"Pemilik Demo","business_name":"Havena Property",
       "phone":"6281234567890","address":"Jl. Soekarno Hatta No. 10"}' | jq
```

### 8.4 Admin mencari & menyetujui owner

```bash
curl -s -b $ADMIN_JAR "$B/api/admin/owners?approval_status=pending&limit=50" | jq
# ambil field userId (bukan profileId) untuk endpoint approval:
curl -s -b $ADMIN_JAR -X POST "$B/api/admin/owners/<userId>/approve" | jq
```

Owner `pending` masih bisa login, tetapi tidak bisa membuat/mengajukan listing.

### 8.5 Owner membuat listing

```bash
FAC=$(curl -s "$B/api/public/facilities" | jq -c '[.data[0].id,.data[1].id]')

curl -s -b $OWNER_JAR -c $OWNER_JAR -X POST "$B/api/owner/listings" \
  -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"name\":\"Kost Havena Lowokwaru\",
       \"description\":\"Deskripsi minimal dua puluh karakter untuk listing.\",
       \"address\":\"Jl. Soekarno Hatta No. 10\",\"province\":\"Jawa Timur\",
       \"city\":\"Kota Malang\",\"district\":\"Lowokwaru\",
       \"subdistrict\":\"Tulusrejo\",\"postal_code\":\"65141\",
       \"latitude\":-7.9412,\"longitude\":112.6201,
       \"gender_policy\":\"mixed\",\"price_min\":700000,\"price_max\":1500000,
       \"contact_phone\":\"6281234567890\",\"facility_ids\":$FAC}" | jq
```

Listing baru selalu `draft`. Simpan `data.id` dan `data.slug`.

### 8.6 Kamar, QR, dan penghuni

```bash
KID=<kost id>
curl -s -b $OWNER_JAR -c $OWNER_JAR -X POST "$B/api/owner/listings/$KID/rooms" \
  -H 'Content-Type: application/json' -H "Origin: $B" \
  -d '{"room_code":"A01","room_name":"Kamar A01","monthly_price":900000,"room_status":"available"}' | jq

RID=<room id>
curl -s -b $OWNER_JAR -c $OWNER_JAR -X POST "$B/api/owner/rooms/$RID/qr" | jq
# -> data.token (untuk review), data.reviewUrl, data.qrDataUrl

curl -s -b $OWNER_JAR -c $OWNER_JAR -X POST "$B/api/owner/rooms/$RID/occupancies" \
  -H 'Content-Type: application/json' -H "Origin: $B" \
  -d '{"tenant_name":"Budi Santoso","check_in_date":"2026-01-05",
       "check_out_date":null,"occupancy_status":"active"}' | jq
```

Tambahan QR: `GET /api/owner/rooms/{id}/qr?format=png` (download PNG),
`?format=svg`, `POST .../qr/regenerate` (token baru), `DELETE .../qr`
(menonaktifkan).

### 8.7 Ajukan & approve listing

```bash
curl -s -b $OWNER_JAR -c $OWNER_JAR -X PATCH "$B/api/owner/listings/$KID" \
  -H 'Content-Type: application/json' -H "Origin: $B" -d '{"status":"pending"}' | jq

curl -s -b $ADMIN_JAR "$B/api/admin/listings?status=pending&limit=50" | jq
curl -s -b $ADMIN_JAR -X POST "$B/api/admin/listings/$KID/approve" | jq
```

### 8.8 Verifikasi publik

```bash
curl -s "$B/api/public/kost?q=Havena" | jq            # pencarian
curl -s "$B/api/public/kost/<slug>" | jq              # detail (foto, fasilitas, kamar, review)
curl -s "$B/api/public/kost/<slug>/rooms" | jq        # kamar publik
curl -s "$B/api/public/review/<qr-token>" | jq        # validasi token QR
curl -s "$B/api/public/locations/search?latitude=-7.9412&longitude=112.6201&radius=3000" | jq
```

Catatan: parameter `q` mencocokkan **seluruh frasa**, jadi `q=Havena Demo` tidak
menemukan `Kost Demo Havena`, sedangkan `q=Havena` menemukannya.

### 8.9 Ringkasan hasil verifikasi produksi

| Cek | Hasil |
| --- | --- |
| `GET /api/health` | `200`, database connected, PostGIS 3.5 |
| Auth (sign-in/sign-up) + cookie session | `200` |
| Otorisasi lintas role (owner → admin) | `403` |
| Owner approval, listing approve | `200` |
| Publik: search/detail/rooms/nearby/QR | `200` |
| QR PNG | `200 image/png` |
| Presign → PUT R2 → confirm → proxy foto | `200` (objek 3000 byte terverifikasi) |
| Submit review dengan token Turnstile invalid | `422 invalid-input-response` |
| Test suite Vitest | 27/27 lulus |
| `smoke-test.sh` | 12/12 lolos |
| `e2e-demo.sh` | 21/21 lolos |

---

## 9. Testing upload foto R2

Alur: presign → `PUT` langsung ke R2 → confirm → foto tampil di endpoint publik.

```bash
KID=<kost id>
# 1. Minta presigned URL (size harus sama persis dengan ukuran file)
curl -s -b $OWNER_JAR -c $OWNER_JAR -X POST "$B/api/owner/listings/$KID/photos/presign" \
  -H 'Content-Type: application/json' -H "Origin: $B" \
  -d '{"filename":"depan.png","content_type":"image/png","size":3000}' > /tmp/presign.json
jq -c '{key:.data.objectKey,headers:.data.headers}' /tmp/presign.json

# 2. Upload ke R2 memakai uploadUrl + headers dari response
URL=$(jq -r .data.uploadUrl /tmp/presign.json)
KEY=$(jq -r .data.objectKey /tmp/presign.json)
curl -X PUT "$URL" -H 'Content-Type: image/png' -H 'Content-Length: 3000' \
  --data-binary @foto-3000-byte.png

# 3. Konfirmasi ke backend
curl -s -b $OWNER_JAR -c $OWNER_JAR -X POST "$B/api/owner/listings/$KID/photos/confirm" \
  -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"object_key\":\"$KEY\",\"alt_text\":\"Tampak depan\",\"is_cover\":true,\"sort_order\":0}" | jq

# 4. Foto publik (hanya listing published)
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' \
  "$B/api/public/photos?key=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=''))" "$KEY")"
```

Batasan: JPEG/PNG/WebP, maksimal 10 MB, maksimal 50 foto per listing, URL
upload berlaku 300 detik.

---

## 10. Testing review QR + Turnstile

Alur lengkap:

1. Tamu scan QR → `GET /api/public/review/{token}`.
2. Form memakai `turnstile_site_key` dari response.
3. Submit `POST /api/public/reviews` dengan `turnstile_token`.
4. Review masuk `pending`, dicocokkan dengan occupancy.
5. Owner verifikasi (`POST /api/owner/reviews/{id}/verify`) atau tolak.
6. Admin memoderasi (`hide` / `publish`).

```bash
curl -s -X POST "$B/api/public/reviews" \
  -H 'Content-Type: application/json' -H "Origin: $B" \
  -d '{"qr_token":"<token>","reviewer_name":"Budi Santoso",
       "public_display_name":"Budi S.","claimed_check_in_date":"2026-01-05",
       "claimed_check_out_date":null,"rating":5,
       "comment":"Kost bersih dan pemilik responsif.",
       "turnstile_token":"<token-dari-widget>"}' | jq
```

**Menguji di produksi** membutuhkan token Turnstile aktif: buka halaman
frontend yang memuat widget (hostname harus terdaftar di dashboard Turnstile),
selesaikan challenge, lalu kirim token ke endpoint di atas. Token sekali pakai.

**Menguji tanpa Turnstile** (lokal): jalankan dengan `NODE_ENV=test`, token
literal `test-bypass` diterima. Inilah yang dilakukan suite Vitest, sehingga
alur review/verifikasi/moderasi tervalidasi otomatis tanpa memanggil Cloudflare.

Rate limit: submit review 5/jam/IP dan 3/jam/token; pencarian publik
120/menit/IP; sign-in 10/5 menit; sign-up 5/jam.

---

## 11. Testing langganan (subscription)

```bash
# Admin membuat paket
curl -s -b $ADMIN_JAR -X POST "$B/api/admin/subscription-plans" \
  -H 'Content-Type: application/json' -H "Origin: $B" \
  -d '{"name":"Basic","price":50000,"duration_days":30,
       "max_listings":3,"max_rooms_per_listing":20,"is_active":true}' | jq

# Owner melihat paket & mengajukan pembayaran manual
curl -s -b $OWNER_JAR "$B/api/owner/subscription/plans" | jq
curl -s -b $OWNER_JAR -X POST "$B/api/owner/subscription/payment" \
  -H 'Content-Type: application/json' -H "Origin: $B" \
  -d '{"plan_id":"<plan id>","amount":50000,"payment_method":"transfer",
       "proof_url":"kosts/bukti-transfer.png"}' | jq

# Admin approve pembayaran -> langganan aktif
curl -s -b $ADMIN_JAR "$B/api/admin/subscription-payments?status=pending" | jq
curl -s -b $ADMIN_JAR -X POST "$B/api/admin/subscription-payments/<id>/approve" | jq
curl -s -b $OWNER_JAR "$B/api/owner/subscription" | jq
```

Field wajib mengikuti `src/lib/validators/subscription.schema.ts`; bila ragu,
pakai pesan `422` sebagai acuan field yang kurang.

---

## 12. Checklist acceptance

- [ ] `npm run typecheck` tanpa error.
- [ ] `npm run build` sukses.
- [ ] `npm test` lulus (27 test).
- [ ] `./scripts/smoke-test.sh` lulus tanpa FAIL.
- [ ] `./scripts/e2e-demo.sh` lulus tanpa FAIL (opsional, menulis data).
- [ ] `GET /api/health` → `database: connected`.
- [ ] Registrasi owner → `pending`; admin approve → `approved`.
- [ ] Listing draft tidak muncul di publik; setelah approve muncul.
- [ ] QR kamar bisa dibuat, diunduh PNG, diregenerate, dinonaktifkan.
- [ ] Presign + upload + confirm foto berhasil, foto tampil via proxy.
- [ ] Submit review menolak token Turnstile invalid (`422`).
- [ ] Owner bisa verifikasi review; admin bisa hide/publish.
- [ ] Owner tidak bisa mengakses `/api/admin/*` (`403`).
- [ ] Audit log admin mencatat approval/moderasi.

---

## 13. Troubleshooting

| Gejala | Penyebab umum | Solusi |
| --- | --- | --- |
| `Konfigurasi environment tidak valid` saat build/start | Env var wajib kosong/invalid | Lengkapi `.env` / env Vercel. `BETTER_AUTH_URL` & `APP_BASE_URL` harus URL valid. |
| `DATABASE_URL belum diset` | Env belum dimuat | Pastikan `.env` ada; di Vercel set untuk environment yang dipakai. |
| `/api/health` → `503` / `database` bukan connected | Connection string salah, IP/SSL, atau DB tidur | Pakai endpoint pooled Neon + `sslmode=require`. |
| Login sukses tapi request berikutnya `401` | Cookie tidak terkirim / origin tidak cocok | Gunakan `-c/-b` (curl) atau `credentials: "include"`; origin harus ada di `trustedOrigins`. |
| Login dari URL preview Vercel gagal | `BETTER_AUTH_URL` = domain produksi | Gunakan domain produksi, atau set env khusus Preview. |
| `403 Akun pemilik belum disetujui admin` | Owner masih `pending` | Admin approve owner lebih dulu. |
| `409` saat submit review | Occupancy sudah dipakai review terverifikasi / QR nonaktif | Gunakan QR aktif dan occupancy yang belum terpakai. |
| `422 invalid-input-response` | Token Turnstile invalid/kedaluwarsa/sudah dipakai | Selesaikan challenge baru; pastikan hostname terdaftar. |
| Widget Turnstile tidak muncul (`110200`) | Hostname belum terdaftar di widget | Tambahkan domain di dashboard Turnstile. |
| `503 TURNSTILE_NOT_CONFIGURED` | `TURNSTILE_SECRET_KEY` kosong | Isi secret key di environment. |
| Upload foto gagal `403 SignatureDoesNotMatch` | `Content-Length`/`Content-Type` tidak sama dengan saat presign | Kirim header persis seperti response presign. |
| Foto publik `404` | Listing belum published atau key salah | Pastikan listing `published` dan key dari presign. |
| `429` | Rate limit | Tunggu sesuai window; atau pakai IP/token berbeda saat testing. |
| HTTP `000` / `curl: (52) Empty reply` | Gangguan jaringan sementara atau cold start Vercel | Ulangi request. `scripts/e2e-demo.sh` otomatis mengulang GET (3x); POST tidak diulang agar tidak membuat data ganda. |
| Migration gagal `type "geography" does not exist` | PostGIS belum aktif | Pastikan user DB boleh `CREATE EXTENSION postgis`. |

---

## Referensi lain

- [Arsitektur backend](backend-architecture.md)
- [Skema database](database-schema.md)
- [Daftar endpoint API](api-endpoints.md) / [OpenAPI](openapi.yaml)
- [Autentikasi & otorisasi](authentication.md)
- [Alur verifikasi review](review-verification-flow.md)
- [Storage R2](storage-r2.md)
- [Testing otomatis](testing.md)
- [Deployment](deployment.md)
