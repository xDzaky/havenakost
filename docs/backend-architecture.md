# Arsitektur Backend Havena Kost

Backend berada di dalam project Next.js App Router dan hanya menangani API
(dashboard/frontend belum termasuk pada tahap ini).

## Stack

| Bagian | Teknologi |
| --- | --- |
| Framework | Next.js 16 App Router + TypeScript strict |
| Database | Neon PostgreSQL + PostGIS |
| ORM | Drizzle ORM + Drizzle Kit |
| Driver | `postgres.js` (interactive transaction) |
| Auth | Better Auth (email/password, session, role) |
| Storage | Cloudflare R2 via AWS SDK v3 + presigned URL |
| Anti-spam | Cloudflare Turnstile + rate limit database |
| Validasi | Zod |
| QR | package `qrcode` |
| Test | Vitest (unit + integration ke database test) |

## Struktur

```
src/
  app/api/
    auth/[...all]/route.ts        # handler Better Auth
    health/route.ts               # health check DB + PostGIS
    public/                       # endpoint tanpa login
      kost/
      review/[token]/
      reviews/
      locations/search/
      facilities/
      photos/                     # proxy foto bucket privat
    owner/                        # wajib session role owner
      profile/
      listings/
      rooms/
      occupancies/
      reviews/
      finances/
      notifications/
      subscription/
    admin/                        # wajib session role admin
      dashboard/
      owners/
      listings/
      reviews/
      subscriptions/
      subscription-plans/
      subscription-payments/
      logs/
  lib/
    auth/          # konfigurasi Better Auth, session, guard route
    db/            # koneksi + schema Drizzle
    services/      # business logic per domain
    validators/    # schema Zod
    security/      # ownership, rate limit, Turnstile, permission
    storage/       # R2 client + presigned URL
    utils/         # response, error, pagination, slug, QR, geo
drizzle/           # migration SQL versioned
scripts/           # seed, bootstrap admin, migrate test DB
tests/             # integration test API
docs/              # dokumentasi ini
```

## Lapisan dan Tanggung Jawab

1. **API layer** (`app/api/**/route.ts`)
   Hanya membaca request, memvalidasi params/query/body, memanggil service,
   dan mengembalikan response standar. Tidak ada query database di route.
2. **Auth layer** (`lib/auth`)
   Konfigurasi Better Auth, `requireAuth`, `requireOwner`, `requireAdmin`,
   `requireApprovedOwner`, dan wrapper `ownerRoute`/`adminRoute`.
3. **Validation layer** (`lib/validators`)
   Semua input divalidasi Zod. Schema memakai `.strict()` untuk mencegah mass
   assignment (mis. `role`, `status`, `owner_id` tidak diterima dari client).
4. **Service layer** (`lib/services`)
   Business logic, transaksi, ownership check, audit log, notifikasi.
5. **Database layer** (`lib/db`)
   Schema Drizzle dan koneksi. Raw SQL hanya untuk PostGIS dan agregasi yang
   tidak nyaman diekspresikan lewat query builder; selalu parameterized.
6. **Security layer** (`lib/security`)
   Cek kepemilikan, permission map, Turnstile siteverify, rate limit HMAC.
7. **Storage layer** (`lib/storage/r2.ts`)
   Presigned PUT, HEAD object, GET proxy, DELETE object.

## Prinsip Keamanan

- Semua endpoint owner/admin memvalidasi session dan role di server.
- Query owner selalu memfilter `owner_id`/join ke `kost_listings.owner_id`.
  Resource milik owner lain mengembalikan **404**, bukan 403, agar keberadaan
  data tidak bocor.
- Pemilik tidak bisa mengubah `role`, `approval_status`, `status` listing
  (selain draft/pending/archived), rating, atau komentar review.
- Review publik wajib melewati Turnstile di server dan rate limit.
- Error database, SQL, stack trace, dan credential tidak pernah dikirim ke
  client.
- Secret hanya ada di `.env` server; `.env` masuk `.gitignore`.

## Keputusan Teknis Penting

### postgres.js, bukan driver HTTP Neon

Alur verifikasi review dan approval langganan membutuhkan transaksi dan row
lock (`SELECT ... FOR UPDATE`). `postgres.js` mendukung interactive transaction
dan tetap kompatibel dengan Neon pooled endpoint (`prepare: false`).

### `location` diisi trigger database

Aplikasi menyimpan `latitude`/`longitude`. Trigger
`havenakost_sync_kost_location_trigger` mengisi
`location geography(Point,4326)`. Ini mencegah koordinat dan geometry tidak
sinkron, termasuk saat update. Pencarian memakai `ST_DWithin` dan
`ST_Distance`, dengan GiST index.

### Bucket R2 privat + proxy foto

Bila `R2_PUBLIC_URL` kosong, `image_url` disimpan sebagai
`/api/public/photos?key=...`. Route proxy hanya melayani object milik listing
yang **published**, sehingga foto draft tidak bisa diakses publik. Bila bucket
dipasangi domain publik, isi `R2_PUBLIC_URL` agar URL langsung dipakai.

### Rate limit tanpa Redis

Tabel `rate_limit_buckets` menyimpan fixed window dengan key HMAC. IP mentah
tidak disimpan. Better Auth juga memiliki rate limit bawaan untuk
login/registrasi; route auth menambahkan limiter database per IP. Public search
dan nearby search dibatasi 120 request/menit/IP untuk melindungi query
PostGIS.

### Notifikasi in-app

Notifikasi disimpan di tabel `notifications`; frontend dapat polling
`GET /api/owner/notifications` dan menandai sudah dibaca.

## Response Standar

Sukses:

```json
{
  "success": true,
  "message": "Request berhasil",
  "data": {},
  "meta": null
}
```

Error:

```json
{
  "success": false,
  "message": "Data yang dikirim tidak valid",
  "errors": [{ "field": "rating", "message": "Rating maksimal 5" }]
}
```

Kode status yang dipakai: 200, 201, 400, 401, 403, 404, 409, 422, 429, 500,
502, 503.

## Batasan MVP

- Pembayaran langganan manual (tanpa payment gateway).
- Tidak ada layanan realtime berbayar; notifikasi memakai polling.
- Frontend halaman review (`/review/{token}`) belum dibuat pada tahap backend
  ini; backend sudah mengembalikan URL dan data form.
- Turnstile memakai site key dari environment; test hanya mengizinkan token
  `test-bypass` saat `NODE_ENV=test`.
