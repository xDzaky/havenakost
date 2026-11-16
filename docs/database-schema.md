# Skema Database

Database: Neon PostgreSQL 17 + PostGIS 3.5.

Semua tabel transaksi memakai UUID (`gen_random_uuid()`) kecuali tabel Better
Auth yang memakai ID text dari Better Auth. Timestamp memakai
`timestamp with time zone`.

## Tabel Better Auth

| Tabel | Kolom penting |
| --- | --- |
| `user` | `id`, `name`, `email` (unik), `email_verified`, `image`, `role`, `created_at`, `updated_at` |
| `session` | `id`, `token` (unik), `expires_at`, `ip_address`, `user_agent`, `user_id`, timestamps |
| `account` | `id`, `account_id`, `provider_id`, `user_id`, `password` (hash), token OAuth opsional |
| `verification` | `id`, `identifier`, `value`, `expires_at`, timestamps |

`role` bertipe enum `owner | admin`, default `owner`. Field ini
`input: false` di Better Auth sehingga tidak bisa diisi saat registrasi, dan
tidak ada endpoint untuk mengubahnya.

## Tabel Aplikasi

### `owner_profiles`

Satu baris per owner. Dibuat otomatis oleh hook Better Auth dan/atau
`ensureOwnerProfile`.

- `user_id` unik, FK ke `user`.
- `full_name`, `business_name`, `phone`, `address`, `profile_photo`.
- `approval_status`: `pending | approved | rejected | suspended`.
- `rejection_reason`, `verified_at`, timestamps.

Owner baru berstatus `pending`. Hanya owner `approved` yang boleh mengajukan
listing untuk publikasi.

### `kost_listings`

- `owner_id` FK ke `user` (restrict).
- `name`, `slug` (unik), `description`, alamat lengkap.
- `location geography(Point,4326)` diisi trigger dari `latitude`/`longitude`.
- `gender_policy`: `male | female | mixed`.
- `price_min`, `price_max` (integer rupiah).
- `contact_phone` format `62...`.
- `status`: `draft | pending | published | rejected | archived`.
- `rejection_reason`, `verified_at`, `deleted_at` (soft delete).
- Index: owner, status, city, district, deleted_at, slug unik, GiST location.

### `facilities` dan `kost_listing_facilities`

Katalog fasilitas reusable (WiFi, AC, parkir, dll.) dan pivot many-to-many.
Pivot memakai unique gabungan `(kost_id, facility_id)`.

### `kost_photos`

- `kost_id`, `object_key` (unik), `image_url`, `alt_text`, `sort_order`,
  `is_cover`, `created_at`.
- Partial unique index `kost_photos_one_cover_per_kost` memastikan hanya satu
  cover per listing.

### `kost_rooms`

Merepresentasikan kamar fisik (A01, A02, ...), bukan kategori.

- `room_code` unik per listing.
- `monthly_price numeric(12,2)`.
- `room_status`: `available | occupied | unavailable`.
- `qr_public_token` unik dan acak, `qr_enabled`.
- Satu kamar = satu QR; QR dapat dinonaktifkan/di-regenerate.

### `room_occupancies`

Data privat penghuni.

- `kost_id`, `room_id`, `tenant_name`, `check_in_date`, `check_out_date`,
  `occupancy_status` (`active | completed | cancelled`), `notes`.
- Tidak pernah diekspos melalui endpoint publik.
- Partial unique index `room_occupancies_one_active_per_room` memastikan hanya
  satu occupancy `active` per kamar, termasuk saat ada request bersamaan.

### `reviews`

- `kost_id`, `room_id`, `matched_occupancy_id`, `verified_occupancy_id`.
- `reviewer_name`, `public_display_name`, tanggal klaim tinggal.
- `rating` 1–5 (CHECK), `comment`.
- `verification_status`: `unmatched | possible_match | ambiguous | verified | rejected`.
- `publication_status`: `pending | published | rejected | hidden`.
- `owner_reviewed_by/at`, `rejection_reason`.
- `moderated_by/at`, `moderation_reason` untuk aksi admin.
- Partial unique index `reviews_verified_occupancy_unique` mencegah satu
  occupancy dipakai untuk dua review terverifikasi.

### `financial_records`

- `owner_id`, `kost_id` (opsional), `room_id` (opsional).
- `record_type`: `income | expense`.
- `category`, `description`, `amount numeric(14,2)`, `transaction_date`.
- CHECK amount > 0. Index owner dan tanggal.

### `notifications`

Notifikasi in-app: `recipient_user_id`, `type`, `title`, `message`,
`related_entity_type/id`, `is_read`, `read_at`, `created_at`.

### `subscription_plans`

Paket yang dikonfigurasi admin: `code` unik, `name`, `price`,
`duration_days`, `max_listings`, `features`, `is_active`. Tidak ada harga
default yang dikarang di seed.

### `owner_subscriptions`

`owner_id`, `plan_id`, `start_date`, `end_date`, `status`
(`pending | active | expired | cancelled`). Partial unique index memastikan
satu langganan aktif per owner.

### `subscription_payments`

Pengajuan pembayaran manual: `owner_id`, `plan_id`, `subscription_id`,
`payment_method`, `payment_amount`, `payment_proof`, `status`
(`pending | approved | rejected`), `reviewed_by/at`, `rejection_reason`.

### `admin_logs`

Audit tindakan admin: `admin_id`, `action`, `entity_type`, `entity_id`,
`description`, `metadata jsonb`, `created_at`. Metadata dibersihkan dari field
sensitif (password/token/secret) sebelum disimpan.

### `rate_limit_buckets`

`key` (HMAC), `window_start`, `count`, `expires_at`. Bukan data pribadi.

## Relasi

```
user
├── owner_profiles (1:1)
├── kost_listings (1:N)
│   ├── kost_photos (1:N)
│   ├── kost_listing_facilities (N:M ke facilities)
│   ├── kost_rooms (1:N)
│   │   ├── room_occupancies (1:N)
│   │   └── reviews (1:N)
│   └── financial_records (1:N, opsional)
├── notifications (1:N)
├── owner_subscriptions (1:N) ── subscription_payments
└── admin_logs (1:N)
```

## Migration

```
drizzle/
  0000_reflective_vapor.sql  # tabel + enum + constraint + index
  0001_postgis_location.sql  # PostGIS, trigger, GiST, backfill
  0002_slim_sersi.sql        # unique active occupancy per kamar
  meta/
```

Menjalankan:

```bash
npm run db:generate   # setelah mengubah schema
npm run db:migrate    # apply ke DATABASE_URL
npm run test:db:migrate
```

Jangan memakai `drizzle-kit push` untuk produksi. Migration harus versioned
dan tidak destruktif. Penghapusan listing memakai soft delete (`deleted_at`).

## Catatan PostGIS

- Extension dibuat di migration pertama: `CREATE EXTENSION IF NOT EXISTS postgis`.
- `location` bertipe `geography(Point,4326)`.
- Trigger `BEFORE INSERT OR UPDATE OF latitude, longitude` mengisi location.
- GiST index `kost_listings_location_gist`.
- Pencarian radius memakai `ST_DWithin`, pengurutan memakai `ST_Distance`
  (meter), dengan urutan `ST_MakePoint(longitude, latitude)`.
