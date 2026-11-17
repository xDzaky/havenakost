# Laporan Security & QA Backend Havena Kost

Nov 17, 2026 · @tsmp

## Ringkasan Eksekutif

Tidak ada kerentanan kritis yang saya temukan (tidak ada bypass login, SQL injection, atau kebocoran data lintas-akun), tetapi ada **3 celah prioritas tinggi** pada integritas ulasan dan keamanan akun, serta 9 temuan menengah dan 10 temuan rendah. Semua temuan berasal dari pembacaan kode (white-box); pengujian langsung ke produksi tidak bisa saya jalankan (lihat Ruang Lingkup), jadi beberapa temuan perlu kamu konfirmasi dengan perintah di bagian 7.

| Severity | Jumlah | Tema utama |
| --- | --- | --- |
| Kritis | 0 | - |
| Tinggi | 3 | Owner bisa menimpa moderasi admin, owner mengontrol verifikasi ulasan sendiri, akun admin tanpa MFA/reset/rate limit per akun |
| Menengah | 9 | Rate limit mudah dihabiskan atau dilewati, listing published bisa diubah tanpa review ulang, langganan tidak ditegakkan, upload foto, data pribadi |
| Rendah | 10 | Audit log, header keamanan, CSRF defense-in-depth, validasi, kebersihan kode |

**Lima hal yang sebaiknya diperbaiki lebih dulu:**

1. **H-1** Blokir owner memverifikasi ulang ulasan yang sudah ditolak/dimoderasi admin (perbaikan 3 baris di `review.service.ts`).
2. **H-3** Tambah rate limit per-email pada login, MFA untuk admin, dan pindahkan limiter Better Auth ke database.
3. **M-2** Urutkan ulang pengecekan di `POST /api/public/reviews` (Turnstile dan validasi token sebelum rate limit) agar kuota QR tidak bisa dihabiskan orang lain.
4. **M-3** Edit field sensitif pada listing `published` harus memicu review ulang admin.
5. **M-9** Pertimbangkan ulang dataset hasil scrape (berisi nomor telepon) yang ada di repo publik.

**Hasil verifikasi otomatis yang sudah saya jalankan:** 61 file `route.ts` diperiksa; 100% route `/api/owner/*` dan `/api/admin/*` memakai `ownerRoute`/`adminRoute` (0 yang terlewat), dan pemindaian pola secret pada working tree tidak menemukan kredensial.

## Ruang Lingkup, Metodologi, dan Keterbatasan

Audit ini mencakup seluruh 61 route handler, 12 service, 9 validator, skema Drizzle + 3 migrasi SQL, konfigurasi Better Auth, rate limiter, Turnstile, integrasi R2, `next.config.ts`, script (`create-admin`, `smoke-test`, `e2e-demo`), serta semua dokumen di `docs/`.

**Kerangka yang dipakai** (dari referensi yang kamu kirim): daftar periksa `security-and-hardening` dan `code-review-and-quality` (lima sumbu review) dari `addyosmani/agent-skills`; OWASP Top 10, ASVS, dan STRIDE dari artikel Snyk; serta pola *variant analysis* (menemukan bug serupa setelah satu bug ditemukan) dari Trail of Bits. Saya memakai metodologinya sebagai panduan, bukan memasang skill pihak ketiga ke lingkungan ini. Artikel Snyk sendiri memperingatkan risiko supply chain pada skill pihak ketiga.

**Keterbatasan yang perlu kamu ketahui:**

- **Tidak ada pengujian dinamis ke `havenakost.vercel.app`.** Egress sesi ini menolak host tersebut, jadi header respons, perilaku rate limit nyata, dan konfigurasi Vercel tidak terverifikasi.
- **Test suite tidak dijalankan.** Dependensi tidak bisa dipasang (jaringan paket nonaktif) dan `TEST_DATABASE_URL` tidak tersedia.
- **`npm audit`/CodeQL tidak dijalankan**, sehingga kerentanan di dependensi (Next 16.4.6, better-auth 1.7.25, dll.) belum diperiksa.

**Label keyakinan** pada tiap temuan: **\[Kode\]** = terbukti dari membaca kode, perilakunya hampir pasti; **\[Konfirmasi\]** = masuk akal dari kode tetapi sebaiknya kamu uji (lihat bagian 7).

## Yang Sudah Dikerjakan dengan Baik

Fondasi keamanan backend ini lebih rapi daripada kebanyakan MVP; bagian di bawah ini sebaiknya dipertahankan saat refactor.

- **Guard konsisten:** 50 dari 50 route owner/admin memakai `ownerRoute`/`adminRoute` (diperiksa otomatis). Pengecualian `GET /api/owner/profile` disengaja dan terdokumentasi (owner suspended tetap boleh melihat alasan).
- **Anti-IDOR:** `getOwnedKost/Room/Occupancy/Photo` memfilter `owner_id` lewat join dan mengembalikan 404 (bukan 403) sehingga keberadaan data tidak bocor. Keuangan, notifikasi, dan ulasan juga difilter per owner.
- **Anti mass-assignment:** hampir semua schema Zod memakai `.strict()`; `role` di Better Auth `input: false`, jadi registrasi tidak bisa membuat admin.
- **SQL aman:** semua query lewat Drizzle atau template `sql` berparameter; tidak ada penyambungan string. Pencarian PostGIS memakai parameter.
- **Error disanitasi:** `handleApiError` tidak membocorkan stack, SQL, atau kredensial; kode Postgres 23505/23503/23514 dipetakan ke 409/422.
- **Race condition ditangani:** `SELECT ... FOR UPDATE` pada verifikasi ulasan dan approval pembayaran, ditambah partial unique index (`reviews_verified_occupancy_unique`, `room_occupancies_one_active_per_room`, `owner_subscriptions_one_active_per_owner`) sebagai pengaman terakhir.
- **Privasi penghuni:** `room_occupancies` tidak pernah keluar ke endpoint publik; hasil pencocokan ulasan tidak dikembalikan ke pengunjung; nama tampilan publik dipendekkan.
- **QR token kuat:** 32 byte acak (`randomBytes(32)`), unique index, regenerate langsung membatalkan token lama; `Referrer-Policy: no-referrer` mencegah token bocor lewat header Referer.
- **Turnstile:** bypass `test-bypass` hanya aktif bila `NODE_ENV=test`, validasi dilakukan di server, kegagalan tidak membuka akses.
- **Rate limit tanpa menyimpan IP mentah:** kunci berupa HMAC; ada fixed-window atomik lewat `INSERT ... ON CONFLICT`.
- **R2 privat + proxy:** kunci objek dibuat server (`kosts/{kostId}/{uuid}.ext`), divalidasi prefix, dicek `HEAD` (tipe + ukuran), foto draft tidak bisa diakses publik.
- **Hygiene repo:** `.env` ada di `.gitignore`, `.env.example` hanya berisi placeholder, dependensi dipin ke versi eksak, `viewer.html` meng-escape data sebelum dirender (spot check).

## Temuan Prioritas Tinggi

### H-1 Owner bisa menimpa keputusan moderasi admin \[Kode\]

**Lokasi:** `src/lib/services/review.service.ts`, fungsi `verifyOwnerReview` (baris sekitar 400-471).

**Bukti:** fungsi ini hanya menolak bila status `hidden`, atau bila review sudah `verified` **dan** `published`. Review yang ditolak admin (`publicationStatus = rejected`, `moderatedBy` terisi) lolos kedua pengecekan itu. Owner lalu cukup memanggil `POST /api/owner/reviews/{id}/verify` dengan `occupancy_id` miliknya, dan review berubah menjadi `published` + `verified`.

**Dampak:** keputusan admin (misalnya menolak ulasan spam/palsu) bisa dibatalkan oleh owner yang berkepentingan. Ini merusak jaminan inti platform: moderasi admin bersifat final.

**Perbaikan** (tambahkan di `verifyOwnerReview` dan `rejectOwnerReview`, tepat setelah `if (!row) throw ...`):

```ts
if (row.review.moderatedBy !== null) {
  throw new ForbiddenError(
    "Review ini sudah dimoderasi admin dan tidak dapat diubah pemilik.",
  );
}
```

Tambahkan test: admin reject → owner verify harus 403.

### H-2 Owner mengontrol dua sisi verifikasi: bisa menyensor ulasan negatif dan meloloskan ulasan palsu \[Kode\]

**Lokasi:** `verifyOwnerReview`, `rejectOwnerReview`, `occupancy.service.ts`, `POST /api/public/reviews`.

**Bukti:**

- Owner boleh menolak ulasan *pending* mana pun dengan alasan bebas (`rejectOwnerReview`); tidak ada tinjauan admin atau banding untuk penolakan itu, sehingga ulasan negatif bisa dibuang secara sepihak.
- Pada verifikasi, `occupancy_id` dari body hanya dicek berada di kamar yang sama (`assertOccupancyForRoom`). Nama dan periode **tidak** harus cocok dengan ulasan, jadi owner bisa memverifikasi ulasan apa saja memakai penghuni apa saja.
- Owner bebas membuat data penghuni dengan nama sembarang. Kombinasinya: owner kirim ulasan bintang 5 lewat QR kamarnya sendiri (batas hanya 5/jam/IP), buat penghuni dengan nama yang sama, lalu verifikasi sendiri.

**Dampak:** rating publik, yang menjadi nilai jual platform, bisa dimanipulasi oleh pihak yang dinilai.

**Perbaikan (bertahap):**

1. Simpan `ip_hash` (HMAC, bukan IP mentah) dan hash user-agent pada tabel `reviews`; tandai ulasan yang IP-nya sama dengan IP sesi login owner (`session.ip_address`).
2. Penolakan oleh owner jangan menghapus ulasan dari pandangan admin: beri status `owner_rejected`, tampilkan di antrean admin, dan beri admin hak membatalkannya.
3. Wajibkan kecocokan nama (hasil `normalizeName`) atau isi `override_reason` saat owner memilih penghuni yang tidak cocok, dan catat di audit log.
4. Tambahkan metrik di dashboard admin: rasio penolakan per owner, dan lonjakan ulasan bintang 5 dalam 24 jam.
5. Tambahkan endpoint banding untuk pengunjung (lihat bagian 8).

### H-3 Keamanan akun: login hanya dibatasi per-IP, limiter Better Auth tidak efektif, admin tanpa MFA \[Kode\]

**Lokasi:** `src/lib/auth/auth.ts`, `src/app/api/auth/[...all]/route.ts`.

**Bukti:**

- Pembatas login (10 per 5 menit) berkunci pada IP saja. Penyerang dengan banyak IP (botnet, atau memutar header `X-Forwarded-For` bila host tidak menimpanya, lihat M-1) bisa menebak password satu akun tanpa batas.
- `rateLimit.storage: "memory"` pada Better Auth: di Vercel serverless setiap instance punya memori sendiri dan sering dimulai ulang, jadi limiter ini hampir tidak berfungsi.
- `requireEmailVerification: false` dan tidak ada `sendResetPassword`: akun bisa dibuat dengan email milik orang lain, dan pemilik yang lupa password tidak punya jalur pemulihan.
- Panjang password minimal 8, dan akun admin (satu akun dengan kuasa mem-publish semua listing dan menyetujui pembayaran) tidak memakai MFA.

**Dampak:** pengambilalihan akun admin atau owner lewat credential stuffing; akun palsu massal.

**Perbaikan:**

```ts
// route.ts (auth): tambahkan limiter per-email di samping per-IP
if (path.endsWith("/sign-in/email")) {
  const body = await request.clone().json().catch(() => ({}));
  if (typeof body.email === "string") {
    await enforceRateLimit({
      scope: "auth-signin-email",
      identifier: body.email.toLowerCase(),
      limit: 8,
      windowSeconds: 15 * 60,
    });
  }
}
```

- Ubah `rateLimit.storage` ke `"database"` (atau hapus dan andalkan limiter database yang sudah ada).
- Naikkan `minPasswordLength` ke 12, aktifkan `requireEmailVerification`, dan pasang `sendResetPassword` (mis. lewat Resend).
- Aktifkan plugin `twoFactor` dari Better Auth untuk akun admin, dan pertimbangkan plugin `haveIBeenPwned`. Cek nama opsi persisnya di dokumentasi Better Auth untuk versi 1.7.x yang kamu pakai.

## Temuan Prioritas Menengah

### M-1 Identitas klien untuk rate limit mudah dipalsukan atau tidak adil \[Konfirmasi\]

`getClientIp` (`utils/route.ts`) mengambil entri **paling kiri** dari `X-Forwarded-For`, yang dikendalikan klien bila host di depannya tidak menimpa header itu. Sepengetahuan saya Vercel menimpa header ini, tetapi bila kamu pindah host atau menambah proxy, semua rate limit (review, auth, search) bisa dilewati dengan satu header. Sebaliknya, pengguna di belakang NAT yang sama (kampus, ISP seluler) berbagi kuota 5 ulasan/jam. **Perbaikan:** pakai header yang dipastikan platform, misalnya `x-vercel-forwarded-for` lalu `x-real-ip` (cek dokumentasi Vercel), dan jangan percaya `X-Forwarded-For` mentah.

### M-2 Kuota ulasan per-QR bisa dihabiskan orang lain \[Kode\]

**Lokasi:** `submitPublicReview`. Rate limit (5/jam/IP dan 3/jam/token) dihitung **sebelum** Turnstile dan sebelum token dicek valid. Siapa pun yang pernah melihat QR di kamar (token ada di URL) bisa mengirim 3 request sampah dan memblokir penghuni asli selama sejam. Token acak juga membuat satu baris `rate_limit_buckets` baru per request, sedangkan pembersihannya hanya terjadi acak (2% per request). **Perbaikan:**

```ts
await enforceRateLimit({ scope: "review-ip", identifier: ip, limit: 20, windowSeconds: 3600 });
await verifyTurnstile(input.turnstile_token, ip);   // manusia dulu
const target = await findRoomByToken(input.qr_token);
if (!target?.room.qrEnabled) throw new NotFoundError("QR tidak valid");
await enforceRateLimit({ scope: "review-token", identifier: input.qr_token, limit: 10, windowSeconds: 24 * 3600 });
```

Jadwalkan pembersihan `rate_limit_buckets` lewat Vercel Cron, jangan mengandalkan penghapusan acak.

### M-3 Listing `published` bisa diubah tanpa review ulang (bait-and-switch) \[Kode\]

**Lokasi:** `updateOwnerListing`, `confirmListingPhoto`, `deleteListingPhoto`. Setelah admin menyetujui, owner bebas mengganti nama, alamat, koordinat, nomor kontak, deskripsi, harga, dan mengunggah foto apa pun; perubahan langsung tampil publik. Admin hanya menilai versi pertama. **Perbaikan:** bila `existing.status === "published"` dan field sensitif (`name`, `description`, `address`, `latitude`, `longitude`, `contact_phone`) berubah, simpan sebagai revisi menunggu persetujuan (tabel `kost_listing_revisions`), atau minimal ubah status ke `pending`. Foto baru pada listing published sebaiknya berstatus `pending` sampai admin menyetujui.

### M-4 Langganan tidak ditegakkan dan endpoint pembayaran bisa di-spam \[Kode\]

- `max_listings` pada paket **tidak pernah dibaca** (hasil `grep` hanya menemukan penulisan), dan tidak ada pengecekan langganan aktif di mana pun; fitur berbayar praktis gratis.
- `POST /api/owner/subscription/payment` tanpa rate limit dan tanpa pembatasan satu pembayaran *pending* per owner; tiap request menyisipkan satu notifikasi ke **setiap** admin (`notifyAdmins`), sehingga mudah membanjiri antrean.
- `payment_proof` berupa string bebas (maks 1000 karakter). Bila UI admin merendernya sebagai tautan, nilai seperti `javascript:...` berbahaya.
- Masa berlaku hanya diperbarui saat owner memanggil `GET /api/owner/subscription`, sehingga `activeSubscriptions` di dashboard admin bisa menghitung langganan yang sudah kedaluwarsa.

**Perbaikan:** tegakkan `max_listings` di `createOwnerListing`; batasi satu pembayaran pending per owner (partial unique index); validasi `payment_proof` sebagai URL `https:` atau object key R2 milik owner; tambah cron harian yang mengubah langganan kedaluwarsa.

### M-5 Penyalahgunaan unggah foto \[Kode\]

- `presign` hanya menghitung foto yang sudah dikonfirmasi dan tidak punya rate limit, jadi owner bisa meminta ribuan URL, mengunggah 10 MB per objek, dan tidak pernah mengonfirmasi. Objek yatim menumpuk di R2 (biaya) dan docs hanya menyebut "cleanup terpisah".
- Konfirmasi hanya percaya `Content-Type` yang dideklarasikan klien (via `HEAD`); isi file tidak diperiksa. Foto yang diproxy publik juga bisa membawa metadata **EXIF GPS** milik owner.
- Pengecekan batas 50 foto berada di luar transaksi (race kecil).

**Perbaikan:** rate limit presign (mis. 30/jam/owner) + tabel `pending_uploads` dengan TTL; lifecycle rule R2 atau cron untuk menghapus objek `kosts/` yang tidak ada di `kost_photos` setelah 24 jam; saat konfirmasi, baca 12 byte pertama (`GetObject` dengan `Range`) dan cocokkan magic number JPEG/PNG/WebP; pertimbangkan re-encode dengan `sharp` untuk membuang EXIF.

### M-6 Proxy foto publik: tanpa rate limit dan cache terlalu lama untuk takedown \[Kode\]

`GET /api/public/photos` mengalirkan objek lewat fungsi Vercel (biaya bandwidth dan durasi fungsi) tanpa rate limit. Header `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` membuat foto yang sudah dihapus atau listing yang di-takedown tetap tersedia dari cache hingga 1 hari (dan SWR sampai 7 hari). **Perbaikan:** sajikan lewat domain publik R2/Cloudflare CDN (isi `R2_PUBLIC_URL`), atau pakai `s-maxage` pendek (mis. 300) dan purge saat takedown; tambah rate limit per IP.

### M-7 Endpoint baca publik tidak dibatasi, pencarian rawan lambat \[Kode\]

Hanya `/public/kost` dan `/public/locations/search` yang dibatasi (120/menit). `/public/kost/{slug}`, `/rooms`, `/reviews`, `/public/review/{token}`, `/facilities` terbuka untuk scraping. Pencarian memakai `ILIKE '%q%'` tanpa indeks trigram, dan parameter `q`, `city`, `district` tidak meng-escape karakter `%` dan `_` (pola bisa dikendalikan pengguna; dampak: query lambat, bukan injeksi). Setiap kartu juga menjalankan 5 subquery berkorelasi ditambah query `COUNT` terpisah. **Perbaikan:**

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX kost_listings_name_trgm ON kost_listings USING gin (name gin_trgm_ops);
CREATE INDEX kost_listings_address_trgm ON kost_listings USING gin (address gin_trgm_ops);
```

Escape `%`, `_`, `\` pada input sebelum dimasukkan ke pola `ILIKE`, dan pasang rate limit longgar (mis. 300/menit/IP) pada semua route `/api/public/*`.

### M-8 Tanggal tidak valid menghasilkan HTTP 500, bukan 422 \[Konfirmasi\]

`occupancyCreateSchema` dan `occupancyUpdateSchema` hanya memeriksa pola `YYYY-MM-DD` dengan regex, bukan tanggal nyata (padahal `dateOnlySchema` yang benar sudah ada di `common.schema.ts`). Nilai seperti `2026-02-31` lolos validasi lalu ditolak Postgres; kode galat itu tidak dipetakan di `handleApiError`, sehingga klien menerima 500 "Terjadi kesalahan pada server". **Perbaikan:** pakai `dateOnlySchema` di semua schema tanggal, dan petakan galat Postgres kelas `22` (termasuk `22007`, `22008`, `22P02`) ke 422:

```ts
if (isPostgresError(error) && error.code.startsWith("22")) {
  return jsonError("Format data tidak valid", 422, null);
}
```

### M-9 Data pribadi dan risiko hukum \[Kode\]

- Repo publik berisi `data/kost-malang.csv`, `.json`, `.md`, `.kml`, dan `viewer.html` dengan ±3.485 listing **termasuk nomor telepon pemilik** hasil scrape Google Maps. README sendiri mengakui scraping membebani layanan Google dan harus mematuhi ToS; pada praktiknya ToS Google Maps melarang scraping, dan nomor telepon perorangan adalah data pribadi menurut UU PDP No. 27/2022.
- Data penghuni (nama lengkap, tanggal masuk/keluar, catatan) dan nama asli pengulas disimpan tanpa kebijakan retensi, tanpa persetujuan eksplisit di form ulasan, dan tanpa jalur ekspor/hapus.

**Perbaikan:** hapus dataset berisi telepon dari repo publik (dan dari riwayat git bila perlu), simpan hanya data yang kamu miliki izinnya; tambah kebijakan privasi, teks persetujuan pada form ulasan, masa retensi (mis. hapus nama lengkap pengulas setelah ulasan diproses), dan endpoint ekspor/hapus data (lihat bagian 8). Konsultasikan ke penasihat hukum untuk UU PDP.

## Temuan Prioritas Rendah dan Catatan

Tidak ada yang mendesak, tetapi semuanya murah diperbaiki dan menaikkan kualitas.

| ID | Temuan | Lokasi | Perbaikan |
| --- | --- | --- | --- |
| L-1 | Kegagalan `logAdmin` hanya di-`console.error`, sehingga aksi admin bisa sukses tanpa jejak audit. Log tidak mencatat IP/user-agent atau nilai sebelum/sesudah; aksi owner (verifikasi/penolakan ulasan, perubahan keuangan) tidak diaudit sama sekali. | `audit.service.ts`, semua service admin | Tulis audit di dalam transaksi yang sama, tambah kolom `ip_hash`, `user_agent`, `before`, `after`, dan audit aksi owner yang sensitif. |
| L-2 | `setListingStatus` bisa mem-publish listing milik owner yang belum `approved` dan tidak mengirim notifikasi, tidak konsisten dengan `approveListing`. `approveListing`/`rejectListing` juga read-then-write tanpa transaksi. | `admin.service.ts` | Samakan pengecekan dengan `approveListing`, bungkus dalam transaksi + `FOR UPDATE`. |
| L-3 | Tidak ada HSTS, CSP, atau Permissions-Policy di `next.config.ts` (terverifikasi dengan `grep`). Vercel mungkin menambah HSTS sendiri untuk `*.vercel.app`, tetapi domain kustom perlu dikonfigurasi. | `next.config.ts` | Tambah `Strict-Transport-Security: max-age=63072000; includeSubDomains`, `Permissions-Policy`, dan CSP ketat (`default-src 'none'` untuk API murni). |
| L-4 | CSRF hanya mengandalkan `SameSite=Lax` + pemeriksaan origin Better Auth. Route kustom tidak memeriksa `Origin` atau `Content-Type`, dan `parseJson` menerima tipe konten apa pun. `GET /api/owner/subscription` punya efek tulis (menandai langganan kedaluwarsa). | `guards.ts`, `route.ts` | Untuk metode POST/PUT/PATCH/DELETE: tolak bila `Origin` bukan `APP_BASE_URL` dan `Content-Type` bukan `application/json`. Pindahkan efek tulis GET ke cron. |
| L-5 | Turnstile tidak memeriksa `hostname`/`action` pada respons, dan mengembalikan daftar kode galat ke klien. | `turnstile.ts` | Cocokkan `result.hostname` dengan domain produksi, tetapkan `action` (mis. `review`), hapus `codes` dari respons. |
| L-6 | `GET /api/health` publik membuka status DB dan versi PostGIS, dan tiap hit menjalankan query ke database (amplifikasi DoS). | `health/route.ts` | Respons publik cukup `{status:"ok"}` tanpa query; detail DB hanya untuk admin atau header rahasia monitoring. |
| L-7 | Respons 429 hanya membawa `retry_after_seconds` di body, tanpa header `Retry-After` (terverifikasi dengan `grep`). | `rate-limit.ts`, `api-response.ts` | Tambah header `Retry-After` dan `X-RateLimit-*`. |
| L-8 | Komentar ulasan dan `public_display_name` (80 karakter) tidak difilter: tautan, nomor telepon, kata kasar, atau meniru nama orang lain bisa tampil publik setelah verifikasi. API mengembalikan teks mentah, jadi frontend wajib meng-escape (jangan `dangerouslySetInnerHTML`). | `review.schema.ts`, `slug.ts` | Tolak/curigai URL dan nomor telepon di komentar, atur panjang minimum bermakna, tambah antrean "dilaporkan" (bagian 8). |
| L-9 | Tidak ada CI untuk `npm audit`/Dependabot/CodeQL; versi dependensi tidak bisa saya periksa terhadap advisory. `e2e-demo.sh` default-nya menulis ke produksi (membuat owner, listing, kamar), dan `smoke-test.sh` memakai path tetap `/tmp/smoke.body`. | `scripts/`, repo | Aktifkan Dependabot + `npm audit --omit=dev` di GitHub Actions; jalankan e2e hanya pada preview deployment dengan branch Neon terpisah; pakai `mktemp`. |
| L-10 | Kebersihan kode: `getRoomById` dan `getRoomOccupancyList` (room.service) tidak memeriksa kepemilikan dan tidak dipakai (terverifikasi), tetapi mudah salah pakai kelak sebagai IDOR; `namesLooselyEqual` tidak dipakai; `listOwnerReviews` memasukkan kondisi `publication_status` dua kali; catatan keuangan dihapus permanen tanpa riwayat. | `room.service.ts`, `review.service.ts`, `slug.ts`, `finance.service.ts` | Hapus kode mati atau ubah agar menerima `ownerId`; pertimbangkan soft delete untuk catatan keuangan. |

## Celah Pengujian (QA) dan Cara Mengonfirmasi Temuan

Suite yang ada (27 test Vitest + smoke 12 cek + e2e 21 langkah) sudah menutup alur utama dan isolasi owner. Yang belum tercakup justru jenis bug yang saya temukan: **override moderasi, konkurensi, urutan rate limit, dan validasi tepi**.

### A. Konfirmasi read-only ke produksi (aman dijalankan)

```bash
B=https://havenakost.vercel.app
# Harus 401 (belum login), bukan 200/500
curl -s -o /dev/null -w "%{http_code}\n" $B/api/owner/profile
curl -s -o /dev/null -w "%{http_code}\n" $B/api/admin/dashboard
# Harus 404 dengan envelope error standar
curl -s -i $B/api/public/kost/slug-tidak-ada | head -20
# Periksa header keamanan (L-3): cari strict-transport-security, content-security-policy
curl -sI $B/api/health
# Foto draft/tidak terdaftar harus 404
curl -s -o /dev/null -w "%{http_code}\n" "$B/api/public/photos?key=kosts/x/y.jpg"
```

### B. Konfirmasi yang menulis data (jalankan di staging/branch Neon, bukan produksi)

| ID | Skenario | Langkah | Hasil yang benar |
| --- | --- | --- | --- |
| H-1 | Owner menimpa moderasi admin | Kirim ulasan, admin `reject`, lalu owner `POST /api/owner/reviews/{id}/verify` dengan `occupancy_id` | **403**. Bila 200 dan status jadi `published`, temuan terbukti. |
| H-2 | Verifikasi dengan penghuni tak cocok | Ulasan dengan nama "Andi", penghuni bernama "Budi", owner verify dengan `occupancy_id` Budi | Seharusnya ditolak atau butuh alasan override. |
| M-1 | Pemalsuan IP | Kirim 130 request ke `/api/public/kost`, sekali dengan `X-Forwarded-For` tetap, sekali dengan nilai berubah-ubah tiap request | Keduanya harus kena 429 setelah ±120. Bila yang berubah-ubah tidak pernah 429, temuan terbukti. |
| M-2 | Kuota token dihabiskan | Kirim 3 request ke `POST /api/public/reviews` dengan Turnstile tidak valid, lalu 1 request valid | Request valid tidak boleh ikut terblokir oleh request tidak valid. |
| M-3 | Edit listing published | Owner `PATCH` nama/telepon pada listing `published` | Harus memicu review ulang; saat ini langsung tampil. |
| M-8 | Tanggal tidak nyata | `POST /api/owner/rooms/{id}/occupancies` dengan `check_in_date: "2026-02-31"` | **422**, bukan 500. |
| H-3 | Per-akun | 15 login gagal ke satu email dari IP berbeda | Akun harus terkunci sementara; saat ini tidak. |

### C. Test otomatis yang disarankan ditambahkan ke `tests/api.test.ts`

```ts
it("owner tidak bisa verify ulang review yang ditolak admin", async () => {
  // arrange: submit review -> admin POST /reject
  // act: owner POST /verify { occupancy_id }
  // assert: response.status === 403
});

it("dua verify bersamaan: satu sukses, satu 409", async () => {
  const [a, b] = await Promise.all([verify(ownerA, r1), verify(ownerA, r2SameOccupancy)]);
  expect([a.status, b.status].sort()).toEqual([200, 409]);
});
```

Daftar kasus lain yang belum ada: matriks IDOR otomatis (loop semua route `/api/owner/*` dengan ID milik owner lain, harapkan 404 semua); owner `suspended` mendapat 403 di semua route kecuali `GET /profile`; rate limit ulasan (percobaan ke-6 → 429) dan urutan Turnstile-sebelum-limit; mass assignment (`role`, `status: "published"`, `owner_id` → 422); `limit=101` → 422; body JSON rusak → 400; nominal pembayaran tidak sama dengan harga paket → 422; presign lebih dari batas.

### D. Alat pemindai yang bisa dipakai dengan `docs/openapi.yaml` milikmu

- **Schemathesis** (fuzzing berbasis properti, menemukan 500 seperti M-8): `schemathesis run docs/openapi.yaml --base-url https://<staging>`.
- **OWASP ZAP** API scan: `zap-api-scan.py -t docs/openapi.yaml -f openapi -r zap.html` terhadap staging.
- **Semgrep/CodeQL** dan `npm audit --omit=dev` di GitHub Actions untuk pemindaian statis dan dependensi (L-9).

Jangan menjalankan pemindai aktif terhadap produksi tanpa jendela waktu yang disepakati: rate limit berbasis database akan menulis banyak baris dan dapat menimbulkan biaya.

## Rekomendasi Fitur dan Endpoint Baru

Endpoint yang ada sudah menutup alur utama. Yang kurang adalah jalur pemulihan, pengawasan, dan kepatuhan; urutannya mengikuti dampak pada keamanan.

| Prioritas | Fitur / endpoint | Alasan |
| --- | --- | --- |
| Tinggi | Reset password dan verifikasi email (`/api/auth/forget-password`, `/api/auth/send-verification-email` dari Better Auth), ubah password, daftar dan cabut sesi (`GET/DELETE /api/owner/sessions`) | Tanpa ini akun yang lupa password hilang, dan sesi curian tidak bisa dicabut (H-3). |
| Tinggi | MFA (TOTP) untuk admin lewat plugin `twoFactor` | Satu akun admin memegang semua kuasa moderasi dan pembayaran. |
| Tinggi | `POST /api/admin/users/{id}/revoke-sessions`, dipanggil otomatis saat owner di-suspend/reject | Menutup sesi aktif seketika, bukan hanya mengandalkan guard. |
| Tinggi | Antrean ulasan `owner_rejected` + `POST /api/admin/reviews/{id}/override-owner-reject` | Mengimbangi sensor oleh owner (H-2). |
| Sedang | `POST /api/public/reviews/{id}/report` (laporkan ulasan, rate limit + Turnstile) dan `GET /api/admin/reviews?flagged=true` | Jalur moderasi untuk spam, ulasan palsu, atau data pribadi di komentar (L-8). |
| Sedang | `POST /api/owner/reviews/{id}/reply` (balasan owner, hanya ulasan published, tetap dimoderasi) | Memberi owner jalur sah untuk menanggapi, sehingga dorongan menyensor berkurang. |
| Sedang | Revisi listing: `GET /api/admin/listing-revisions`, `POST .../{id}/approve`, `.../reject` | Mengatasi bait-and-switch (M-3). |
| Sedang | `GET /api/owner/account/export`, `DELETE /api/owner/account`, anonimisasi penghuni setelah masa retensi | Kepatuhan UU PDP (M-9). |
| Sedang | `Idempotency-Key` pada pembayaran, `GET /api/owner/subscription/payment/{id}`, dan nanti webhook gateway (Midtrans/Xendit) dengan verifikasi tanda tangan | Mencegah pembayaran ganda; jalur menuju pembayaran otomatis. |
| Sedang | `GET /api/cron/cleanup` (dilindungi `CRON_SECRET`, dijadwalkan Vercel Cron): hapus `rate_limit_buckets` kedaluwarsa, objek R2 yatim, sesi kedaluwarsa, tandai langganan kedaluwarsa | Menggantikan pembersihan acak dan efek tulis pada GET. |
| Rendah | Header `Retry-After` dan `X-RateLimit-*`, `X-Request-Id` di setiap respons, log terstruktur + Sentry | Debugging dan observabilitas produksi. |
| Rendah | Versi API (`/api/v1/...`) dan pemisahan `/api/health` (liveness publik) vs `/api/health/ready` (readiness untuk admin) | Perubahan kontrak aman bagi frontend/mobile; kurangi paparan (L-6). |

## Rencana Perbaikan Berurutan

Urutan ini memprioritaskan dampak terbesar dengan usaha terkecil. Centang saat selesai.

**Hari ini (±2-3 jam)**

- [ ] H-1: blokir verify/reject owner bila `moderatedBy` terisi + test 403
- [ ] M-8: ganti regex tanggal dengan `dateOnlySchema` dan petakan galat Postgres kelas `22` ke 422
- [ ] M-2: urutkan ulang `submitPublicReview` (Turnstile dan validasi token sebelum limit per-token)
- [ ] M-1: ganti `getClientIp` ke header yang dijamin platform
- [ ] M-9: tarik `data/*.csv`, `.json`, `.kml`, `viewer.html` yang berisi telepon dari repo publik

**Minggu ini**

- [ ] H-3: limiter login per-email, `rateLimit.storage` ke database, password minimal 12, reset password + verifikasi email
- [ ] H-3: MFA TOTP untuk akun admin
- [ ] M-3: revisi listing atau status `pending` saat field sensitif pada listing published berubah
- [ ] M-4: tegakkan `max_listings`, satu pembayaran pending per owner, validasi `payment_proof`
- [ ] M-6 dan M-7: rate limit semua `/api/public/*`, indeks trigram, escape wildcard `ILIKE`
- [ ] L-3: tambah HSTS, Permissions-Policy, CSP di `next.config.ts`

**Bulan ini**

- [ ] H-2: `ip_hash` pada ulasan, status `owner_rejected` + antrean admin, kewajiban alasan override, metrik rasio penolakan
- [ ] M-5: rate limit presign, `pending_uploads`, cron pembersihan R2, cek magic byte, buang EXIF
- [ ] M-9: kebijakan privasi, persetujuan di form ulasan, retensi data, ekspor/hapus akun
- [ ] L-1: audit log dalam transaksi + IP/UA + aksi owner
- [ ] L-4, L-5, L-6, L-7, L-10: pengerasan kecil (Origin check, Turnstile hostname, health minimal, `Retry-After`, bersihkan kode mati)
- [ ] L-9: Dependabot, `npm audit` + Semgrep di CI; pindahkan e2e ke staging (branch Neon)
- [ ] Tambahkan test dari bagian 7C dan jalankan Schemathesis + ZAP di staging

Setelah perbaikan H-1 dan H-3 selesai, minta saya mengaudit ulang diff-nya; kalau kamu bisa membuka akses egress ke domain staging, saya juga bisa menjalankan pengujian dinamis di bagian 7B.
