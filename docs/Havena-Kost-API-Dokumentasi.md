# Havena Kost — Dokumentasi Backend API

Dokumen ini untuk **tim frontend** (referensi implementasi) dan **PM** (gambaran alur dan fitur).
Disusun dari source code `xDzaky/havenakost` commit `1d5d73f` (18 November 2026). Dokumen pendamping: **Havena-Kost-Spesifikasi-Dashboard.md** (fitur tiap halaman dashboard Admin dan Pemilik Kost).

> Konvensi penulisan: `{id}` = UUID. Field berstatus *opsional* ditandai `?`. Seluruh pesan error berbahasa Indonesia.

---

## 0. Ringkasan untuk PM

| Hal | Isi |
| --- | --- |
| Produk | Platform listing kost: pencarian publik, dashboard pemilik kost, dashboard admin, ulasan terverifikasi lewat QR kamar |
| Peran | `owner` (pemilik kost), `admin`, dan pengunjung publik (tanpa login) |
| Jumlah endpoint | 66 file route, 85 handler HTTP (termasuk Better Auth) |
| Teknologi | Next.js 16 (App Router), PostgreSQL (Neon) + PostGIS, Better Auth, Cloudflare R2 (foto), Cloudflare Turnstile (anti-bot), Resend (email), Vercel |
| Status keamanan | Tidak ada temuan Critical pada audit statis ini. Beberapa catatan yang perlu diselesaikan sebelum rilis publik ada di **Bagian 9** |

**Fitur inti:**
1. Pengunjung mencari kost (kata kunci, filter, radius lokasi), melihat detail, kamar, dan ulasan.
2. Pemilik mendaftar, memverifikasi email, menunggu persetujuan admin, mengelola listing, kamar, foto, penghuni, keuangan, dan langganan.
3. Ulasan hanya bisa dikirim lewat QR di kamar, lalu diverifikasi pemilik dan dimoderasi admin.
4. Admin menyetujui pemilik, listing, pembayaran langganan, memoderasi ulasan, dan melihat audit log.

---

## 1. Konvensi Umum

### 1.1 Base URL dan header

| Lingkungan | Base URL |
| --- | --- |
| Produksi | `https://havenakost.vercel.app` |
| Lokal | `http://localhost:3000` |

- Semua body request berupa JSON dengan `Content-Type: application/json`. Content-Type lain ditolak **415**.
- Browser wajib memakai `credentials: "include"` agar cookie sesi terkirim.
- Mutasi (`POST/PUT/PATCH/DELETE`) memeriksa header `Origin`. Origin yang tidak cocok dengan domain aplikasi ditolak **403** (proteksi CSRF). Panggil API dari domain frontend yang sama atau yang terdaftar di `APP_BASE_URL`.
- Jangan simpan token sesi atau password di `localStorage`. Sesi memakai cookie `HttpOnly` yang diatur server.

### 1.2 Format respons

Sukses:

```json
{
  "success": true,
  "message": "Request berhasil",
  "data": { },
  "meta": null
}
```

Untuk daftar, `data` berupa array dan `meta` berisi paginasi:

```json
{
  "success": true,
  "message": "Request berhasil",
  "data": [ ],
  "meta": { "page": 1, "limit": 20, "total": 134, "totalPages": 7, "hasNext": true, "hasPrev": false }
}
```

Gagal:

```json
{ "success": false, "message": "Pesan untuk ditampilkan", "errors": null }
```

`errors` berisi detail validasi (per field) pada **422**, atau `{ "retry_after_seconds": 120 }` pada **429**.

Catatan: `POST /api/public/reviews/{reviewId}/report` mengembalikan `{ "success": true, "message": "..." }` dengan status **202**, tanpa field `data`.

### 1.3 Kode status

| Kode | Arti | Tindakan frontend |
| --- | --- | --- |
| 200 / 201 / 202 | Berhasil / dibuat / diterima | — |
| 400 | Parameter tidak valid | Tampilkan `message` |
| 401 | Belum login atau sesi berakhir | Arahkan ke halaman login |
| 403 | Peran salah, akun ditangguhkan/belum disetujui, atau Origin ditolak | Tampilkan `message` |
| 404 | Tidak ada, **atau bukan milik Anda** (sengaja tidak dibedakan) | Tampilkan halaman tidak ditemukan |
| 409 | Konflik status/data (duplikat, sudah diproses, kuota habis) | Tampilkan `message`, muat ulang data |
| 415 | Content-Type bukan JSON | Perbaiki header |
| 422 | Validasi gagal | Tampilkan `errors` per field |
| 429 | Terlalu banyak permintaan | Baca header `Retry-After`, tampilkan hitung mundur |
| 5xx | Gangguan server | Tampilkan pesan umum, coba lagi |

### 1.4 Paginasi

Query `page` (default 1) dan `limit` (default 20, maksimum 100) berlaku pada semua endpoint daftar.

### 1.5 Format data

| Jenis | Format | Contoh |
| --- | --- | --- |
| Tanggal | `YYYY-MM-DD`, divalidasi kalender | `2026-11-18` |
| Nomor telepon | Internasional tanpa `+`, awalan 62, 10–17 digit | `6281234567890` |
| Koordinat | `latitude` -90..90, `longitude` -180..180 | `-7.9666`, `112.6326` |
| Harga kost | Bilangan bulat rupiah, 0–1.000.000.000 | `1500000` |
| Waktu | ISO 8601 | `2026-11-18T03:00:00.000Z` |
| URL foto | `image_url` bisa berupa path relatif `/api/public/photos?key=...` atau URL CDN bila R2 publik dikonfigurasi. Tampilkan apa adanya | |

### 1.5b Penamaan field pada respons

Penamaan **tidak seragam** karena sebagian endpoint mengembalikan baris database apa adanya (`camelCase`, mis. `approvalStatus`, `rejectionReason`, `endDate`, `maxListings`, `priceMin`) sedangkan endpoint lain memakai `snake_case` buatan sendiri (mis. `publication_status`, `candidate_occupancies`, `period_days`, `income_count`). Request body dan query **selalu** `snake_case`. Saat integrasi, lihat respons aktual atau `docs/openapi.yaml` di repo, dan sebaiknya buat satu lapisan pemetaan di frontend. Menyeragamkan penamaan adalah usulan perbaikan backend.

### 1.6 Batas laju (rate limit)

| Aksi | Batas |
| --- | --- |
| Login | 8 gagal per 15 menit per (IP + email); 30 gagal per jam per email (berlaku untuk semua IP) |
| Registrasi | 5 per jam per IP |
| Kirim ulasan | 5 per jam per IP, 10 per hari per QR |
| Laporkan ulasan | 10 per jam per IP |
| Presign foto | 30 per jam per pemilik |
| Seluruh `/api/auth/*` | 40 per menit (bawaan Better Auth) |
| Endpoint publik lain | Dibatasi per IP (nilai di server) |

Saat terkena batas, respons **429** menyertakan header `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## 2. Alur Utama

### 2.1 Registrasi pemilik sampai bisa mempublikasikan listing

```
Daftar (sign-up) ──► Email verifikasi terkirim ──► Klik tautan ──► Email terverifikasi
        │                                                              │
        │                                                              ▼
        │                                              Login (sesi cookie dibuat)
        │                                                              │
        ▼                                                              ▼
 owner_profiles dibuat otomatis                       Status pemilik: pending
 (approval_status = pending)                          Boleh: isi profil, buat DRAFT listing, kamar, foto
                                                      Belum boleh: ajukan listing (status pending)
                                                              │
                                              Admin menyetujui pemilik (approved)
                                                              │
                                                              ▼
                                           Pemilik mengajukan listing (draft → pending)
                                                              │
                                      Admin approve ──► published (tampil di pencarian publik)
                                      Admin reject  ──► rejected (alasan dikirim ke notifikasi pemilik)
```

Aturan penting:
- Login **ditolak 403 `EMAIL_NOT_VERIFIED`** sebelum email diverifikasi. Frontend perlu halaman "cek email Anda" dan tombol kirim ulang verifikasi.
- Sign-up tidak langsung membuat sesi. Pemilik harus verifikasi dulu.
- Password minimal **12** karakter, maksimal 128.
- Status pemilik: `pending` → `approved` / `rejected` / `suspended`. Pemilik `suspended` mendapat **403** pada semua endpoint `/api/owner/*` kecuali `GET /api/owner/profile` (agar alasan bisa ditampilkan).
- Pemilik `rejected`: seluruh sesi dicabut dan listing published diarsipkan.

### 2.2 Siklus status listing

| Status | Arti | Siapa yang bisa mengubah |
| --- | --- | --- |
| `draft` | Baru dibuat, belum diajukan | Pemilik |
| `pending` | Menunggu persetujuan admin | Pemilik (ajukan, hanya jika pemilik `approved`), admin |
| `published` | Tampil publik | Admin (approve) |
| `rejected` | Ditolak admin, ada alasan | Admin |
| `archived` | Diarsipkan | Pemilik atau admin |

Aturan:
- Pemilik **tidak bisa** menetapkan `published`. Hanya admin.
- Listing `published` oleh pemilik hanya boleh **diarsipkan**. Mengubah status lain ditolak 409.
- Mengubah **nama, deskripsi, alamat, koordinat, atau telepon kontak** pada listing `published` otomatis mengembalikannya ke `pending` dan memberi notifikasi ke admin. Perubahan field lain (harga, gender, fasilitas, dll.) tetap `published`. Frontend sebaiknya menampilkan peringatan sebelum menyimpan perubahan field sensitif.
- Kuota listing: pemilik **tanpa langganan aktif** dibatasi **1 listing** (listing `archived` dan terhapus tidak dihitung). Dengan langganan aktif, batas mengikuti `max_listings` paket (`null` = tanpa batas). Melebihi kuota → **403**.
- Hapus listing adalah *soft delete*.

### 2.3 Unggah foto listing

```
1. POST /api/owner/listings/{id}/photos/presign   {filename, content_type, size}
        ◄── { objectKey, uploadUrl, expiresIn, headers }
2. PUT {uploadUrl}  (langsung ke Cloudflare R2, kirim header dari respons, body = file)
3. POST /api/owner/listings/{id}/photos/confirm   {object_key, alt_text?, is_cover?, sort_order?}
        ◄── data foto tersimpan
```

- Format: `image/jpeg`, `image/png`, `image/webp`. Maksimal **10 MB** per file dan **10 foto** per listing.
- Server memeriksa isi file (bukan hanya ekstensi). File yang bukan gambar sungguhan ditolak 422.
- Langkah 2 tidak melewati backend; jangan kirim cookie ke `uploadUrl`.
- Jika langkah 2 berhasil tapi langkah 3 tidak dipanggil, file menjadi yatim di storage. Frontend harus selalu memanggil confirm.

### 2.4 Ulasan terverifikasi lewat QR kamar

```
PEMILIK                          PENGUNJUNG                         ADMIN
  │                                  │                                │
  ├─ Buat QR kamar ─► cetak, tempel  │                                │
  │                                  ├─ Scan QR ─► /review/{token}    │
  │                                  ├─ GET /api/public/review/{token}│
  │                                  │   (nama kost + nama kamar)     │
  │                                  ├─ Isi form + Turnstile          │
  │                                  ├─ POST /api/public/reviews      │
  │                                  │   → status: pending            │
  ◄─ Notifikasi "review_pending" ────┤                                │
  │                                                                   │
  ├─ Lihat review + kandidat penghuni (nama cocok & periode overlap)  │
  ├─ Verify ─► published                                              │
  └─ Reject (alasan) ─► owner_rejected ──────────────────► Admin dapat override (publish/reject)
                                                          Admin juga dapat hide/publish/verify/reject
Pengunjung lain dapat melaporkan review published ─► ditandai (flag) ─► ditinjau admin
```

Aturan:
- Respons kirim ulasan **tidak** memberi tahu hasil pencocokan nama.
- Komentar ulasan dan balasan pemilik **tidak boleh** berisi tautan atau nomor telepon (422).
- Jika nama pengulas tidak cocok dengan nama penghuni, pemilik wajib mengisi `override_reason` (minimal 15 karakter, bukan teks generik) saat verify. Alasan dicatat di audit log.
- Review yang sudah dimoderasi admin tidak bisa diubah pemilik (403).
- Pemilik hanya bisa membalas review yang `published`. Satu balasan per review (balasan baru menimpa yang lama).
- Pemilik tidak bisa mengubah rating atau isi ulasan.
- Pelaporan memakai Turnstile dan dedup per IP; respons selalu 202 meski review tidak ada (tidak membocorkan keberadaan).

Status ulasan:

| `publication_status` | Arti |
| --- | --- |
| `pending` | Menunggu pemilik/admin |
| `published` | Tampil publik |
| `rejected` | Ditolak (oleh admin) |
| `owner_rejected` | Ditolak pemilik; admin dapat meninjau dan override |
| `hidden` | Disembunyikan admin |

| `verification_status` | Arti |
| --- | --- |
| `unmatched` | Tidak ada penghuni dengan nama sama |
| `possible_match` | Tepat satu kandidat |
| `ambiguous` | Lebih dari satu kandidat |
| `verified` | Diverifikasi |
| `rejected` | Ditolak |

### 2.5 Langganan dan pembayaran

```
Pemilik lihat paket ──► POST pembayaran {plan_id, payment_method, payment_amount, payment_proof?}
        │                       │ (nominal harus sama dengan harga paket; hanya 1 pembayaran pending per pemilik)
        │                       ▼
        │              Admin menerima notifikasi
        │                       │
        │        Admin approve ──► langganan aktif (atau diperpanjang bila masih aktif)
        │        Admin reject (alasan) ──► pemilik dapat mengajukan ulang
        ▼
Langganan kedaluwarsa otomatis saat dibaca setelah `end_date`
```

- `payment_proof` opsional: URL `https://...` atau object key berawalan `payments/`.
- Pembayaran dilakukan di luar sistem (transfer manual); backend tidak terhubung payment gateway.

### 2.6 Keuangan pemilik

Pemilik mencatat pemasukan/pengeluaran (opsional dikaitkan ke listing/kamar), lalu melihat ringkasan (total, per bulan, per kategori). Murni pencatatan internal pemilik.

---

## 3. Autentikasi (Better Auth)

Endpoint ditangani Better Auth pada `/api/auth/*`. Nama endpoint standar:

| Method | Path | Body | Catatan |
| --- | --- | --- | --- |
| POST | `/api/auth/sign-up/email` | `name`, `email`, `password` (12–128) | Role selalu `owner`; field `role` diabaikan. Mengirim email verifikasi |
| POST | `/api/auth/sign-in/email` | `email`, `password` | 401 `INVALID_EMAIL_OR_PASSWORD` (pesan sama untuk email salah atau password salah); 403 `EMAIL_NOT_VERIFIED`; 429 bila terkena batas |
| POST | `/api/auth/sign-out` | — | Menghapus sesi |
| GET | `/api/auth/get-session` | — | Mengembalikan sesi + `user` (termasuk `role`); `null` bila belum login |
| GET | `/api/auth/verify-email?token=...` | — | Dibuka dari tautan email |
| POST | `/api/auth/send-verification-email` | `email` | Kirim ulang verifikasi |
| POST | `/api/auth/forget-password` atau `/api/auth/request-password-reset` | `email`, `redirectTo` | Respons selalu generik. **Konfirmasi nama endpoint pada Better Auth 1.7.25 saat integrasi** |
| POST | `/api/auth/reset-password` | `newPassword`, `token` | Dari tautan email |

Catatan:
- Sesi berlaku **7 hari**, diperbarui tiap hari.
- Akun admin tidak dibuat lewat registrasi; dibuat dengan skrip `npm run admin:create`.
- Setelah login, panggil `get-session` lalu arahkan berdasarkan `user.role`: `owner` → dashboard pemilik, `admin` → dashboard admin.
- Frontend perlu halaman: login, daftar, "cek email", hasil verifikasi, lupa password, reset password.

---

## 4. Endpoint Publik (tanpa login)

### 4.1 Pencarian kost

**GET `/api/public/kost`** — Daftar listing `published`.

| Query | Tipe | Keterangan |
| --- | --- | --- |
| `q?` | string ≤100 | Cari di nama dan alamat |
| `city?`, `district?` | string | Filter (tidak peka huruf besar/kecil) |
| `gender_policy?` | `male` / `female` / `mixed` | |
| `price_min?`, `price_max?` | integer | `price_max` ≥ `price_min` |
| `facility?` | UUID, boleh banyak (`a,b` atau berulang) | |
| `available?` | boolean | Hanya yang punya kamar tersedia |
| `sort?` | `newest` (default) / `price_asc` / `price_desc` / `distance` | `distance` wajib disertai koordinat |
| `latitude?`, `longitude?`, `radius?` | number | Harus dikirim berpasangan. `radius` 100–50000 m (default 5000) |
| `page?`, `limit?` | | |

Tiap item (kartu listing): `id`, `name`, `slug`, `description`, `address`, `province`, `city`, `district`, `subdistrict`, `postalCode`, `latitude`, `longitude`, `genderPolicy`, `priceMin`, `priceMax`, `contactPhone`, `status`, `verifiedAt`, `createdAt`, `coverImageUrl`, `ratingAvg`, `reviewCount`, `roomCount`, `availableRoomCount`.

**GET `/api/public/locations/search`** — Pencarian berbasis lokasi; parameter dan bentuk respons sama dengan `/api/public/kost`.

**GET `/api/public/kost/{slug}`** — Detail listing: data kartu + nama bisnis pemilik, daftar foto (`id`, `imageUrl`, `altText`, `sortOrder`, `isCover`), fasilitas (`id`, `name`, `slug`, `icon`), kamar (`id`, `roomCode`, `roomName`, `description`, `monthlyPrice`, `roomStatus`), ringkasan rating per kamar, dan ulasan terbaru. Listing draft/arsip → 404.

**GET `/api/public/kost/{slug}/rooms`** — Daftar kamar listing.

**GET `/api/public/kost/{slug}/reviews`** — Ulasan `published`. Query: `room_id?`, `page`, `limit`. Tiap ulasan memuat nama tampilan, rating, komentar, kamar (`roomCode`, `roomName`), `ownerReply`, `ownerRepliedAt`, `createdAt`. Tidak memuat data pribadi penghuni.

**GET `/api/public/facilities`** — Katalog fasilitas (untuk filter dan form).

**GET `/api/public/photos?key=kosts/...`** — Proxy foto dari bucket privat. Hanya untuk foto listing published. Di-cache 10 menit.

### 4.2 Ulasan

**GET `/api/public/review/{token}`** — Data untuk form ulasan dari QR: nama kost dan nama kamar (bentuk field persisnya cek pada respons aktual). 404 bila QR tidak valid/nonaktif.

**POST `/api/public/reviews`** — Kirim ulasan.

| Field | Wajib | Aturan |
| --- | --- | --- |
| `qr_token` | ya | 10–200 karakter (dari URL QR) |
| `reviewer_name` | ya | 2–120 |
| `public_display_name` | tidak | ≤80, nama yang ditampilkan publik |
| `claimed_check_in_date` | ya | `YYYY-MM-DD` |
| `claimed_check_out_date` | tidak | ≥ tanggal masuk, boleh `null` |
| `rating` | ya | bilangan bulat 1–5 |
| `comment` | ya | 10–2000, tanpa tautan dan tanpa nomor telepon |
| `turnstile_token` | ya | Token widget Cloudflare Turnstile |
| `consent_privacy` | tidak | boolean persetujuan privasi |

Respons berisi `id`, `publication_status: "pending"`, dan `message`. Field asing ditolak 422.

**POST `/api/public/reviews/{reviewId}/report`** — Laporkan ulasan. Body: `reason` (5–500), `turnstile_token` (wajib). Selalu **202**.

---

## 5. Endpoint Pemilik Kost (`/api/owner/*`, peran `owner`)

Semua butuh sesi pemilik. Resource milik pemilik lain menghasilkan **404**.

### 5.1 Profil

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/owner/profile` | Profil + `approvalStatus` + `rejectionReason` (alasan penolakan/penangguhan). Tetap bisa diakses saat `suspended` |
| PATCH | `/api/owner/profile` | Body (min. satu): `full_name` (3–120), `business_name?` (≤150), `phone?` (format 62…), `address?` (≤500), `profile_photo?` (≤500). Tidak bisa mengubah `role` atau `approval_status` |

### 5.2 Listing

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/owner/listings` | Query: `q?`, `status?`, `page`, `limit` |
| POST | `/api/owner/listings` | Buat listing (status awal `draft`). Kena kuota (lihat 2.2) |
| GET | `/api/owner/listings/{id}` | Detail lengkap |
| PATCH | `/api/owner/listings/{id}` | Ubah listing (min. satu field); `status` boleh `draft`/`pending`/`archived` |
| DELETE | `/api/owner/listings/{id}` | Soft delete |
| GET | `/api/owner/listings/{id}/facilities` | Fasilitas terpilih |
| PUT | `/api/owner/listings/{id}/facilities` | Body `{ "facility_ids": [UUID, ...] }` (maks. 50), menggantikan seluruh pilihan |

Body **POST listing**:

| Field | Wajib | Aturan |
| --- | --- | --- |
| `name` | ya | 3–120 |
| `description` | ya | 20–5000 |
| `address` | ya | 5–300 |
| `province`, `city`, `district` | ya | 2–100 |
| `subdistrict` | tidak | ≤100 |
| `postal_code` | tidak | 5 digit |
| `latitude`, `longitude` | ya | rentang koordinat |
| `gender_policy` | ya | `male` / `female` / `mixed` |
| `price_min`, `price_max` | ya | integer, `price_max` ≥ `price_min` |
| `contact_phone` | ya | format 62… |
| `facility_ids` | tidak | array UUID, maks. 50 |

**PATCH** memakai field yang sama (semuanya opsional, `subdistrict` dan `postal_code` boleh `null`) ditambah `status`.

### 5.3 Foto

| Method | Path | Body / keterangan |
| --- | --- | --- |
| POST | `/api/owner/listings/{id}/photos/presign` | `filename` (1–255), `content_type` (jpeg/png/webp), `size` (≤10 MB) |
| POST | `/api/owner/listings/{id}/photos/confirm` | `object_key`, `alt_text?` (≤200), `is_cover?` (default false), `sort_order?` (0–1000) |
| PATCH | `/api/owner/photos/{photoId}` | `alt_text?` (boleh null), `sort_order?`, `is_cover?` (min. satu) |
| DELETE | `/api/owner/photos/{photoId}` | Hapus foto |

### 5.4 Kamar

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/owner/listings/{id}/rooms` | Query: `status?` (`available`/`occupied`/`unavailable`), `page`, `limit` |
| POST | `/api/owner/listings/{id}/rooms` | Buat kamar |
| GET | `/api/owner/rooms/{roomId}` | Detail |
| PATCH | `/api/owner/rooms/{roomId}` | Ubah (min. satu field) |
| DELETE | `/api/owner/rooms/{roomId}` | Ditolak 409 bila kamar punya riwayat penghuni atau ulasan. Gunakan status `unavailable` |

Body kamar: `room_code` (1–20; huruf, angka, `.` `_` `-`), `room_name?` (≤100), `description?` (≤1000), `monthly_price` (0–1.000.000.000), `room_status` (default `available`).

### 5.5 QR kamar

| Method | Path | Keterangan |
| --- | --- | --- |
| POST | `/api/owner/rooms/{roomId}/qr` | Buat QR. 409 bila sudah ada tetapi nonaktif (gunakan regenerate) |
| GET | `/api/owner/rooms/{roomId}/qr` | Data QR: `roomId`, `roomCode`, `token`, `reviewUrl`, `enabled`, `dataUrl`, `svg`. Dengan `?format=png` atau `?format=svg` mengunduh berkas gambar (409 bila nonaktif) |
| POST | `/api/owner/rooms/{roomId}/qr/regenerate` | Token baru; token lama langsung tidak berlaku |
| DELETE | `/api/owner/rooms/{roomId}/qr` | Nonaktifkan |

### 5.6 Penghuni (occupancy)

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/owner/rooms/{roomId}/occupancies` | Query: `status?` (`active`/`completed`/`cancelled`), `page`, `limit` |
| POST | `/api/owner/rooms/{roomId}/occupancies` | Body: `tenant_name` (2–120), `check_in_date`, `check_out_date?` (≥ masuk), `occupancy_status` (default `active`), `notes?` (≤1000) |
| PATCH | `/api/owner/occupancies/{occupancyId}` | Ubah (min. satu field) |
| DELETE | `/api/owner/occupancies/{occupancyId}` | Hapus (409 bila sudah dipakai verifikasi ulasan) |

Aturan: satu kamar hanya boleh punya **satu penghuni aktif** pada satu waktu (409 bila menambah/mengubah menjadi aktif saat sudah ada yang aktif). Hapus penghuni ditolak 409 bila datanya sudah dipakai verifikasi ulasan. Data penghuni dipakai untuk mencocokkan ulasan dan tidak pernah tampil di API publik.

### 5.7 Ulasan

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/owner/reviews` | Query: `publication_status?`, `verification_status?`, `kost_id?`, `room_id?`, `page`, `limit` |
| GET | `/api/owner/reviews/{reviewId}` | Detail + kandidat penghuni (`candidate_occupancies`, termasuk penanda `already_used_for_verification`) |
| POST | `/api/owner/reviews/{reviewId}/verify` | Body opsional: `occupancy_id?`, `override_reason?` (15–500, wajib bila nama tidak cocok). Hasil: `published` + `verified` |
| POST | `/api/owner/reviews/{reviewId}/reject` | Body: `reason`. Hasil: `owner_rejected`. Tidak bisa pada review yang sudah published |
| POST | `/api/owner/reviews/{reviewId}/reply` | Body: `reply` (5–1000, tanpa tautan/telepon). Hanya review `published` |

### 5.8 Langganan

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/owner/subscription/plans` | Paket aktif |
| GET | `/api/owner/subscription` | Langganan aktif (atau `null`), paket, dan 20 riwayat pembayaran terakhir |
| POST | `/api/owner/subscription/payment` | Body: `plan_id`, `payment_method` (2–50), `payment_amount` (harus sama dengan harga paket), `payment_proof?`. 409 bila masih ada pembayaran pending |

### 5.9 Keuangan

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/owner/finances` | Query: `from?`, `to?`, `category?`, `record_type?`, `kost_id?`, `room_id?`, `page`, `limit` |
| POST | `/api/owner/finances` | Body: `record_type` (`income`/`expense`), `category` (2–60), `amount` (>0), `transaction_date`, `description?` (≤500), `kost_id?`, `room_id?` |
| GET | `/api/owner/finances/{id}` | Detail |
| PATCH | `/api/owner/finances/{id}` | Ubah (min. satu field) |
| DELETE | `/api/owner/finances/{id}` | Hapus |
| GET | `/api/owner/finances/summary` | Query: `from?`, `to?`, `kost_id?`. Respons: `totals` (`income`, `expense`, `balance`, `income_count`, `expense_count`), `monthly[]` (`month`, `income`, `expense`, `balance`), `categories[]` (`category`, `recordType`, `total`, `count`), `period` |

### 5.10 Notifikasi

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/owner/notifications` | Query: `unread_only?`, `page`, `limit` |
| PATCH | `/api/owner/notifications/{id}/read` | Tandai satu dibaca |
| POST | `/api/owner/notifications/read-all` | Tandai semua dibaca |

Tipe notifikasi: `listing_pending`, `listing_published`, `listing_rejected`, `review_pending`, `review_override`, `subscription_approved`, `subscription_rejected`, `subscription_payment_pending`.

---

## 6. Endpoint Admin (`/api/admin/*`, peran `admin`)

Tanpa sesi → 401; sesi pemilik → 403.

### 6.1 Dashboard dan sistem

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/admin/dashboard` | Query `days` (1–365, default 30). Respons: `totals` (`owners`, `listings`, `rooms`, `reviews`, `activeSubscriptions`), `pending` (`reviews`, `listings`, `owners`), `growth` (`period_days`, `series[]` per hari: `date`, `owners`, `listings`, `reviews`) |
| GET | `/api/admin/health` | Status database dan versi PostGIS |
| GET | `/api/admin/logs` | Audit log. Query: `admin_id?`, `entity_type?`, `action?`, `page`, `limit`. Entri memuat `before`/`after` bila ada |
| POST | `/api/admin/users/{id}/revoke-sessions` | Paksa keluar seluruh sesi pengguna |

### 6.2 Pemilik

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/admin/owners` | Query: `q?`, `approval_status?`, `page`, `limit` |
| GET | `/api/admin/owners/{id}` | Detail (id = ID user) |
| POST | `/api/admin/owners/{id}/approve` | Setujui |
| POST | `/api/admin/owners/{id}/reject` | Body: `reason` (5–500). Sesi pemilik dicabut dan listing published diarsipkan |
| PATCH | `/api/admin/owners/{id}/status` | Body: `status` (`pending`/`approved`/`rejected`/`suspended`), `reason?` (wajib ≥5 untuk `rejected`/`suspended`) |

### 6.3 Listing

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/admin/listings` | Query: `q?`, `status?`, `owner_id?`, `page`, `limit` |
| GET | `/api/admin/listings/{id}` | Detail |
| POST | `/api/admin/listings/{id}/approve` | Publish. Ditolak 403 bila pemilik belum `approved`, 409 bila sudah published atau terhapus. Notifikasi ke pemilik |
| POST | `/api/admin/listings/{id}/reject` | Body: `reason` (5–500). Notifikasi ke pemilik |
| PATCH | `/api/admin/listings/{id}/status` | Body: `status`, `reason?` (wajib untuk `rejected`). `published` juga mensyaratkan pemilik `approved` |

### 6.4 Ulasan

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/admin/reviews` | Query: `publication_status?` (`pending`/`published`/`rejected`/`hidden`), `verification_status?`, `kost_id?`, `q?`, `is_flagged?` (`true`), `page`, `limit`. Item memuat `isFlagged` dan `flagReason` |
| GET | `/api/admin/reviews/{id}` | Detail |
| POST | `/api/admin/reviews/{id}/publish` | Body opsional `{ reason? }` |
| POST | `/api/admin/reviews/{id}/verify` | Verifikasi + publish, body opsional (`occupancy_id?`, `override_reason?`) |
| POST | `/api/admin/reviews/{id}/reject` | Body: `reason` (5–500) |
| POST | `/api/admin/reviews/{id}/hide` | Body: `reason` (5–500) |
| POST | `/api/admin/reviews/{id}/override-owner-reject` | Body: `action` (`publish`/`reject`), `reason` (10–500). Hanya untuk review berstatus `owner_rejected` (409 selain itu). Memberi notifikasi ke pemilik |

### 6.5 Langganan

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/admin/subscription-plans` | Daftar semua paket (aktif dan nonaktif) |
| POST | `/api/admin/subscription-plans` | Body: `code` (huruf kecil/angka/strip, 2–40), `name` (2–100), `description?`, `price` (≥0), `duration_days` (1–3650), `max_listings?` (0–10000, `null` = tanpa batas), `features?` (teks ≤2000), `is_active` (default true) |
| PATCH | `/api/admin/subscription-plans/{id}` | Ubah (min. satu field) |
| DELETE | `/api/admin/subscription-plans/{id}` | Hapus paket |
| GET | `/api/admin/subscription-payments` | Query: `status?` (`pending`/`approved`/`rejected`), `owner_id?`, `page`, `limit` |
| POST | `/api/admin/subscription-payments/{id}/approve` | Aktifkan atau perpanjang langganan. 409 bila sudah diproses |
| POST | `/api/admin/subscription-payments/{id}/reject` | Body: `reason` (5–500) |
| GET | `/api/admin/subscriptions` | Daftar langganan pemilik, paginasi |

---

## 7. Endpoint Sistem

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/health` | Publik. Hanya `{ "status": "ok" }` (cek hidup, tanpa detail internal) |

---

## 8. Referensi Enum

| Enum | Nilai |
| --- | --- |
| Peran (`role`) | `owner`, `admin` |
| Status pemilik | `pending`, `approved`, `rejected`, `suspended` |
| Status listing | `draft`, `pending`, `published`, `rejected`, `archived` |
| Kebijakan gender | `male`, `female`, `mixed` |
| Status kamar | `available`, `occupied`, `unavailable` |
| Status penghuni | `active`, `completed`, `cancelled` |
| Status verifikasi ulasan | `unmatched`, `possible_match`, `ambiguous`, `verified`, `rejected` |
| Status publikasi ulasan | `pending`, `published`, `rejected`, `hidden`, `owner_rejected` |
| Jenis catatan keuangan | `income`, `expense` |
| Status langganan | `pending`, `active`, `expired`, `cancelled` |
| Status pembayaran | `pending`, `approved`, `rejected` |

---

## 9. Catatan Penting Sebelum Rilis dan Celah yang Diketahui

Bagian ini jujur tentang kondisi kode saat ini. Item bertanda **BLOKIR** harus selesai sebelum pengguna sungguhan memakai aplikasi.

| # | Prioritas | Catatan | Dampak pada frontend/produk |
| --- | --- | --- | --- |
| 1 | **BLOKIR** | Pengirim email default `onboarding@resend.dev` (mode uji Resend) hanya bisa mengirim ke pemilik akun Resend. Verifikasi domain pengirim di Resend dan ubah `EMAIL_FROM` | Karena email wajib diverifikasi, pemilik baru tidak akan menerima email dan tidak bisa login; reset password juga gagal |
| 2 | **BLOKIR** | Data scraping dengan nomor telepon sudah dihapus dari versi terbaru repo, tetapi **masih ada di riwayat git**. Jalankan panduan `docs/PURGE-HISTORY.md` | Risiko privasi dan hukum, bukan masalah tampilan |
| 3 | Tinggi | Antrean "review ditolak pemilik" tidak bisa difilter admin: `GET /api/admin/reviews` belum menerima `publication_status=owner_rejected`, padahal override hanya berlaku untuk status itu | Frontend admin tidak dapat menampilkan antrean override sampai backend memperbaikinya. Sementara, admin hanya bisa membuka review lewat ID |
| 4 | Sedang | Admin menerima notifikasi (pembayaran, listing perlu verifikasi ulang) tetapi **belum ada endpoint notifikasi untuk admin** (`/api/owner/notifications` khusus pemilik) | Lonceng notifikasi admin belum bisa dibuat. Gunakan hitungan `pending` dari `/api/admin/dashboard` sebagai pengganti |
| 5 | Sedang | Tidak ada endpoint ringkasan dashboard pemilik | Dashboard pemilik harus menyusun data dari beberapa endpoint (lihat dokumen dashboard) atau backend menambah `GET /api/owner/dashboard` |
| 6 | Sedang | Batas login global per email (30 gagal/jam) berlaku untuk semua IP. Orang lain dapat sengaja mengunci login seseorang (termasuk admin) selama sekitar 1 jam | Tampilkan pesan 429 dengan hitung mundur dari `Retry-After`. Disarankan menambah Turnstile pada login |
| 7 | Sedang | Batas login dihitung **setelah** respons; ribuan percobaan paralel dalam hitungan detik dapat lolos sebelum terhitung | Tidak terlihat di UI; perbaikan di backend |
| 8 | Sedang | Admin belum memiliki autentikasi dua langkah (MFA) | Rencanakan halaman setup 2FA admin bila backend menambahkannya |
| 9 | Rendah | Foto per listing dibatasi **10** (sebelumnya 50) | Tampilkan batas ini di UI unggah |
| 10 | Rendah | Kunci API Resend pernah dibagikan lewat chat; perlu **dirotasi** | Operasional |
| 11 | Info | Nama endpoint reset password dan verifikasi mengikuti Better Auth 1.7.25; konfirmasi saat integrasi | Lihat Bagian 3 |

Tes otomatis yang tercatat oleh tim: 49/49 lulus. Saya tidak dapat menjalankan ulang tes tersebut di lingkungan audit (paket tidak dapat dipasang dan tidak ada database uji), jadi angka itu belum diverifikasi independen.
