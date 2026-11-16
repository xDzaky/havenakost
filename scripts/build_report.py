#!/usr/bin/env python3
"""Bersihkan hasil scrape Google Maps -> CSV, GeoJSON, Markdown, dan viewer.html.

Pemakaian:
    python3 scripts/build_report.py data/kost-malang-raw.csv
"""

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

KOST_RE = re.compile(
    r"(kost|kos-kosan|kosan|kostan|kos\b|asrama|rumah sewa|sewa kamar|"
    r"boarding|dorm|hostel|guest ?house|homestay|apartemen|apartment)",
    re.IGNORECASE,
)

OUT_FIELDS = [
    "nama", "kategori", "alamat", "telepon", "website", "rating",
    "jumlah_ulasan", "harga", "status", "latitude", "longitude",
    "link_google_maps", "link_ulasan", "place_id", "wilayah", "relevan_kost",
    "sumber_query",
]


def norm(r, key, *alts):
    for k in (key, *alts):
        v = (r.get(k) or "").strip()
        if v and v not in ("[]", "{}", "null"):
            return v
    return ""


def load_rows(path):
    path = Path(path)
    if path.suffix.lower() == ".json":
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, list) else raw.get("results", [])
    with path.open(encoding="utf-8", errors="replace", newline="") as f:
        return list(csv.DictReader(f))


def clean(rows):
    seen = {}
    for r in rows:
        name = norm(r, "title", "name")
        if not name:
            continue
        lat = norm(r, "latitude", "lat")
        lng = norm(r, "longitude", "lng", "lon")
        link = norm(r, "link", "url")
        pid = norm(r, "place_id", "placeId", "data_id")
        key = pid or link or f"{name}|{lat}|{lng}"
        if key in seen:
            continue

        kategori = norm(r, "category", "categories")
        alamat = norm(r, "complete_address", "address")
        deskripsi = norm(r, "descriptions", "description", "about")
        haystack = " ".join([name, kategori, alamat, deskripsi])

        seen[key] = {
            "nama": name,
            "kategori": kategori,
            "alamat": alamat,
            "telepon": norm(r, "phone", "phone_number"),
            "website": norm(r, "website", "site"),
            "rating": norm(r, "review_rating", "rating"),
            "jumlah_ulasan": norm(r, "review_count", "reviews_count"),
            "harga": norm(r, "price_range", "price"),
            "status": norm(r, "status", "business_status"),
            "latitude": lat,
            "longitude": lng,
            "link_google_maps": link,
            "link_ulasan": norm(r, "reviews_link"),
            "place_id": pid,
            "wilayah": ("Kota Malang" if ("Kota Malang" in alamat or "Malang City" in alamat)
                        else "Sekitar Malang"),
            "relevan_kost": "ya" if KOST_RE.search(haystack) else "cek",
            "sumber_query": norm(r, "input_id", "query", "search_query"),
        }
    return list(seen.values())


def to_float(v):
    try:
        return float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return None


def write_csv(rows, path):
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=OUT_FIELDS)
        w.writeheader()
        for r in sorted(rows, key=lambda x: (x["relevan_kost"] != "ya", -float(x["rating"] or 0))):
            w.writerow({k: r.get(k, "") for k in OUT_FIELDS})


def write_geojson(rows, path):
    features = []
    for r in rows:
        lat, lng = to_float(r["latitude"]), to_float(r["longitude"])
        if lat is None or lng is None:
            continue
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lng, lat]},
            "properties": {
                "name": r["nama"],
                "category": r["kategori"],
                "address": r["alamat"],
                "phone": r["telepon"],
                "rating": r["rating"],
                "reviews": r["jumlah_ulasan"],
                "price_range": r["harga"],
                "google_maps_url": r["link_google_maps"],
            },
        })
    path.write_text(json.dumps({"type": "FeatureCollection", "features": features},
                               ensure_ascii=False, indent=1), encoding="utf-8")


def xml_escape(s):
    return (str(s or "").replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def write_kml(rows, path):
    """KML untuk diimpor ke Google My Maps (google.com/mymaps)."""
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>',
        "<name>Kost Malang (hasil scrape)</name>",
    ]
    for r in rows:
        lat, lng = to_float(r["latitude"]), to_float(r["longitude"])
        if lat is None or lng is None:
            continue
        desc = "<br>".join(filter(None, [
            xml_escape(r["kategori"]),
            xml_escape(r["alamat"]),
            f'Telepon: {xml_escape(r["telepon"])}' if r["telepon"] else "",
            f'Rating: {r["rating"]} ({r["jumlah_ulasan"]} ulasan)' if r["rating"] else "",
            f'<a href="{xml_escape(r["link_google_maps"])}">Buka di Google Maps</a>'
            if r["link_google_maps"] else "",
        ]))
        parts.append(
            "<Placemark>"
            f"<name>{xml_escape(r['nama'])}</name>"
            f"<description><![CDATA[{desc}]]></description>"
            f"<Point><coordinates>{lng},{lat},0</coordinates></Point>"
            "</Placemark>"
        )
    parts.append("</Document></kml>")
    path.write_text("\n".join(parts), encoding="utf-8")


def write_markdown(rows, path):
    rows = sorted(rows, key=lambda x: (x["relevan_kost"] != "ya", -float(x["rating"] or 0)))
    lines = [
        "# Data Kost Malang (hasil scrape Google Maps)", "",
        f"Total listing unik: **{len(rows)}**", "",
        "| # | Nama | Kategori | Alamat | Rating | Ulasan | Telepon | Google Maps |",
        "|---|------|----------|--------|--------|--------|---------|-------------|",
    ]
    for i, r in enumerate(rows, 1):
        link = r["link_google_maps"]
        nama = r["nama"].replace("|", "\\|")
        alamat = r["alamat"].replace("|", "\\|")
        maps = f"[buka]({link})" if link else "-"
        lines.append(
            f"| {i} | {nama} | {r['kategori']} | {alamat} | {r['rating']} | "
            f"{r['jumlah_ulasan']} | {r['telepon']} | {maps} |"
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_viewer(rows, path):
    rows = sorted(rows, key=lambda x: (x["relevan_kost"] != "ya", -float(x["rating"] or 0)))
    payload = json.dumps(rows, ensure_ascii=False).replace("</", "<\\/")
    html = VIEWER_TEMPLATE.replace("__DATA__", payload).replace("__COUNT__", str(len(rows)))
    path.write_text(html, encoding="utf-8")


VIEWER_TEMPLATE = """<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Data Kost Malang - hasil scrape Google Maps</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
         background: #0d1117; color: #e6edf3; }
  header { padding: 20px 24px; border-bottom: 1px solid #21262d; background: #161b22;
           position: sticky; top: 0; z-index: 5; }
  h1 { margin: 0 0 4px; font-size: 18px; font-weight: 600; }
  .sub { color: #8b949e; font-size: 12.5px; }
  .bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 12px; }
  input[type=search] { flex: 1 1 260px; max-width: 420px; padding: 8px 12px; border-radius: 8px;
                       border: 1px solid #30363d; background: #0d1117; color: inherit; }
  label { display: inline-flex; gap: 6px; align-items: center; color: #8b949e; font-size: 13px; }
  .count { margin-left: auto; color: #8b949e; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 9px 14px; text-align: left; border-bottom: 1px solid #21262d; vertical-align: top; }
  th { background: #161b22; font-size: 12px; text-transform: uppercase; letter-spacing: .04em;
       color: #8b949e; position: sticky; top: 92px; }
  tr:hover td { background: #161b22; }
  a { color: #58a6ff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .tag { display: inline-block; padding: 1px 7px; border-radius: 99px; font-size: 11.5px;
         border: 1px solid #30363d; color: #8b949e; }
  .tag.kost { border-color: #238636; color: #3fb950; }
  .rating { color: #d29922; font-variant-numeric: tabular-nums; }
  .muted { color: #6e7681; }
  .wrap { overflow-x: auto; }
  td.name { min-width: 220px; font-weight: 500; }
  td.addr { min-width: 260px; color: #8b949e; font-size: 13px; }
  @media (max-width: 720px) { th { display: none; } td { display: block; border: 0; padding: 3px 16px; } tr { display: block; border-bottom: 1px solid #21262d; padding: 8px 0; } }
</style>
</head>
<body>
<header>
  <h1>Data Kost Malang &mdash; hasil scrape Google Maps</h1>
  <div class="sub">Klik "Google Maps" untuk membuka listing aslinya dan cek sendiri. Diurutkan: relevan kost dulu, lalu rating.</div>
  <div class="bar">
    <input id="q" type="search" placeholder="Cari nama, alamat, kategori, telepon...">
    <label><input id="onlyKost" type="checkbox"> Hanya yang terdeteksi kost</label>
    <label><input id="onlyCity" type="checkbox"> Hanya Kota Malang</label>
    <span class="count" id="count"></span>
  </div>
</header>
<div class="wrap">
<table>
  <thead><tr>
    <th>#</th><th>Nama</th><th>Kategori</th><th>Alamat</th><th>Rating</th>
    <th>Telepon</th><th>Harga</th><th>Google Maps</th>
  </tr></thead>
  <tbody id="rows"></tbody>
</table>
</div>
<script>
const DATA = __DATA__;
const TOTAL = __COUNT__;
const q = document.getElementById('q');
const onlyKost = document.getElementById('onlyKost');
const onlyCity = document.getElementById('onlyCity');
const tbody = document.getElementById('rows');
const count = document.getElementById('count');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function render() {
  const term = q.value.trim().toLowerCase();
  const list = DATA.filter(r => {
    if (onlyKost.checked && r.relevan_kost !== 'ya') return false;
    if (onlyCity.checked && r.wilayah !== 'Kota Malang') return false;
    if (!term) return true;
    return [r.nama, r.alamat, r.kategori, r.telepon, r.website, r.harga]
      .join(' ').toLowerCase().includes(term);
  });
  count.textContent = `${list.length} dari ${TOTAL} listing`;
  tbody.innerHTML = list.map((r, i) => {
    const maps = r.link_google_maps
      ? `<a href="${esc(r.link_google_maps)}" target="_blank" rel="noopener">Google Maps ↗</a>`
      : '<span class="muted">-</span>';
    const tag = r.relevan_kost === 'ya'
      ? '<span class="tag kost">kost</span>'
      : '<span class="tag">cek</span>';
    return `<tr>
      <td class="muted">${i + 1}</td>
      <td class="name">${esc(r.nama)} ${tag} <span class="muted" style="font-weight:400;font-size:11.5px">${esc(r.wilayah)}</span></td>
      <td>${esc(r.kategori)}</td>
      <td class="addr">${esc(r.alamat)}</td>
      <td class="rating">${r.rating ? '★ ' + esc(r.rating) + ` <span class="muted">(${esc(r.jumlah_ulasan || 0)})</span>` : '<span class="muted">-</span>'}</td>
      <td>${esc(r.telepon) || '<span class="muted">-</span>'}</td>
      <td>${esc(r.harga) || '<span class="muted">-</span>'}</td>
      <td>${maps}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" class="muted" style="padding:24px">Tidak ada hasil.</td></tr>';
}
q.addEventListener('input', render);
onlyKost.addEventListener('change', render);
onlyCity.addEventListener('change', render);
render();
</script>
</body>
</html>
"""


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else str(DATA / "kost-malang-raw.csv")
    rows = clean(load_rows(src))
    if not rows:
        print("Tidak ada data. Cek file:", src)
        sys.exit(1)
    write_csv(rows, DATA / "kost-malang.csv")
    write_geojson(rows, DATA / "kost-malang.geojson")
    write_kml(rows, DATA / "kost-malang.kml")
    write_markdown(rows, DATA / "kost-malang.md")
    write_viewer(rows, ROOT / "viewer.html")
    kost = sum(1 for r in rows if r["relevan_kost"] == "ya")
    print(f"OK: {len(rows)} listing unik ({kost} terdeteksi kost)")
    print("  data/kost-malang.csv")
    print("  data/kost-malang.geojson")
    print("  data/kost-malang.kml")
    print("  data/kost-malang.md")
    print("  viewer.html")


if __name__ == "__main__":
    main()
