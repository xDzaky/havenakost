# Alur Verifikasi Review

Review hanya dapat dikirim melalui QR kamar fisik. QR bukan bukti identitas
dan bukan bukti bahwa pengunjung pernah tinggal di kost.

## 1. QR per kamar

1. Owner membuat kamar (`kost_rooms`).
2. `POST /api/owner/rooms/{roomId}/qr` membuat `qr_public_token` acak
   (32 byte, base64url) dan mengaktifkan QR.
3. Token menghasilkan URL `APP_BASE_URL/review/{token}`.
4. QR PNG/SVG dapat diunduh dan ditempel di kamar.
5. `DELETE .../qr` menonaktifkan token; review baru dengan token itu ditolak.
6. `POST .../qr/regenerate` membuat token baru; token lama langsung invalid.

Token tidak memberi akses ke data penghuni. `GET /api/public/review/{token}`
hanya mengembalikan nama kost, nama kamar, dan konfigurasi form.

## 2. Pengunjung mengirim review

`POST /api/public/reviews`:

1. Rate limit per IP (5/jam) dan per token (3/jam).
2. Validasi Turnstile ke `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
3. Validasi `qr_token` (ada, aktif, listing published).
4. Validasi Zod: nama, tanggal, rating 1–5, komentar 10–2000 karakter.
5. Backend mencari kandidat occupancy pada kamar tersebut.

`room_id` tidak diambil dari body. Pengunjung tidak bisa memilih kamar lain
atau melihat hasil pencocokan.

## 3. Pencocokan konservatif

Kandidat diambil dari `room_occupancies` dengan syarat:

- Kamar sama.
- Status bukan `cancelled`.
- Nama dinormalisasi (trim, case-insensitive, spasi dirapikan, tanda baca
  dihapus) **harus sama persis**.
- Periode tinggal overlap dengan periode klaim.
- Occupancy yang sudah dipakai review terverifikasi lain tidak dihitung.

Hasil:

| Jumlah kandidat | `verification_status` |
| --- | --- |
| 0 | `unmatched` |
| 1 | `possible_match` + `matched_occupancy_id` |
| >1 | `ambiguous` |

Review selalu masuk `publication_status = pending`. Sistem tidak pernah
otomatis published hanya karena nama cocok.

## 4. Notifikasi owner

Saat review dibuat, backend menyimpan notifikasi in-app untuk owner kost
(`type = review_pending`). Dashboard owner menampilkan review pending dan
kandidat occupancy pada kamar tersebut.

## 5. Verifikasi owner

`GET /api/owner/reviews/{id}` menampilkan review + `candidate_occupancies`
(termasuk penanda `already_used_for_verification`).

`POST /api/owner/reviews/{id}/verify`:

1. Transaksi + `SELECT ... FOR UPDATE` pada review.
2. Pastikan review milik kost owner.
3. Pastikan review belum published/verified dan tidak sedang hidden.
4. Pilih `occupancy_id` (body) atau `matched_occupancy_id`.
5. Pastikan occupancy berada di kamar/kost yang sama, tidak cancelled.
6. Pastikan occupancy belum dipakai review terverifikasi lain.
7. Set `verification_status = verified`, `publication_status = published`,
   `verified_occupancy_id`, `owner_reviewed_by/at`.
8. Partial unique index `reviews_verified_occupancy_unique` menjadi pengaman
   terakhir terhadap double approval.

Owner **tidak dapat** mengubah `rating` atau `comment`; tidak ada endpoint
untuk itu.

`POST /api/owner/reviews/{id}/reject` mewajibkan `reason`, lalu set
`verification_status = rejected`, `publication_status = rejected`.
Review yang sudah published tidak bisa ditolak owner.

## 6. Moderasi admin

- `POST /api/admin/reviews/{id}/publish` — publish (override).
- `POST /api/admin/reviews/{id}/hide` — sembunyikan, wajib alasan.
- `POST /api/admin/reviews/{id}/verify` — verifikasi + publish, opsional
  `occupancy_id`.
- `POST /api/admin/reviews/{id}/reject` — tolak, wajib alasan.

Semua aksi mencatat `moderated_by`, `moderated_at`, `moderation_reason`, dan
`admin_logs`. Review hidden tidak dihitung dalam rating publik.

## 7. Tampilan publik

Hanya `publication_status = published` yang tampil. Yang ditampilkan:

- Rating.
- Komentar.
- Nama tampilan publik (bukan nama lengkap data penghuni).
- Kamar terkait.
- Tanggal review.

Rating rata-rata dihitung dari review published saja. Review dikelompokkan per
kamar melalui `reviewSummary.byRoom` pada detail kost dan filter `room_id`
pada endpoint review publik.

## 8. Privasi data penghuni

`room_occupancies` tidak pernah diekspos ke endpoint publik. Owner hanya bisa
melihat occupancy pada kost miliknya; admin dapat melihat untuk kebutuhan
moderasi. Jangan membuat direktori penghuni atau endpoint publik yang
mengembalikan nama/telepon penghuni.
