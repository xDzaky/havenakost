# 🔐 Dokumentasi Akun & Akses Dashboard — Havena Kost

Dokumen ini berisi daftar lengkap akun resmi, peran (role), kredensial masuk, dan panduan otentikasi untuk platform **Havena Kost — Malang Raya**.

---

## 1. Arsitektur Autentikasi

- **Otentikasi Utama**: Menggunakan `better-auth` dengan schema Drizzle ORM PostgreSQL.
- **Route Guard**: Rute dashboard (`/owner` dan `/admin`) diproteksi penuh. Pengguna yang mencoba mengakses URL dashboard secara langsung tanpa sesi login akan dialihkan secara otomatis ke halaman login (`/login`).
- **Form Login Interaktif**: Setiap sesi memerlukan pengisian form (Email dan Kata Sandi) serta pemilihan tab peran yang sesuai sebelum diarahkan ke dashboard.

---

## 2. Akun Super Admin

Akun ini memiliki hak akses penuh ke dashboard Super Admin (`/admin`), meliputi:
- Moderasi pendaftaran mitra pemilik kost baru (Approve/Reject).
- Verifikasi dan persetujuan listing kost baru sebelum tayang publik.
- Moderasi ulasan penghuni kost dan penanganan laporan flag spam.
- Konfirmasi pembayaran paket langganan mitra (Featured, Reguler).
- Pemantauan log aktivitas sistem (Audit Trail) dan status health platform.

| No | Nama Lengkap | Email Terdaftar | Kata Sandi | Jabatan / Scope |
|:---|:---|:---|:---|:---|
| 1 | **Super Admin Havena** *(Utama)* | `AdminHavenaKost@gmail.com` | `HavenaKost123` | Root Admin & Owner Platform |
| 2 | **Admin Operasional** | `admin@havenakost.id` | `HavenaKost123` | Tim Operasional & Verifikasi Listing |
| 3 | **Rizky Pratama** | `rizky@havenakost.id` | `HavenaKost123` | PM & QA Lead Moderasi |
| 4 | **Alya Rahmadani** | `alya@havenakost.id` | `HavenaKost123` | UI/UX & Moderasi Desain |
| 5 | **Dimas Anggara** | `dimas@havenakost.id` | `HavenaKost123` | Lead Digital Marketing & Langganan |

---

## 3. Akun Mitra Pemilik Kost (Owner)

Akun mitra pemilik kost memiliki hak akses ke dashboard mitra (`/owner`), meliputi:
- Pengelolaan profil usaha & data legalitas kost.
- Tambah, edit, dan pengajuan publikasi listing kost.
- Manajemen kamar, status hunian (isi/kosong), dan cetak QR Code ulasan penghuni.
- Pemantauan ulasan penghuni dan respon tanggapan resmi pemilik.
- Pencatatan buku kas keuangan kost (pemasukan sewa & pengeluaran operasional).
- Peningkatan paket langganan kost (Trial, Reguler, Featured).

| No | Nama Pemilik | Email Terdaftar | Kata Sandi | Kost yang Dikelola | Lokasi |
|:---|:---|:---|:---|:---|:---|
| 1 | **Ratna Kusuma Dewi** *(Default Demo)* | `ratna.kusuma@gmail.com` | `havena123` | Kost Griya Cendekia Syariah | Lowokwaru (Dekat UM/UB) |
| 2 | **Hendra Wijaya** | `hendra.wijaya@gmail.com` | `havena123` | Kost Putra Tlogomas Asri | Lowokwaru (Dekat UMM) |
| 3 | **Dewi Anggraini** | `dewi.anggraini@gmail.com` | `havena123` | Kost Sigura-gura Nada | Lowokwaru |
| 4 | **Agus Setiawan** | `agus.setiawan@gmail.com` | `havena123` | Kost Suhat Residence | Lowokwaru (Dekat Polinema) |
| 5 | **Kartini Rahayu** | `kartini.rahayu@gmail.com` | `havena123` | Kost Putri Sumbersari Indah | Sumbersari (Dekat UM) |
| 6 | **Bambang Prasetyo** | `bambang.p@gmail.com` | `havena123` | Kost Paviliun Dieng | Sukun |
| 7 | **Nur Hidayah** | `nur.hidayah@gmail.com` | `havena123` | Kost Muslimah Dinoyo | Dinoyo (Dekat Unisma) |

---

## 4. Panduan Masuk ke Dashboard (Login Flow)

1. Buka URL: **`http://localhost:3000/login`** (atau klik tombol **"Masuk"** di pojok kanan atas navbar pada halaman utama).
2. Pilih tab peran yang diinginkan:
   - Pilih tab **"Mitra Pemilik Kost"** jika ingin mengelola listing kost.
   - Pilih tab **"Super Admin"** jika ingin mengelola verifikasi dan sistem.
3. Masukkan **Email Akun** dan **Kata Sandi** sesuai tabel di atas (atau gunakan tombol bantuan *Isi Otomatis Kredensial Uji* di bagian bawah form).
4. Klik tombol **"Masuk ke Dashboard"**.
5. Sistem akan memvalidasi sesi dan mengarahkan secara instan ke dashboard yang bersangkutan:
   - Mitra Pemilik $\rightarrow$ `/owner`
   - Super Admin $\rightarrow$ `/admin`

---

## 5. Fitur Keamanan & Keluar (Logout)

- Untuk keluar dari dashboard, klik tombol ikon merah **Keluar (Logout)** di bagian bawah sidebar dashboard atau melalui menu profil di navbar.
- Setelah sesi dihapus, pengguna tidak dapat lagi mengakses dashboard hingga melakukan proses login ulang dengan kredensial yang valid.
