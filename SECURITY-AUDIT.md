# Laporan Security Testing — Havena Kost API

- **Tanggal pengujian:** 17 November 2026
- **Target:** `https://havenakost.vercel.app` (produksi) + source code `xDzaky/havenakost`
- **Commit saat audit:** `09614df` (perbaikan: `2ca56a2`)
- **Metode:** black-box terhadap endpoint produksi, review statis source code, dan automated regression test (Vitest)
- **Referensi metodologi:** skill `codeaudit`, `api-security`, `api-recon` (ARTEX)
- **Hasil akhir:** **tidak ada temuan Critical/High/Medium**; 3 temuan Low sudah diperbaiki, 3 catatan informasional

> Catatan: seluruh uji tulis (create/update) dilakukan pada data demo milik project sendiri. Kredensial, token sesi, dan nilai secret tidak dicantumkan di dokumen ini.

## 1. Ringkasan

| Kategori | Jumlah |
| --- | --- |
| Critical / High / Medium | 0 |
| Low (diperbaiki) | 3 |
| Informasional / rekomendasi | 3 |
| Automated test | 49/49 lulus |

Kontrol keamanan yang terverifikasi bekerja: otorisasi berbasis peran dan kepemilikan, proteksi CSRF, anti mass-assignment, validasi upload foto, pencegahan enumerasi akun, verifikasi email, kebijakan password, rate limiting per-IP, dan sanitasi input pada query database.

## 2. Matriks pengujian

### 2.1 Autentikasi & sesi

| Uji | Hasil |
| --- | --- |
| Login admin valid | `200`, cookie `__Secure-better-auth.session_token` dengan `HttpOnly; Secure; SameSite=Lax` |
| Password salah vs email tidak dikenal | keduanya `401 INVALID_EMAIL_OR_PASSWORD` (tidak ada enumerasi) |
| Signup email duplikat | `200` dengan respons sintetis; row admin **tidak berubah** (anti-enumerasi) |
| Password 6/10/11 karakter | `400 PASSWORD_TOO_SHORT` (minimum 12 ditegakkan) |
| Login sebelum verifikasi email | `403 EMAIL_NOT_VERIFIED`, tanpa cookie sesi |
| Reset password email tidak dikenal | `200` pesan generik ("If this email exists…") |
| Percobaan login berulang | `429` + `Retry-After` (limiter per IP+email) |

### 2.2 Otorisasi (IDOR & batas peran)

| Uji | Hasil |
| --- | --- |
| `GET/PATCH/DELETE` listing milik owner lain | `404` (bukan `403`, tidak membocorkan keberadaan) |
| `GET/PATCH` room, `POST/GET` QR, regenerate QR milik owner lain | `404` |
| `POST/GET` occupancy room milik owner lain | `404` |
| Endpoint admin tanpa sesi | `401` |
| Endpoint admin dengan sesi owner | `403` |
| `/api/admin/health` | `401` tanpa sesi, `200` sebagai admin |
| Query DB rate limit | key bucket cocok dengan HMAC IP asli pemanggil — limit benar-benar per-IP |

### 2.3 CSRF, CORS, dan metode HTTP

| Uji | Hasil |
| --- | --- |
| `POST` admin dengan `Origin: https://evil.example` | `403` |
| `POST` admin dengan `Origin` sama / tanpa `Origin` | diproses normal (`404` resource uji) |
| Preflight `OPTIONS` dengan Origin asing | `204` tanpa header `Access-Control-Allow-Origin` |
| `PUT` endpoint admin, `TRACE /api/health` | `405` |

### 2.4 Mass assignment & validasi input

| Uji | Hasil |
| --- | --- |
| `PATCH /api/owner/profile` dengan `role` / `approval_status` | `422` |
| `PATCH /api/owner/listings/{id}` dengan `owner_id` | `422` |
| `PATCH` listing dengan `status=published` oleh owner | `422` (publish hanya via admin) |
| `status=pending` oleh owner `pending` | `403` (wajib approved) |
| Payload asing pada schema `.strict()` | `422` |

### 2.5 Foto & storage

| Uji | Hasil |
| --- | --- |
| Proxy foto key valid pada listing published | `200 image/png` |
| Key `kosts/../secret`, `kosts/%2e%2e/secret` | `400` |
| Key tanpa prefix `kosts/` | `400` |
| Key acak di dalam `kosts/` | `404` |
| Foto listing draft/arsip | `404` |
| Presign/confirm | cek kepemilikan listing, magic bytes, maksimum 10 MB dan 10 foto/listing |
| Cache foto | `Cache-Control: public, max-age=600, s-maxage=600` (takedown ≤10 menit) |

### 2.6 Injeksi & query

| Uji | Hasil |
| --- | --- |
| `q=' OR 1=1--`, `q=%;` pada pencarian publik | `200` hasil kosong (parameterized query) |
| Review statis pemakaian `sql\`` | seluruh interpolasi lewat Drizzle/parameter; tidak ada string SQL dinamis |
| Slug listing draft/arsip | `404` (tidak dapat diakses publik) |

### 2.7 Business logic

| Uji | Hasil |
| --- | --- |
| Nominal pembayaran langganan | divalidasi server terhadap harga paket (`422` bila beda) |
| Laporan review non-existent / non-published | `202` generik + dedup per `(review_id, ip_hash)` |
| Review comment berisi link/nomor telepon | ditolak schema |
| Data publik listing | tidak memuat PII tenant/occupancy; hanya `businessName`, kontak listing, dan status kamar |

## 3. Temuan dan remediasi

### L-1 — HTML injection pada template email (Low) — **FIXED**

`data.user.name` dan `data.url` dimasukkan mentah ke HTML email verifikasi/reset. Nama akun dikendalikan pengguna, sehingga markup/link dapat disisipkan ke email resmi (dampak terbatas: email dikirim ke pemilik akun itu sendiri).

- **Perbaikan:** helper `escapeHtml()` di `src/lib/services/email.service.ts`, dipakai pada kedua template di `src/lib/auth/auth.ts`.
- **Test:** unit test escaping ditambahkan (`tests/unit.test.ts`).
- **Commit:** `09614df`

### L-2 — Cache foto terlalu panjang (Low) — **FIXED**

Respons proxy foto memakai `s-maxage=604800` (7 hari), sehingga foto listing yang di-unpublish/dihapus masih dapat dilayani CDN hingga 7 hari.

- **Perbaikan:** `Cache-Control: public, max-age=600, s-maxage=600, stale-while-revalidate=60` pada `src/app/api/public/photos/route.ts`.
- **Verifikasi produksi:** header `cache-control: public, max-age=600` setelah redeploy.
- **Commit:** `09614df`, `2ca56a2`

### L-3 — Dead code guard `requireApprovedOwner` (Low) — **FIXED**

Fungsi guard tidak pernah dipakai; penegakan approval sebenarnya sudah ada di `assertOwnerCanPublish()` (submit publikasi) dan `admin.service` (publish). Keberadaan guard yang tidak terpakai berpotensi menyesatkan reviewer.

- **Perbaikan:** fungsi dihapus dari `src/lib/auth/session.ts`; dokumentasi alur owner `pending` dikoreksi (`docs/panduan-lengkap.md`).
- **Commit:** `09614df`

### I-1 — Rate limit bucket pruning (Info)

`enforceRateLimit()` sudah membersihkan bucket kedaluwarsa secara oportunistik dan kolom `expires_at` terindeks — tidak ada perubahan diperlukan.

### I-2 — Admin belum memakai MFA (Info)

Akun admin masih mengandalkan password tunggal (proteksi brute-force: 8 gagal/15 menit per IP+email, 30/jam per email). Disarankan menambahkan TOTP/email OTP untuk peran admin.

### I-3 — Rotasi kredensial email (Info)

`RESEND_API_KEY` sempat dibagikan melalui kanal chat. Kunci sudah dipasang di Vercel (production/preview/development) dan `.env` lokal, tetapi sebaiknya **di-rotasi** di dashboard Resend, lalu perbarui `.env` dan environment Vercel.

## 4. Perubahan kode

| File | Perubahan |
| --- | --- |
| `src/lib/services/email.service.ts` | tambah `escapeHtml()` |
| `src/lib/auth/auth.ts` | escape nama/URL pada template email |
| `src/app/api/public/photos/route.ts` | TTL cache foto 7 hari → 10 menit |
| `src/lib/auth/session.ts` | hapus guard `requireApprovedOwner` yang tidak terpakai |
| `docs/panduan-lengkap.md` | koreksi perilaku owner `pending` |
| `tests/setup.ts` | test tidak lagi memanggil Resend; limiter internal Better Auth dinonaktifkan saat `NODE_ENV=test` |
| `tests/unit.test.ts` | test escaping HTML email |

## 5. Pengujian otomatis

```
npm run typecheck   # lulus
npm test            # 49/49 lulus (4 file)
```

Suite mencakup IDOR, mass assignment, rate limiting, Turnstile, kuota listing/foto, review, QR, dan langganan. Sebelum perbaikan test setup, suite memanggil Resend sungguhan dan bergantung pada window rate limit 5 menit sehingga flaky; setelah isolasi, suite deterministik dan ~2x lebih cepat.

## 6. Rekomendasi lanjutan

1. Rotasi `RESEND_API_KEY` dan verifikasi domain pengirim di Resend.
2. Tambahkan MFA untuk admin.
3. Pertimbangkan `Origin`/`Referer` wajib untuk request mutasi yang membawa cookie sesi (saat ini hanya memblokir Origin yang tidak cocok; `SameSite=Lax` sudah menjadi lapisan utama).
4. Pertahankan review berkala untuk endpoint baru; gunakan `npm test` + `scripts/smoke-test.sh` sebagai gate.

## 7. Lampiran — reproduksi aman

Uji non-destruktif yang dapat diulang (tanpa menulis data):

```bash
B=https://havenakost.vercel.app
curl -s -o /dev/null -w '%{http_code}\n' "$B/api/health"
curl -s -o /dev/null -w '%{http_code}\n' "$B/api/admin/dashboard"          # 401
curl -s -o /dev/null -w '%{http_code}\n' "$B/api/public/photos?key=kosts/../secret"  # 400
curl -s -o /dev/null -w '%{http_code}\n' "$B/api/public/kost/tidak-ada"    # 404
```

Untuk uji tulis/IDOR, gunakan akun demo dan database uji — jangan terhadap data produksi nyata.
