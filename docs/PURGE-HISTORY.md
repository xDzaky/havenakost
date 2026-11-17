# Panduan Pembersihan Riwayat Git (Purge Sensitive History)

Dokumen ini berisi instruksi manual yang **wajib dijalankan oleh pemilik repositori / pengguna** untuk menghapus berkas data sensitif (`data/`, `viewer.html`, dan laporan audit keamanan) secara permanen dari seluruh riwayat komit Git.

> ⚠️ **PERINGATAN PENTING SEBELUM MEMULAI:**
> 1. Perintah ini akan menulis ulang riwayat komit Git (*history rewrite*). Semua commit hash akan berubah.
> 2. Kolaborator yang sedang bekerja pada repositori ini harus melakukan clone ulang repositori setelah proses selesai (`git pull` biasa akan menimbulkan konflik).
> 3. Fork repositori yang sudah ada di akun GitHub orang lain dan cache pihak ketiga (misalnya bot pengarsip/pull request lama) tidak otomatis terhapus.
> 4. Jika data nomor telepon atau kredensial yang pernah ter-commit dianggap sangat sensitif, disarankan untuk merotasi seluruh kredensial dan mempertimbangkan membuat repositori baru yang bersih (*fresh repository*).

---

## Langkah-Langkah Pembersihan Riwayat

Jalankan perintah berikut di terminal komputer lokal Anda:

### 1. Pasang alat `git-filter-repo`
```bash
pip install git-filter-repo
```
*(Atau via Homebrew di macOS: `brew install git-filter-repo`)*

### 2. Buat mirror clone dari repositori
```bash
git clone --mirror https://github.com/xDzaky/havenakost.git havenakost-purge.git
cd havenakost-purge.git
```

### 3. Jalankan penyaringan riwayat (filter-repo)
Perintah ini akan menghapus jejak direktori `data/`, file `viewer.html`, dan seluruh dokumen laporan audit dari seluruh commit tree:
```bash
git filter-repo --path data --path viewer.html --path-glob 'docs/Laporan*' --invert-paths
```

### 4. Push kembali ke repositori GitHub secara force mirror
```bash
git push --force --mirror
```

### 5. Bersihkan direktori sementara
```bash
cd ..
rm -rf havenakost-purge.git
```

---

## Verifikasi Pasca-Purge

Untuk memverifikasi bahwa file sudah benar-benar hilang dari seluruh riwayat:
```bash
git clone https://github.com/xDzaky/havenakost.git havenakost-verify
cd havenakost-verify
git log --all --full-history -- "data/*" "viewer.html" "docs/Laporan*"
```
Output perintah di atas harus kosong (tidak ada commit yang ditemukan).
