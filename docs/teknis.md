# Detail teknis

## Kenapa dua cara scraping?

`gosom/google-maps-scraper` menjalankan Chromium lewat Playwright, lalu
mengintersep respons XHR dari halaman Google Maps. Respons itu berisi JSON
`)]}'` + array hasil. Repo memotong baris pertama lalu mem-parse dengan
`gmaps.ParseSearchResults` (`gmaps/multiple.go`).

Endpoint yang sama bisa dipanggil langsung tanpa browser. Di mesin ini unduhan
browser Playwright hanya ±30 KB/s (Chromium ±170 MB), jadi data diambil lewat
endpoint langsung menggunakan template `pb` dan indeks field yang identik dengan
repo. Kalau kamu ingin menjalankan repo apa adanya, langkahnya ada di README
(Opsi A).

## Request yang dipakai

```
GET https://maps.google.com/search
  ?tbm=map
  &authuser=0
  &hl=id
  &gl=id
  &q=<query>
  &pb=!4m12!1m3!1d3826.902183192154!2d<lon>!3d<lat>!2m3!1f0!2f0!3f0
      !3m2!1i600!2i800!4f<zoom>!7i20!8i<offset>...
```

- `!2d` = longitude pusat, `!3d` = latitude pusat, `!4f` = zoom.
- `!7i20` = ukuran halaman, `!8i<offset>` = offset (0, 20, 40, ...).
- Template `pb` diambil apa adanya dari `buildGoogleMapsParams` di repo.

## Pemetaan field (dari `ParseSearchResults`)

| Field output | Lokasi di JSON |
|---|---|
| `data_id` | `business[10]` (format `0x…:0x…`) |
| `title` | `business[11]` |
| `category` | `business[13]` (array) |
| `address` | `business[2]` (array, digabung `, `) |
| `website` | `business[7][0]` |
| `review_rating` | `business[4][7]` |
| `review_count` | `business[4][8]` |
| `latitude` / `longitude` | `business[9][2]` / `business[9][3]` |
| `phone` | `business[178][0][0]` |
| `status` | `business[34][4][4]` |
| `timezone` | `business[30]` |

`link` dibuat dari `data_id`: bagian setelah `:` adalah CID dalam hex, lalu
diubah ke desimal → `https://www.google.com/maps?cid=<desimal>`. Link ini sudah
diuji membuka listing yang benar.

## Filter yang diterapkan

- Dedupe berdasarkan `data_id` (satu tempat hanya muncul sekali).
- Radius 15 km dari titik pusat Malang (-7.9666, 112.6326), sama seperti
  `filterAndSortEntriesWithinRadius` di repo.
- `relevan_kost` = `ya` bila nama/kategori/alamat/deskripsi cocok dengan
  `kost|kos|asrama|dorm|hostel|guest house|homestay|apartemen|sewa`.
- `wilayah` = `Kota Malang` bila alamat mengandung “Kota Malang”/“Malang City”.

## Kolom CSV bersih (`data/kost-malang.csv`)

`nama, kategori, alamat, telepon, website, rating, jumlah_ulasan, harga, status,
latitude, longitude, link_google_maps, link_ulasan, place_id, wilayah,
relevan_kost, sumber_query`

## Kolom CSV mentah

Sama dengan `CsvHeaders()` milik repo (36 kolom), termasuk `open_hours`,
`popular_times`, `plus_code`, `cid`, `street_view_url`, `place_id`, `images`,
`about`, `user_reviews`, `emails`, dll. Kolom yang tidak diisi oleh mode search
(mis. `emails`, `user_reviews`) akan kosong.

## Menambah cakupan

- Tambah kata kunci per kelurahan/kampus di `data/queries*.txt`.
- Turunkan `--radius` dan jalankan per kecamatan agar hasil per query tidak
  mentok di ±120.
- Jalankan repo asli dengan `-grid-bbox` untuk grid 1 km (lihat README).
