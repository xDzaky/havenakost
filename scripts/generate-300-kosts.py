import csv
import json
import os
import re
import random

ROOM_POOL = [
    '1522708323590-d24dbb6b0267', '1502672260266-1c1ef2d93688', '1560448204-e02f11c3d0e2',
    '1493809842364-78817add7ffb', '1484154218962-a197022b5858', '1586023492125-27b2c045efd7',
    '1595526114035-0d45ed16cfbf', '1598928506311-c55ded91a20c', '1567767292278-a4f21aa2d36e',
    '1618773928121-c32242e63f39', '1631049307264-da0ec9d70304', '1600210492486-724fe5c67fb0',
    '1595576508898-0ad5c879a061', '1616594039964-ae9021a400a0', '1616486338812-3dadae4b4ace',
    '1615873968403-89e068629265', '1554995207-c18c203602cb', '1556911220-bff31c812dba',
    '1598300042247-d088f8ab3a91', '1590490360182-c33d57733427'
]

ENV_POOL = [
    '1600585154340-be6161a56a0c', '1600596542815-ffad4c1539a9', '1512917774080-9991f1c4c750',
    '1564013799919-ab600027ffc6', '1570129477492-45c003edd2be', '1523217582562-09d0def993a6',
    '1460317442991-0ec2093e6921', '1580587771525-78b9dba3b914'
]

PRICES = [
    650000, 750000, 850000, 950000, 1050000, 1150000, 1250000, 1350000,
    1450000, 1550000, 1650000, 1750000, 1850000, 2000000, 2200000, 2500000
]

def unsplash_url(pid):
    return f"https://images.unsplash.com/photo-{pid}?auto=format&fit=crop&w=720&q=80"

def extract_300_kosts():
    with open('data/kost-malang.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = [r for r in reader if r.get('relevan_kost') == 'ya' and r.get('latitude') and r.get('longitude') and r.get('nama')]

    random.seed(42)
    selected_raw = []
    seen = set()

    for r in rows:
        name = re.sub(r'[\r\n\t]+', ' ', r['nama'])
        name = re.sub(r'\s+', ' ', name).strip()
        if len(name) < 4 or name.lower() in seen:
            continue
        try:
            lat = float(r['latitude'])
            lng = float(r['longitude'])
        except:
            continue
        if not (-8.05 <= lat <= -7.88 and 112.54 <= lng <= 112.70):
            continue
        seen.add(name.lower())
        selected_raw.append(r)
        if len(selected_raw) >= 300:
            break

    print(f"Total raw candidates picked: {len(selected_raw)}")

    kosts = []
    for idx, r in enumerate(selected_raw):
        kid = f"k{idx + 1}"
        owner_id = f"o-{((idx % 12) + 1)}"
        name = re.sub(r'[\r\n\t]+', ' ', r['nama']).strip()
        name = re.sub(r'\s+', ' ', name)
        slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') or kid
        
        # Gender / Kost Type
        name_lower = name.lower()
        if any(w in name_lower for w in ['putri', 'puteri', 'muslimah', 'cewek', 'wanita', 'akhwat']):
            ktype = 'putri'
        elif any(w in name_lower for w in ['putra', 'pria', 'cowok', 'ikhwan']):
            ktype = 'putra'
        elif any(w in name_lower for w in ['pasutri', 'keluarga']):
            ktype = 'pasutri'
        else:
            dice = random.random()
            if dice < 0.45:
                ktype = 'putri'
            elif dice < 0.75:
                ktype = 'putra'
            elif dice < 0.93:
                ktype = 'campur'
            else:
                ktype = 'pasutri'

        # District & Region
        addr = r.get('alamat', '')
        addr_lower = addr.lower()
        if 'lowokwaru' in addr_lower or 'jatimulyo' in addr_lower or 'tlogomas' in addr_lower or 'ketawanggede' in addr_lower or 'sumbersari' in addr_lower:
            district = 'Lowokwaru'
        elif 'klojen' in addr_lower or 'penanggungan' in addr_lower or 'orob' in addr_lower:
            district = 'Klojen'
        elif 'sukun' in addr_lower or 'kebonsari' in addr_lower or 'bandulan' in addr_lower:
            district = 'Sukun'
        elif 'blimbing' in addr_lower or 'balearjosari' in addr_lower or 'arjosari' in addr_lower or 'polehan' in addr_lower:
            district = 'Blimbing'
        elif 'kedungkandang' in addr_lower or 'kotalama' in addr_lower:
            district = 'Kedungkandang'
        elif 'dau' in addr_lower or 'landungsari' in addr_lower:
            district = 'Dau'
        elif 'batu' in addr_lower:
            district = 'Kota Batu'
        elif 'dinoyo' in addr_lower:
            district = 'Dinoyo'
        else:
            district = 'Kota Malang'

        region = 'Kota Batu' if 'batu' in district.lower() else ('Kabupaten Malang' if district == 'Dau' else 'Kota Malang')
        lat = round(float(r['latitude']), 6)
        lng = round(float(r['longitude']), 6)

        # Price
        price = PRICES[idx % len(PRICES)]
        periods = ['Bulanan', 'Per 3 Bulan', 'Per 6 Bulan']
        if price >= 1200000:
            periods.append('Tahunan')

        # Available rooms
        if idx % 10 == 0:
            avail = 0 # 10% sold out
        else:
            avail = (idx % 5) + 1

        # Rating & reviews
        try:
            rating = round(float(r['rating']), 1)
            if rating < 3.8 or rating > 5.0:
                rating = round(random.uniform(4.2, 5.0), 1)
        except:
            rating = round(random.uniform(4.2, 5.0), 1)

        try:
            reviews_count = int(r['jumlah_ulasan'])
            if reviews_count <= 0:
                reviews_count = random.randint(8, 95)
        except:
            reviews_count = random.randint(8, 95)

        # Phone / WhatsApp
        raw_phone = r.get('telepon', '').replace('-', '').replace(' ', '').replace('+', '').strip()
        if raw_phone.startswith('08'):
            phone = '62' + raw_phone[1:]
        elif raw_phone.startswith('628'):
            phone = raw_phone
        else:
            phone = f"6281{random.randint(20000000, 99999999)}"

        is_featured = (idx < 15 or idx % 20 == 0)

        # Description
        desc = (
            f"Kost {ktype.capitalize()} nyaman dan strategis berlokasi di {district}, {region}. "
            f"Akses jalan mudah, dekat kampus dan pusat perbelanjaan, lingkungan tenang dan aman dengan pengawasan terpadu."
        )

        # Photos
        p1 = unsplash_url(ROOM_POOL[idx % len(ROOM_POOL)])
        p2 = unsplash_url(ROOM_POOL[(idx + 7) % len(ROOM_POOL)])
        p3 = unsplash_url(ENV_POOL[idx % len(ENV_POOL)])
        photos = [
            {'id': f"p-{kid}-1", 'kost_id': kid, 'photo_url': p1, 'category': 'room', 'is_cover': True, 'sort_order': 0},
            {'id': f"p-{kid}-2", 'kost_id': kid, 'photo_url': p2, 'category': 'room', 'is_cover': False, 'sort_order': 1},
            {'id': f"p-{kid}-3", 'kost_id': kid, 'photo_url': p3, 'category': 'environment', 'is_cover': False, 'sort_order': 2},
        ]

        # Facilities
        facs = {
            'has_ac': (price >= 1150000 or idx % 3 == 0),
            'has_private_bath': (price >= 950000 or idx % 2 == 0),
            'has_wifi': True,
            'is_24_hours': (idx % 2 == 0 or price >= 1200000),
            'motor_parking': True,
            'car_parking': (price >= 1350000 or idx % 4 == 0),
            'electricity_type': 'Termasuk Listrik' if (idx % 3 == 0) else 'Token Mandiri',
            'has_bed': True,
            'has_wardrobe': True,
            'has_desk': (price >= 950000 or idx % 2 == 1),
            'has_water_heater': (price >= 1450000),
            'has_fan': (price < 1150000),
            'has_shared_kitchen': (idx % 2 == 0),
            'has_drying_area': True,
            'extra_tags': ['Dekat Kampus', 'Bebas Jam Malam' if idx % 2 == 0 else 'Gerbang Terkunci', 'CCTV 24 Jam']
        }

        item = {
            'id': kid,
            'owner_id': owner_id,
            'name': name,
            'slug': slug,
            'kost_type': ktype,
            'price_monthly': price,
            'payment_periods': periods,
            'available_rooms': avail,
            'address': addr or f"Jl. Raya {district} No. {idx+1}, {region}",
            'district': district,
            'region': region,
            'lat': lat,
            'lng': lng,
            'whatsapp_number': phone,
            'is_featured': is_featured,
            'description': desc,
            'rating': rating,
            'reviews_count': reviews_count,
            'photos': photos,
            'facilities': facs,
            'created_at': '2026-08-01'
        }
        kosts.append(item)

    os.makedirs('src/data', exist_ok=True)
    with open('src/data/kost-300.json', 'w', encoding='utf-8') as f:
        json.dump(kosts, f, indent=2, ensure_ascii=False)

    print(f"Successfully generated src/data/kost-300.json with {len(kosts)} items.")
    return kosts

if __name__ == '__main__':
    extract_300_kosts()
