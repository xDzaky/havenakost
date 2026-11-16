# API Endpoints

Base URL development: `http://localhost:3000`.

Public search dan nearby search dibatasi 120 request/menit/IP. Submit review
dibatasi 5/jam/IP dan 3/jam/token.

Autentikasi memakai cookie session Better Auth. Untuk request dari client,
sertakan cookie hasil login (`credentials: "include"` pada fetch). Endpoint
owner/admin mengembalikan `401` bila belum login, `403` bila role salah.

Semua response memakai format standar:

```json
{ "success": true, "message": "Request berhasil", "data": {}, "meta": null }
```

```json
{ "success": false, "message": "Terjadi kesalahan", "errors": null }
```

Pagination memakai `?page=1&limit=20`. `limit` maksimal 100.

---

## Auth

Better Auth menangani seluruh flow di `/api/auth/*`.

| Method | Path | Keterangan |
| --- | --- | --- |
| POST | `/api/auth/sign-up/email` | Registrasi owner (role selalu `owner`) |
| POST | `/api/auth/sign-in/email` | Login email/password |
| POST | `/api/auth/sign-out` | Logout |
| GET | `/api/auth/get-session` | Session aktif |

Contoh registrasi:

```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"Password123!","name":"Pemilik Kost"}'
```

Field `role` tidak diterima. Role admin hanya dibuat melalui script bootstrap:

```bash
ADMIN_BOOTSTRAP_EMAIL=admin@example.com \
ADMIN_BOOTSTRAP_PASSWORD='password-panjang-aman' \
npm run admin:create
```

## Health

`GET /api/health` → status database + versi PostGIS.

---

## Public (tanpa login)

### `GET /api/public/kost`

Query:

| Param | Keterangan |
| --- | --- |
| `page`, `limit` | Pagination |
| `q` | Cari nama/alamat |
| `city`, `district` | Filter kota/kecamatan |
| `gender_policy` | `male`, `female`, `mixed` |
| `price_min`, `price_max` | Filter irisan harga |
| `facility` | UUID fasilitas; boleh diulang atau dipisah koma |
| `available` | `true` untuk listing yang punya kamar available |
| `sort` | `newest`, `price_asc`, `price_desc`, `distance` |
| `latitude`, `longitude` | Wajib berpasangan untuk filter radius |
| `radius` | Meter, default 5000, maksimal 50000 |

Contoh:

```bash
curl "http://localhost:3000/api/public/kost?city=Kota%20Malang&price_max=1500000&sort=price_asc"
curl "http://localhost:3000/api/public/kost?latitude=-7.9412&longitude=112.6201&radius=3000&sort=distance"
```

Response data berisi kartu listing publik (nama, slug, alamat, koordinat,
harga, gender policy, kontak, cover, rating rata-rata, jumlah review, jumlah
kamar). `meta` berisi `page/limit/total/totalPages/hasNext/hasPrev`.

### `GET /api/public/kost/{slug}`

Detail listing published: data listing, owner business name, foto, fasilitas,
kamar publik, ringkasan rating per kamar, dan 5 review terbaru yang published.
Tidak pernah mengembalikan data penghuni.

### `GET /api/public/kost/{slug}/rooms`

Daftar kamar publik: `room_code`, `room_name`, `description`,
`monthly_price`, `room_status`. Tanpa token QR dan tanpa data penghuni.

### `GET /api/public/kost/{slug}/reviews`

Query: `page`, `limit`, `room_id`. Hanya review `published`.

### `GET /api/public/review/{token}`

Validasi token QR. Response:

```json
{
  "success": true,
  "data": {
    "kost": { "name": "Kost Havena", "slug": "...", "address": "...", "district": "...", "city": "..." },
    "room": { "roomCode": "A01", "roomName": "Kamar A01" },
    "form": {
      "rating_min": 1,
      "rating_max": 5,
      "turnstile_site_key": "..."
    }
  }
}
```

QR nonaktif/tidak dikenal → `404`. Kost tidak published → `409`.

### `POST /api/public/reviews`

Body:

```json
{
  "qr_token": "token-dari-qr",
  "reviewer_name": "Budi Santoso",
  "public_display_name": "Budi S.",
  "claimed_check_in_date": "2026-01-05",
  "claimed_check_out_date": "2026-06-05",
  "rating": 5,
  "comment": "Kost bersih dan pemilik responsif.",
  "turnstile_token": "token-turnstile"
}
```

`room_id` tidak diterima dari client; kamar ditentukan oleh `qr_token`.
Server memvalidasi Turnstile, rate limit, QR aktif, dan status listing.
Response `201` hanya berisi `id`, `publication_status: "pending"`, dan pesan.
Hasil pencocokan occupancy **tidak** dikembalikan ke pengunjung.

### `GET /api/public/locations/search`

Sama seperti `/api/public/kost`, tetapi `latitude` dan `longitude` wajib,
`sort` dipaksa `distance`, dan `meta` memuat `radius_meters` + `center`.

### `GET /api/public/facilities`

Katalog fasilitas untuk filter.

### `GET /api/public/photos?key=kosts/...`

Proxy foto bucket privat. Hanya melayani foto milik listing published.

---

## Owner (role `owner`)

### Profil

| Method | Path |
| --- | --- |
| GET | `/api/owner/profile` |
| PATCH | `/api/owner/profile` |

PATCH body: `full_name`, `business_name`, `phone`, `address`, `profile_photo`.
Field `role`/`approval_status` ditolak.

### Listing

| Method | Path |
| --- | --- |
| GET | `/api/owner/listings?page=&limit=&status=&q=` |
| POST | `/api/owner/listings` |
| GET | `/api/owner/listings/{id}` |
| PATCH | `/api/owner/listings/{id}` |
| DELETE | `/api/owner/listings/{id}` |

POST body:

```json
{
  "name": "Kost Havena Lowokwaru",
  "description": "Deskripsi minimal 20 karakter...",
  "address": "Jl. Soekarno Hatta No. 10",
  "province": "Jawa Timur",
  "city": "Kota Malang",
  "district": "Lowokwaru",
  "subdistrict": "Tulusrejo",
  "postal_code": "65141",
  "latitude": -7.9412,
  "longitude": 112.6201,
  "gender_policy": "mixed",
  "price_min": 700000,
  "price_max": 1500000,
  "contact_phone": "6281234567890",
  "facility_ids": ["uuid-fasilitas"]
}
```

Listing baru selalu `draft`. Untuk mengajukan review admin:

```json
{ "status": "pending" }
```

Owner harus `approved`. Owner tidak bisa set `published`/`rejected`; itu
wewenang admin. DELETE = soft delete + status `archived`.

### Fasilitas listing

| Method | Path |
| --- | --- |
| GET | `/api/owner/listings/{id}/facilities` |
| PUT | `/api/owner/listings/{id}/facilities` |

PUT body: `{ "facility_ids": ["uuid", "uuid"] }` (replace seluruh relasi).

### Foto

| Method | Path |
| --- | --- |
| POST | `/api/owner/listings/{id}/photos/presign` |
| POST | `/api/owner/listings/{id}/photos/confirm` |
| PATCH | `/api/owner/photos/{photoId}` |
| DELETE | `/api/owner/photos/{photoId}` |

Presign body:

```json
{ "filename": "depan.jpg", "content_type": "image/jpeg", "size": 350000 }
```

Response: `objectKey`, `uploadUrl` (berlaku 300 detik), `expiresIn`, `headers`.
Upload langsung ke R2 memakai `PUT` + headers tersebut, lalu:

```json
{
  "object_key": "kosts/{kostId}/{uuid}.jpg",
  "alt_text": "Tampak depan",
  "is_cover": true,
  "sort_order": 0
}
```

Tipe yang diizinkan: JPEG/PNG/WebP, maksimal 10 MB, maksimal 50 foto/listing.

### Kamar

| Method | Path |
| --- | --- |
| GET | `/api/owner/listings/{id}/rooms` |
| POST | `/api/owner/listings/{id}/rooms` |
| GET | `/api/owner/rooms/{roomId}` |
| PATCH | `/api/owner/rooms/{roomId}` |
| DELETE | `/api/owner/rooms/{roomId}` |

Body kamar: `room_code`, `room_name`, `description`, `monthly_price`,
`room_status`. Kamar yang punya riwayat occupancy/review tidak bisa dihapus;
ubah menjadi `unavailable`.

### QR kamar

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/owner/rooms/{roomId}/qr` | JSON token, URL, data URL PNG, SVG |
| GET | `/api/owner/rooms/{roomId}/qr?format=png` | Download PNG |
| GET | `/api/owner/rooms/{roomId}/qr?format=svg` | Download SVG |
| POST | `/api/owner/rooms/{roomId}/qr` | Buat QR pertama kali |
| DELETE | `/api/owner/rooms/{roomId}/qr` | Nonaktifkan token |
| POST | `/api/owner/rooms/{roomId}/qr/regenerate` | Token baru, token lama invalid |

### Penghuni (privat)

| Method | Path |
| --- | --- |
| GET | `/api/owner/rooms/{roomId}/occupancies?page=&limit=&status=` |
| POST | `/api/owner/rooms/{roomId}/occupancies` |
| PATCH | `/api/owner/occupancies/{occupancyId}` |
| DELETE | `/api/owner/occupancies/{occupancyId}` |

POST body:

```json
{
  "tenant_name": "Budi Santoso",
  "check_in_date": "2026-01-01",
  "check_out_date": null,
  "occupancy_status": "active",
  "notes": "Kamar A01"
}
```

Data ini tidak pernah keluar melalui endpoint publik.

### Review

| Method | Path |
| --- | --- |
| GET | `/api/owner/reviews?publication_status=&verification_status=&kost_id=&room_id=` |
| GET | `/api/owner/reviews/{reviewId}` |
| POST | `/api/owner/reviews/{reviewId}/verify` |
| POST | `/api/owner/reviews/{reviewId}/reject` |

Verify body opsional: `{ "occupancy_id": "uuid" }`. Bila kosong, memakai
`matched_occupancy_id` hasil pencocokan. Reject wajib:

```json
{ "reason": "Nama dan periode tidak cocok dengan data penghuni." }
```

Pemilik tidak bisa mengubah rating/komentar, dan tidak bisa menolak review
yang sudah published (moderasi hanya admin).

### Keuangan

| Method | Path |
| --- | --- |
| GET | `/api/owner/finances?from=&to=&category=&record_type=&kost_id=&room_id=&page=&limit=` |
| POST | `/api/owner/finances` |
| GET | `/api/owner/finances/{id}` |
| PATCH | `/api/owner/finances/{id}` |
| DELETE | `/api/owner/finances/{id}` |
| GET | `/api/owner/finances/summary?from=&to=&kost_id=` |

POST body:

```json
{
  "kost_id": "uuid",
  "room_id": "uuid",
  "record_type": "income",
  "category": "Sewa kamar",
  "description": "Sewa Januari",
  "amount": 850000,
  "transaction_date": "2026-01-10"
}
```

Summary mengembalikan `totals` (income/expense/balance), `monthly`, dan
`categories`. Amount disimpan `numeric`, bukan float.

### Notifikasi

| Method | Path |
| --- | --- |
| GET | `/api/owner/notifications?unread_only=true` |
| PATCH | `/api/owner/notifications/{id}/read` |
| POST | `/api/owner/notifications/read-all` |

### Langganan

| Method | Path |
| --- | --- |
| GET | `/api/owner/subscription` |
| GET | `/api/owner/subscription/plans` |
| POST | `/api/owner/subscription/payment` |

Payment body:

```json
{
  "plan_id": "uuid",
  "payment_method": "transfer",
  "payment_amount": 50000,
  "payment_proof": "https://... atau object key"
}
```

Nominal harus sama dengan harga paket. Status tetap `pending` sampai admin
menyetujui. Tidak ada payment gateway.

---

## Admin (role `admin`)

### Dashboard

`GET /api/admin/dashboard?days=30`

Berisi total owner/listing/kamar/review/langganan aktif, jumlah pending
(owner/listing/review), dan series pertumbuhan harian.

### Owner

| Method | Path |
| --- | --- |
| GET | `/api/admin/owners?q=&approval_status=&page=&limit=` |
| GET | `/api/admin/owners/{id}` |
| POST | `/api/admin/owners/{id}/approve` |
| POST | `/api/admin/owners/{id}/reject` |
| PATCH | `/api/admin/owners/{id}/status` |

Reject body: `{ "reason": "..." }`.
Status body: `{ "status": "approved|rejected|suspended|pending", "reason": "..." }`.
Reject/suspend mewajibkan alasan dan mengarsipkan listing published milik owner.

### Listing

| Method | Path |
| --- | --- |
| GET | `/api/admin/listings?q=&status=&owner_id=&page=&limit=` |
| GET | `/api/admin/listings/{id}` |
| POST | `/api/admin/listings/{id}/approve` |
| POST | `/api/admin/listings/{id}/reject` |
| PATCH | `/api/admin/listings/{id}/status` |

Approve → `published` + `verified_at`. Reject wajib alasan.

### Review

| Method | Path |
| --- | --- |
| GET | `/api/admin/reviews?publication_status=&verification_status=&kost_id=&q=` |
| GET | `/api/admin/reviews/{id}` |
| POST | `/api/admin/reviews/{id}/publish` |
| POST | `/api/admin/reviews/{id}/hide` |
| POST | `/api/admin/reviews/{id}/verify` |
| POST | `/api/admin/reviews/{id}/reject` |

Publish body opsional `{ "reason": "..." }`. Hide/reject wajib
`{ "reason": "..." }`. Verify body opsional `{ "occupancy_id": "uuid" }`.
Semua aksi dicatat di `admin_logs`.

### Langganan

| Method | Path |
| --- | --- |
| GET | `/api/admin/subscriptions` |
| GET | `/api/admin/subscription-payments?status=&owner_id=` |
| GET | `/api/admin/subscription-plans` |
| POST | `/api/admin/subscription-plans` |
| PATCH | `/api/admin/subscription-plans/{id}` |
| DELETE | `/api/admin/subscription-plans/{id}` |
| POST | `/api/admin/subscription-payments/{id}/approve` |
| POST | `/api/admin/subscription-payments/{id}/reject` |

Plan body:

```json
{
  "code": "basic",
  "name": "Paket Basic",
  "price": 50000,
  "duration_days": 30,
  "max_listings": 1,
  "features": "1 listing, QR kamar",
  "is_active": true
}
```

Approve payment membuat/memperpanjang `owner_subscriptions` dan mencatat
`subscription_id` pada payment. Reject wajib alasan.

### Audit log

`GET /api/admin/logs?admin_id=&entity_type=&action=&page=&limit=`

Metadata sensitif tidak disimpan.

---

## Status Code

| Code | Arti |
| --- | --- |
| 200 | OK |
| 201 | Created |
| 400 | Body/query tidak valid secara format |
| 401 | Belum login |
| 403 | Role/approval tidak memenuhi |
| 404 | Tidak ditemukan / milik owner lain |
| 409 | Konflik (duplikat, status sudah diproses, occupancy sudah dipakai) |
| 422 | Validasi Zod gagal |
| 429 | Rate limit |
| 500 | Error server (detail tidak dibocorkan) |
| 502/503 | Layanan eksternal (Turnstile/R2/DB) bermasalah |
