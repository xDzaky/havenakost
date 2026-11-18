# Havena Kost — Spesifikasi Fitur Dashboard (Admin dan Pemilik Kost)

Dokumen untuk **frontend** (acuan implementasi halaman) dan **PM** (cakupan fitur). Disusun dari backend `xDzaky/havenakost` commit `1d5d73f` (18 November 2026). Detail field, validasi, dan kode status ada di **Havena-Kost-API-Dokumentasi.md**; di sini setiap halaman merujuk ke endpoint terkait dengan format `METHOD /path`.

> Catatan penamaan: field respons campuran `camelCase` dan `snake_case` (lihat dokumen API 1.5b); nama field di sini mengikuti kode aktual.
>
> Dashboard adalah **desain yang diusulkan** dari kemampuan backend yang ada. Tata letak visual belum ditentukan. Bagian yang butuh perubahan backend diberi tanda ⚠ dan dirangkum di Bagian 4.

---

## 1. Matriks Akses

| Kemampuan | Publik | Pemilik `pending` | Pemilik `approved` | Pemilik `suspended` | Admin |
| --- | :-: | :-: | :-: | :-: | :-: |
| Cari dan lihat kost, kirim ulasan via QR | ya | ya | ya | ya | ya |
| Isi profil, buat draft listing, kamar, foto, penghuni, keuangan | — | ya | ya | **tidak** | — |
| Ajukan listing untuk publikasi (draft → pending) | — | **tidak** | ya | tidak | — |
| Verifikasi dan balas ulasan | — | ya | ya | tidak | — |
| Beli langganan | — | ya | ya | tidak | — |
| Lihat profil dan alasan penangguhan | — | ya | ya | **ya** | — |
| Setujui pemilik, listing, pembayaran; moderasi ulasan; audit log | — | — | — | — | ya |

Perilaku wajib di frontend:
- Setelah login, panggil `GET /api/auth/get-session` dan arahkan berdasarkan `user.role` (`owner` → `/owner`, `admin` → `/admin`). Pemilik tidak boleh membuka `/admin` dan sebaliknya (backend tetap menolak 403, tetapi UI harus menyembunyikan menu).
- Panggil `GET /api/owner/profile` untuk membaca `approvalStatus` dan tampilkan banner sesuai status (lihat 2.1).
- Respons **401** di halaman mana pun → arahkan ke login. Respons **429** → tampilkan hitung mundur dari header `Retry-After`.

---

## 2. Dashboard Pemilik Kost (`/owner`)

### 2.1 Kerangka dan banner status akun

Sidebar: Beranda, Listing Saya, Ulasan, Keuangan, Langganan, Notifikasi (dengan badge belum dibaca), Profil.

| Kondisi | Banner |
| --- | --- |
| `approvalStatus = pending` | "Akun Anda sedang ditinjau admin. Anda dapat menyiapkan draft, tetapi belum bisa mengajukan listing." Tombol "Ajukan" dinonaktifkan |
| `approved` | Tanpa banner |
| `rejected` | "Akun ditolak" + alasan penolakan. Semua listing yang pernah published sudah diarsipkan |
| `suspended` | Layar terkunci penuh: hanya alasan dan tombol keluar. Semua endpoint pemilik lain mengembalikan 403 |

Sumber: `GET /api/owner/profile`, `GET /api/owner/notifications?unread_only=true&limit=1` (ambil `meta.total` untuk badge).

### 2.2 Beranda (ringkasan)

⚠ Belum ada satu endpoint ringkasan; frontend menyusun dari beberapa panggilan paralel.

| Kartu/komponen | Sumber data |
| --- | --- |
| Jumlah listing per status (draft / pending / published / rejected) | `GET /api/owner/listings?status=...&limit=1` per status, baca `meta.total` |
| Ulasan menunggu tindakan | `GET /api/owner/reviews?publication_status=pending&limit=5` |
| Langganan aktif dan sisa hari | `GET /api/owner/subscription` (`subscription.endDate`, `plan`) |
| Ringkasan keuangan bulan ini | `GET /api/owner/finances/summary?from=YYYY-MM-01&to=YYYY-MM-DD` |
| Notifikasi terbaru | `GET /api/owner/notifications?limit=5` |
| Langkah awal (checklist) | Profil lengkap, listing pertama dibuat, foto diunggah, kamar ditambah, QR dibuat, diajukan |

Status kosong: pemilik baru melihat checklist langkah awal dengan tombol "Buat listing pertama".

### 2.3 Listing Saya — daftar

Fitur: tabel/kartu listing, pencarian nama (`q`), filter status, paginasi, tombol "Tambah listing".
Kolom: foto sampul, nama, kota, rentang harga, status (lencana berwarna), jumlah kamar, aksi.
Endpoint: `GET /api/owner/listings?q&status&page&limit`.

Aksi per baris: Edit, Arsipkan (`PATCH ... {status:"archived"}`), Hapus (`DELETE`, dengan konfirmasi; soft delete).
Pesan penting:
- Tombol "Tambah listing" menampilkan kuota: pemilik tanpa langganan maksimal **1 listing aktif**. Bila 403 kuota → tawarkan halaman Langganan.
- Alasan penolakan (`rejectionReason`) tampil pada listing berstatus `rejected`.

### 2.4 Listing — buat dan ubah

Bentuk: wizard bertahap (simpan sebagai draft di tiap tahap).

| Tahap | Isi | Endpoint |
| --- | --- | --- |
| 1. Informasi dasar | Nama, deskripsi (≥20 karakter), kebijakan gender, harga min–maks, telepon kontak (format 62…) | `POST /api/owner/listings` |
| 2. Lokasi | Alamat, provinsi, kota, kecamatan, kelurahan, kode pos, **pin di peta** (latitude/longitude) | sama / `PATCH` |
| 3. Fasilitas | Pilih dari katalog | `GET /api/public/facilities`, `PUT /api/owner/listings/{id}/facilities` |
| 4. Foto | Unggah banyak, atur sampul dan urutan, teks alternatif | alur presign → PUT → confirm (lihat dokumen API 2.3), `PATCH/DELETE /api/owner/photos/{photoId}` |
| 5. Kamar | Tambah kamar (lihat 2.5) | `POST /api/owner/listings/{id}/rooms` |
| 6. Ajukan | Ringkasan kelengkapan + tombol "Ajukan untuk publikasi" | `PATCH ... {status:"pending"}` |

Aturan UI:
- Validasi sisi klien meniru backend (panjang, format telepon, harga maks ≥ min) agar error 422 jarang muncul; tampilkan `errors` dari server per field bila tetap terjadi.
- Maksimal **10 foto**, **10 MB**, hanya JPEG/PNG/WebP. Tampilkan progres unggah dan tombol coba lagi.
- **Peringatan perubahan sensitif:** pada listing `published`, mengubah nama, deskripsi, alamat, koordinat, atau telepon akan mengembalikannya ke `pending` (hilang dari pencarian sampai disetujui lagi). Tampilkan dialog konfirmasi sebelum menyimpan.
- Listing `published` hanya bisa diarsipkan (bukan di-draft-kan); sembunyikan opsi status lain.

### 2.5 Kamar dan QR

Halaman detail listing, tab "Kamar".

| Fitur | Endpoint |
| --- | --- |
| Daftar kamar + filter status | `GET /api/owner/listings/{id}/rooms?status=` |
| Tambah/ubah kamar: kode (unik, huruf/angka/`.`/`_`/`-`), nama, deskripsi, harga bulanan, status | `POST`, `PATCH /api/owner/rooms/{roomId}` |
| Hapus kamar | `DELETE /api/owner/rooms/{roomId}`; bila 409, sarankan ubah status ke `unavailable` |
| Buat QR | `POST /api/owner/rooms/{roomId}/qr` |
| Pratinjau QR (`dataUrl`) dan tautan ulasan (`reviewUrl`) | `GET /api/owner/rooms/{roomId}/qr` |
| Unduh QR PNG/SVG untuk dicetak | `GET /api/owner/rooms/{roomId}/qr?format=png` atau `svg` |
| Ganti QR (token lama langsung mati) | `POST .../qr/regenerate`, dengan konfirmasi |
| Nonaktifkan QR | `DELETE .../qr` |

Catatan UI: jelaskan kepada pemilik bahwa QR tidak membuktikan identitas pengulas; ulasan tetap perlu diverifikasi. Bila QR `enabled=false`, tombol unduh dinonaktifkan dan tawarkan "Buat ulang QR".

### 2.6 Penghuni (per kamar)

Tab "Penghuni" pada detail kamar.
- Daftar dengan filter status (`active`/`completed`/`cancelled`): `GET /api/owner/rooms/{roomId}/occupancies`.
- Tambah/ubah: nama penghuni, tanggal masuk, tanggal keluar (opsional), status, catatan: `POST`, `PATCH /api/owner/occupancies/{occupancyId}`.
- Hapus: `DELETE`; 409 bila sudah dipakai verifikasi ulasan → sarankan ubah status menjadi `cancelled`.
- Aturan: satu kamar hanya boleh satu penghuni aktif; bila 409, tampilkan pesan server.
- Penjelasan di UI: nama penghuni dipakai untuk mencocokkan ulasan, jadi isi nama dengan benar.

### 2.7 Ulasan

Daftar (`GET /api/owner/reviews`) dengan tab: **Menunggu**, **Dipublikasikan**, **Ditolak** (`rejected` + `owner_rejected`), serta filter listing, kamar, dan status verifikasi. Lencana petunjuk pencocokan: `possible_match` (hijau), `ambiguous` (kuning), `unmatched` (abu).

Detail (`GET /api/owner/reviews/{reviewId}`):
- Isi ulasan, rating, nama pengulas, tanggal klaim menginap, kamar.
- Daftar `candidate_occupancies` (penghuni yang cocok nama dan periode) dengan penanda `already_used_for_verification`.
- Tombol **Verifikasi** (`POST .../verify`): pilih penghuni; bila nama tidak cocok tampilkan kolom "Alasan override" (wajib ≥15 karakter, bukan teks generik, dicatat di audit log).
- Tombol **Tolak** (`POST .../reject`) dengan alasan wajib. Hasil: status `owner_rejected`; admin dapat meninjau ulang.
- Tombol **Balas** (`POST .../reply`) hanya untuk ulasan terbit; tanpa tautan atau nomor telepon.
- Pemilik **tidak dapat** mengubah rating atau isi ulasan.
- Ulasan yang sudah dimoderasi admin tampil hanya-baca dengan keterangan "Dimoderasi admin" (403 bila dicoba ubah).
- Ulasan `published` tidak dapat ditolak lagi oleh pemilik.

### 2.8 Keuangan

| Fitur | Endpoint |
| --- | --- |
| Kartu total pemasukan, pengeluaran, saldo | `GET /api/owner/finances/summary` (`totals`) |
| Grafik per bulan (pemasukan vs pengeluaran) | `monthly[]` |
| Rincian per kategori | `categories[]` |
| Filter periode, kategori, jenis, listing, kamar | `GET /api/owner/finances?from&to&category&record_type&kost_id&room_id` |
| Tambah/ubah/hapus catatan | `POST`, `PATCH`, `DELETE /api/owner/finances/{id}` |

Form catatan: jenis, kategori (2–60), nominal (>0), tanggal, keterangan (opsional), keterkaitan listing/kamar (opsional). Ekspor CSV belum tersedia di backend ⚠.

### 2.9 Langganan

- Kartu paket aktif: nama paket, tanggal berakhir, kuota listing (`plan.maxListings`; `null` = tanpa batas) — `GET /api/owner/subscription`.
- Daftar paket yang dapat dibeli: `GET /api/owner/subscription/plans`.
- Form pembayaran: pilih paket, metode, nominal (otomatis sama dengan harga paket), bukti pembayaran (URL https opsional) — `POST /api/owner/subscription/payment`.
- Riwayat pembayaran (20 terakhir) dengan status `pending` / `approved` / `rejected` dan alasan penolakan.
- Aturan UI: bila ada pembayaran `pending`, tombol bayar dinonaktifkan ("Menunggu verifikasi admin"); 409 ditampilkan apa adanya. Pembayaran dilakukan manual di luar aplikasi; tampilkan instruksi transfer yang disiapkan tim bisnis.
- Pemilik tanpa langganan: tampilkan "Paket Gratis: 1 listing".

### 2.10 Notifikasi

Daftar dengan filter "Belum dibaca": `GET /api/owner/notifications`. Aksi: tandai satu (`PATCH .../{id}/read`) atau semua dibaca (`POST .../read-all`). Tipe dan tautan tujuan:

| Tipe | Tujuan klik |
| --- | --- |
| `listing_published`, `listing_rejected`, `listing_pending` | Detail listing |
| `review_pending` | Detail ulasan |
| `review_override` | Detail ulasan (admin mengubah keputusan pemilik) |
| `subscription_approved`, `subscription_rejected` | Halaman Langganan |

Gunakan polling berkala (mis. 60 detik) untuk badge; backend belum menyediakan push.

### 2.11 Profil

`GET/PATCH /api/owner/profile`: nama lengkap, nama usaha, telepon (62…), alamat, foto profil (URL). Tidak ada ubah email/password/peran dari backend pemilik ⚠ (ubah password lewat alur "lupa password" Better Auth).

---

## 3. Dashboard Admin (`/admin`)

### 3.1 Kerangka

Sidebar: Ringkasan, Pemilik, Listing, Ulasan, Pembayaran, Paket Langganan, Langganan, Audit Log, Sistem. Badge angka antrean diambil dari `pending` pada dashboard. ⚠ Belum ada endpoint notifikasi admin.

### 3.2 Ringkasan

`GET /api/admin/dashboard?days=30` (pilihan 7 / 30 / 90 / 365 hari).
- Kartu total: pemilik, listing, kamar, ulasan, langganan aktif.
- Kartu **antrean kerja**: pemilik pending, listing pending, ulasan pending (klik menuju daftar terfilter).
- Grafik garis pertumbuhan harian (`growth.series`): pemilik, listing, ulasan baru.
- Tidak ada pendapatan/omzet di backend ⚠ (bisa dihitung dari pembayaran approved bila diperlukan).

### 3.3 Pemilik

Daftar: `GET /api/admin/owners?q&approval_status` — kolom nama, email, usaha, status, tanggal daftar.
Detail: `GET /api/admin/owners/{id}` — profil, status, listing, langganan.
Aksi:
- **Setujui** `POST .../approve`.
- **Tolak** `POST .../reject` (alasan wajib 5–500). Efek: sesi pemilik dicabut dan listing published diarsipkan; tampilkan peringatan dampak ini.
- **Ubah status** `PATCH .../status` (pending/approved/rejected/suspended); alasan wajib untuk rejected/suspended.
- **Cabut semua sesi** `POST /api/admin/users/{id}/revoke-sessions` (untuk akun yang dicurigai diretas).

### 3.4 Listing

Daftar: `GET /api/admin/listings?q&status&owner_id`, default fokus status `pending`.
Detail: `GET /api/admin/listings/{id}` — seluruh data, foto, kamar, pemilik, status pemilik.
Aksi:
- **Setujui/publish** `POST .../approve`. Dinonaktifkan bila pemilik belum `approved` (403); 409 bila sudah published atau terhapus.
- **Tolak** `POST .../reject` (alasan wajib; pemilik menerima notifikasi).
- **Ubah status manual** `PATCH .../status` (draft/pending/published/rejected/archived); alasan wajib untuk rejected.
- Tampilkan petunjuk "diajukan ulang karena perubahan data sensitif" bila listing kembali ke pending (sumber: notifikasi/riwayat audit log).

### 3.5 Ulasan (moderasi)

Daftar: `GET /api/admin/reviews` dengan filter status publikasi, status verifikasi, listing, kata kunci, dan tab **Dilaporkan** (`is_flagged=true`, memuat `flagReason`).
Detail: `GET /api/admin/reviews/{id}`.
Aksi: **Publikasikan**, **Verifikasi+publikasikan** (pilih penghuni, alasan override bila perlu), **Tolak** (alasan), **Sembunyikan** (alasan), dan **Override penolakan pemilik** (`POST .../override-owner-reject` dengan `action` publish/reject dan alasan ≥10 karakter).
⚠ Tab **"Ditolak pemilik"** (`owner_rejected`) belum dapat dibuat: filter status backend belum menerima nilai itu (lihat Bagian 4). Alasan override wajib karena pemilik mendapat notifikasi.

### 3.6 Pembayaran langganan

`GET /api/admin/subscription-payments?status=pending` — kolom pemilik, paket, nominal, metode, bukti (tautan), tanggal.
Aksi: **Setujui** (`POST .../approve`; mengaktifkan atau memperpanjang langganan) dan **Tolak** (`POST .../reject`, alasan wajib). 409 bila sudah diproses oleh admin lain.
Tampilkan bukti pembayaran sebagai tautan eksternal (hanya `https://`); beri peringatan "tautan eksternal" sebelum dibuka.

### 3.7 Paket langganan

`GET/POST /api/admin/subscription-plans`, `PATCH/DELETE /api/admin/subscription-plans/{id}`.
Form: kode (huruf kecil/angka/strip), nama, deskripsi, harga, durasi (hari), batas listing (`kosong` = tanpa batas), fitur (teks), aktif/nonaktif. Gunakan "nonaktifkan" sebagai pengganti hapus untuk paket yang pernah dibeli (hapus dapat ditolak backend).

### 3.8 Langganan pemilik

`GET /api/admin/subscriptions` — daftar langganan: pemilik, paket, tanggal mulai/berakhir, status.

### 3.9 Audit log

`GET /api/admin/logs?admin_id&entity_type&action` — waktu, pelaku, aksi, entitas, deskripsi, `before` → `after`. Aksi tercatat antara lain persetujuan/penolakan listing, pemilik, pembayaran, override ulasan, pencabutan sesi, dan **override nama oleh pemilik** (`review.owner_name_override`; kolom pelaku berisi pemilik).

### 3.10 Sistem

`GET /api/admin/health` — status database dan versi PostGIS. (Endpoint publik `/api/health` hanya "ok".)

---

## 4. Celah Backend yang Mempengaruhi Dashboard

Perlu dibahas dengan tim backend; frontend tidak dapat menutupnya sendiri.

| # | Celah | Dampak | Usulan |
| --- | --- | --- | --- |
| 1 | `GET /api/admin/reviews` tidak menerima `publication_status=owner_rejected` | Admin tidak punya antrean "ditolak pemilik" untuk di-override | Tambahkan nilai ke enum filter |
| 2 | Tidak ada endpoint notifikasi untuk admin | Admin tidak dapat melihat notifikasi pembayaran baru atau listing yang perlu verifikasi ulang | `GET /api/admin/notifications` + tandai dibaca |
| 3 | Tidak ada `GET /api/owner/dashboard` | Beranda pemilik memerlukan 5–6 panggilan paralel | Satu endpoint ringkasan |
| 4 | Tidak ada MFA untuk admin | Akun admin bernilai tinggi hanya dilindungi password | TOTP wajib untuk admin |
| 5 | Pengguna tidak dapat mengganti password/email dari dalam dashboard | Hanya lewat "lupa password" | Endpoint ubah password dan daftar sesi aktif |
| 6 | Tidak ada ekspor data (CSV) | Pemilik tidak dapat mengunduh laporan keuangan | Endpoint ekspor atau ekspor di sisi klien dari data paginasi |
| 7 | Pengirim email masih mode uji Resend | Verifikasi email dan reset password tidak sampai ke pengguna selain pemilik akun Resend | Verifikasi domain pengirim (blokir rilis) |

---

## 5. Lampiran: Halaman Publik (pengunjung)

Tidak diminta secara khusus, tetapi dibutuhkan untuk alur ulasan dan pencarian.

| Halaman | Fitur | Endpoint |
| --- | --- | --- |
| Beranda/pencarian | Kata kunci, kota, kecamatan, gender, rentang harga, fasilitas, hanya yang tersedia, urutan (terbaru, harga, jarak), peta/radius lokasi | `GET /api/public/kost`, `GET /api/public/locations/search`, `GET /api/public/facilities` |
| Detail kost | Galeri foto, deskripsi, fasilitas, kamar dan harga, rating, ulasan + balasan pemilik, kontak | `GET /api/public/kost/{slug}`, `.../rooms`, `.../reviews` |
| Form ulasan (`/review/{token}`) | Nama, nama tampilan, tanggal masuk/keluar, rating 1–5, komentar (tanpa tautan/telepon), Turnstile, persetujuan privasi. Setelah kirim: "Ulasan Anda menunggu verifikasi" (hasil pencocokan tidak ditampilkan) | `GET /api/public/review/{token}`, `POST /api/public/reviews` |
| Laporkan ulasan | Alasan + Turnstile; respons selalu "Laporan diterima" | `POST /api/public/reviews/{reviewId}/report` |

---

## 6. Daftar Periksa Implementasi Frontend

- [ ] Klien HTTP: `credentials: "include"`, `Content-Type: application/json`, penanganan 401/403/404/409/422/429.
- [ ] Penampil galat 422 per field dari `errors`.
- [ ] Hitung mundur 429 dari header `Retry-After`.
- [ ] Halaman auth: daftar, cek email, hasil verifikasi, login, lupa dan reset password.
- [ ] Pengarah peran setelah login, penjaga rute `/owner` dan `/admin`.
- [ ] Banner status akun pemilik dan layar terkunci untuk `suspended`.
- [ ] Widget Turnstile pada form ulasan dan laporan (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
- [ ] Komponen unggah foto (presign → PUT ke R2 tanpa cookie → confirm).
- [ ] Komponen peta untuk memilih koordinat.
- [ ] Lencana status konsisten (listing, pemilik, ulasan, pembayaran, kamar).
- [ ] Dialog konfirmasi untuk aksi merusak: tolak pemilik, hapus, ganti QR, perubahan sensitif listing published.
