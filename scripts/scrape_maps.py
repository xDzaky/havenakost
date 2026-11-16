#!/usr/bin/env python3
"""Scrape listing kost di Malang dari Google Maps (tanpa browser).

Memakai endpoint dan aturan parsing yang sama dengan
github.com/gosom/google-maps-scraper (gmaps/searchjob.go + gmaps/multiple.go),
jadi hasilnya setara dengan CSV scraper tersebut, tetapi tidak butuh
unduhan Chromium ~170 MB.

Hasil:
    data/kost-malang-raw.csv   (kolom sama seperti scraper + link)
    data/kost-malang-raw.json

Pemakaian:
    python3 scripts/scrape_maps.py
    python3 scripts/scrape_maps.py --queries data/queries.txt --max-pages 6
"""

import argparse
import csv
import json
import random
import re
import sys
import time
import urllib.parse
import math
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36")

HEADERS = [
    "input_id", "link", "title", "category", "address", "open_hours",
    "popular_times", "website", "phone", "plus_code", "review_count",
    "review_rating", "reviews_per_rating", "latitude", "longitude", "cid",
    "status", "descriptions", "reviews_link", "thumbnail", "timezone",
    "price_range", "data_id", "street_view_url", "place_id", "images",
    "reservations", "order_online", "menu", "owner", "complete_address",
    "credit_cards_accepted", "about", "user_reviews", "user_reviews_extended",
    "emails",
]


def build_url(query, lat, lon, zoom, offset, page_size=20):
    viewport_w, viewport_h = 600, 800
    pb = (
        "!4m12!1m3!1d3826.902183192154!2d%.4f!3d%.4f!2m3!1f0!2f0!3f0!3m2!1i%d!2i%d"
        "!4f%.1f!7i%d!8i%d"
        "!10b1!12m22!1m3!18b1!30b1!34e1!2m3!5m1!6e2!20e3!4b0!10b1!12b1!13b1!16b1"
        "!17m1!3e1!20m3!5e2!6b1!14b1!46m1!1b0"
        "!96b1!19m4!2m3!1i360!2i120!4i8"
    ) % (lon, lat, viewport_w, viewport_h, zoom, page_size, offset)
    params = {
        "tbm": "map",
        "authuser": "0",
        "hl": "id",
        "gl": "id",
        "q": query,
        "pb": pb,
    }
    return "https://maps.google.com/search?" + urllib.parse.urlencode(params)


def fetch(url, retries=4):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA,
                "Accept": "*/*",
                "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
                "Referer": "https://www.google.com/maps/",
            })
            with urllib.request.urlopen(req, timeout=45) as resp:
                raw = resp.read().decode("utf-8", "replace")
            if not raw:
                raise ValueError("empty body")
            return raw
        except Exception as exc:  # noqa: BLE001
            if attempt == retries - 1:
                raise
            wait = 2 ** attempt + random.random()
            print(f"      retry {attempt + 1} setelah error: {exc} ({wait:.1f}s)",
                  file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError("unreachable")


def strip_prefix(raw):
    # endpoint mengembalikan ")]}'\n" sebelum JSON
    return raw.split("\n", 1)[1] if "\n" in raw else raw


def at(arr, *idx):
    """Ambil elemen bersarang, aman dari IndexError/None (mirip getNthElementAndCast)."""
    cur = arr
    for i in idx:
        if not isinstance(cur, list) or i >= len(cur) or cur[i] is None:
            return None
        cur = cur[i]
    return cur


def haversine_m(lat1, lon1, lat2, lon2):
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def parse_page(raw, query):
    data = json.loads(strip_prefix(raw))
    items = at(data, 0, 1)
    if not isinstance(items, list):
        return []
    out = []
    for it in items[1:]:
        biz = at(it, 14)
        if not isinstance(biz, list):
            continue
        name = at(biz, 11)
        data_id = at(biz, 10)
        if not name or not data_id or ":" not in data_id:
            continue
        addr_parts = at(biz, 2) or []
        address = ", ".join(str(p) for p in addr_parts if p)
        try:
            cid = str(int(data_id.split(":")[1], 16))
        except (ValueError, IndexError):
            cid = ""
        lat = at(biz, 9, 2)
        lon = at(biz, 9, 3)
        out.append({
            "input_id": query,
            "link": f"https://www.google.com/maps?cid={cid}" if cid else "",
            "title": name,
            "category": ", ".join(str(c) for c in (at(biz, 13) or [])),
            "address": address,
            "complete_address": address,
            "website": at(biz, 7, 0) or "",
            "phone": (at(biz, 178, 0, 0) or "").replace(" ", ""),
            "review_rating": at(biz, 4, 7) or "",
            "review_count": at(biz, 4, 8) or "",
            "latitude": lat if lat is not None else "",
            "longitude": lon if lon is not None else "",
            "cid": cid,
            "status": at(biz, 34, 4, 4) or "",
            "timezone": at(biz, 30) or "",
            "data_id": data_id,
        })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--queries", default=str(DATA / "queries.txt"))
    ap.add_argument("--out", default=str(DATA / "kost-malang-raw.csv"))
    ap.add_argument("--lat", type=float, default=-7.9666)
    ap.add_argument("--lon", type=float, default=112.6326)
    ap.add_argument("--zoom", type=float, default=13.0)
    ap.add_argument("--max-pages", type=int, default=6, help="maks 20 hasil per halaman")
    ap.add_argument("--sleep", type=float, default=0.7)
    ap.add_argument("--radius", type=float, default=15000.0,
                    help="buang hasil di luar radius meter dari titik pusat")
    ap.add_argument("--append", action="store_true",
                    help="tambahkan ke file hasil yang sudah ada (lewati listing duplikat)")
    ap.add_argument("--limit-queries", type=int, default=0)
    args = ap.parse_args()

    queries = [q.strip() for q in Path(args.queries).read_text(encoding="utf-8").splitlines()
               if q.strip() and not q.startswith("#")]
    if args.limit_queries:
        queries = queries[:args.limit_queries]

    seen = {}
    mode = "a" if args.append else "w"
    out_path = Path(args.out)
    if args.append and out_path.exists():
        with out_path.open(encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                if row.get("data_id"):
                    seen[row["data_id"]] = row
        print(f"Mode append: {len(seen)} listing sudah ada")

    with open(args.out, mode, encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=HEADERS, extrasaction="ignore")
        if not (args.append and out_path.exists() and out_path.stat().st_size > 0):
            writer.writeheader()

        for qi, query in enumerate(queries, 1):
            found_before = len(seen)
            for page in range(args.max_pages):
                offset = page * 20
                url = build_url(query, args.lat, args.lon, args.zoom, offset)
                try:
                    entries = parse_page(fetch(url), query)
                except Exception as exc:  # noqa: BLE001
                    print(f"  [{qi}/{len(queries)}] {query} offset {offset}: gagal: {exc}")
                    break
                new = 0
                kept = 0
                for e in entries:
                    lat, lon = e["latitude"], e["longitude"]
                    if args.radius and isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
                        if haversine_m(args.lat, args.lon, lat, lon) > args.radius:
                            continue
                    kept += 1
                    key = e["data_id"]
                    if key in seen:
                        continue
                    seen[key] = e
                    writer.writerow(e)
                    new += 1
                f.flush()
                print(f"  [{qi}/{len(queries)}] {query} hal {page + 1}: "
                      f"+{new} baru (total {len(seen)})")
                if len(entries) < 20 or new == 0:
                    break
                time.sleep(args.sleep + random.random() * 0.4)
            if len(seen) == found_before:
                print(f"  [{qi}/{len(queries)}] {query}: tidak ada hasil")
            time.sleep(args.sleep)

    rows = list(seen.values())
    Path(args.out).with_suffix(".json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nSelesai: {len(rows)} listing unik -> {args.out}")


if __name__ == "__main__":
    main()
