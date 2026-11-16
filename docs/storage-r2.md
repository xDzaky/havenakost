# Cloudflare R2 Storage

## Environment

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_URL=
```

`R2_PUBLIC_URL` boleh kosong. Bucket tetap privat dan foto disajikan melalui
`GET /api/public/photos?key=...`.

## Alur upload

1. Owner login dan memilih listing miliknya.
2. `POST /api/owner/listings/{id}/photos/presign` dengan filename, MIME, size.
3. Backend memvalidasi ownership + tipe file + ukuran.
4. Backend membuat object key server-side:
   `kosts/{kostId}/{uuid}.{jpg|png|webp}`.
5. Backend mengembalikan presigned `PUT` (300 detik) + headers.
6. Frontend upload langsung ke R2.
7. Frontend memanggil `POST /api/owner/listings/{id}/photos/confirm` dengan
   `object_key`.
8. Backend memvalidasi prefix key, `HEAD` object, MIME, ukuran, lalu menyimpan
   metadata `kost_photos`.
9. `PATCH /api/owner/photos/{photoId}` mengatur alt text, urutan, cover.
10. `DELETE /api/owner/photos/{photoId}` menghapus metadata lalu object R2.

## Batasan

- Hanya JPEG/PNG/WebP.
- Maksimal 10 MB per file dan 50 foto per listing.
- Object key tidak boleh ditentukan client.
- Satu cover per listing dijaga partial unique index.
- Presigned URL tidak permanen.
- Presigned URL tidak boleh disimpan di database.

## Bila upload sukses tetapi confirm gagal

Object yatim dapat tersisa di R2. Mekanisme cleanup dapat berupa cron/script
terpisah yang membandingkan `kost_photos.object_key` dengan isi bucket. Jangan
menghapus object yang masih direferensikan database.

## Foto publik

Route proxy memeriksa bahwa `object_key` terdaftar di `kost_photos` dan listing
berstatus `published` serta belum dihapus. Draft/tidak published tidak dapat
diakses lewat proxy.

Jika bucket diberi domain publik (custom domain atau `r2.dev`), isi
`R2_PUBLIC_URL` (tanpa trailing slash). API akan menyimpan URL langsung.

## Bukti pembayaran langganan

`payment_proof` menerima URL/object key. Untuk keamanan, gunakan URL yang
memang dapat diakses admin. Jangan menyimpan file bukti di database.
