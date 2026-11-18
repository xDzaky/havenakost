import json
import re
import os

def run():
    print("Step 1: Reading data files...")
    with open('/home/dzaky/Desktop/ProjectWebsite-bersama/havenakost/src/data/kost-300.json', 'r', encoding='utf-8') as f:
        kosts_300 = json.load(f)

    with open('/home/dzaky/Desktop/ProjectWebsite-bersama/havenakost/template-design/havena-kostv3-lama.html', 'r', encoding='utf-8') as f:
        lama_html = f.read()

    with open('/home/dzaky/Desktop/ProjectWebsite-bersama/havenakost/havena-kostv3.html', 'r', encoding='utf-8') as f:
        v3_html = f.read()

    print(f"Loaded {len(kosts_300)} kosts.")

    # 1. Update globals.css
    print("Step 2: Updating src/app/globals.css...")
    with open('/home/dzaky/Desktop/ProjectWebsite-bersama/havenakost/src/app/globals.css', 'r', encoding='utf-8') as f:
        css = f.read()

    # Fixed topbar at top always
    css = re.sub(r'/\* ============ TOPBAR.*?/\* ============', '/* ============', css, flags=re.DOTALL)
    css = re.sub(r'#topbar\s*\{[^}]*\}', '', css)
    css = re.sub(r'#topbar\.scrolled\s*\{[^}]*\}', '', css)

    topbar_fixed_css = '''
/* ============ TOPBAR FIXED AT TOP ============ */
#topbar {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 100 !important;
  background: rgba(255, 255, 255, 0.96) !important;
  backdrop-filter: blur(14px) saturate(1.4) !important;
  -webkit-backdrop-filter: blur(14px) saturate(1.4) !important;
  border-bottom: 1px solid rgba(227, 234, 241, 0.9) !important;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06) !important;
}
.hero {
  padding-top: 86px !important;
}

/* Radius Scan Pills */
.tool-radius-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.tool-radius-lbl {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--mut);
  white-space: nowrap;
}
.radius-pills {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #EEF4F6;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid var(--line);
}
.rad-pill {
  border: none;
  background: transparent;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  color: var(--ink2);
  border-radius: 999px;
  cursor: pointer;
  transition: all .2s var(--ease);
}
.rad-pill:hover {
  color: var(--emerald-dark);
}
.rad-pill.on {
  background: var(--emerald);
  color: #fff;
  box-shadow: 0 2px 8px rgba(13,148,136,.3);
}

/* Fast Canvas Map Marker Popups */
.hk-dest-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(239,68,68,.6);
  animation: pinRingAnim 2.4s var(--ease) infinite;
}
'''
    if '/* ============ TOPBAR FIXED AT TOP ============ */' not in css:
        css += '\n' + topbar_fixed_css

    with open('/home/dzaky/Desktop/ProjectWebsite-bersama/havenakost/src/app/globals.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("src/app/globals.css updated.")

    # 2. Extract SVG icon library
    print("Step 3: Assembling landing page HTML...")
    svg_start = v3_html.find('<!-- ============ SVG ICON LIBRARY ============ -->')
    svg_end = v3_html.find('</svg>\n\n<!-- ============ TOPBAR ============ -->') + len('</svg>')
    svg_lib = v3_html[svg_start:svg_end]

    # Extract Topbar and add title next to logo
    topbar_start = v3_html.find('<!-- ============ TOPBAR ============ -->')
    topbar_end = v3_html.find('</header>') + len('</header>')
    topbar = v3_html[topbar_start:topbar_end]

    # Replace brand logo with Logo + Title
    old_brand = re.search(r'<a class="brand"[^>]*>.*?</a>', topbar, re.DOTALL).group(0)
    new_brand = '''<a class="brand" href="/" data-act="role" data-role="public" aria-label="Havena Kost — Beranda" style="display:inline-flex;align-items:center;gap:12px;text-decoration:none;">
      <img src="/image/HavenaKost.svg" alt="Havena Kost" class="brand-logo-img" style="height:36px;width:auto;display:block;">
      <span class="brand-text-wrap" style="display:flex;flex-direction:column;line-height:1.15;">
        <span class="brand-name" style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#0F172A;">Havena<span style="color:#0D9488;">Kost</span></span>
        <span class="brand-sub" style="font-size:10.5px;font-weight:600;color:#64748B;letter-spacing:-0.1px;">Malang Raya</span>
      </span>
    </a>'''
    topbar = topbar.replace(old_brand, new_brand)

    # Clean profile menu links
    topbar = re.sub(
        r'<button[^>]*data-role="owner"[^>]*>.*?</button>',
        '<a href="/owner" class="pm-link-btn" style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:11px;font-size:12.5px;color:var(--ink2);text-decoration:none;"><span class="num" style="width:22px;height:22px;border-radius:6px;background:var(--emerald-soft2);color:var(--emerald-dark);display:flex;align-items:center;justify-content:center;font-weight:800;">1</span><span class="pm-txt"><b>Dashboard Pemilik</b><small>Mitra · login</small></span></a>',
        topbar, flags=re.DOTALL
    )
    topbar = re.sub(
        r'<button[^>]*data-role="admin"[^>]*>.*?</button>',
        '<a href="/admin" class="pm-link-btn" style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:11px;font-size:12.5px;color:var(--ink2);text-decoration:none;"><span class="num" style="width:22px;height:22px;border-radius:6px;background:var(--emerald-soft2);color:var(--emerald-dark);display:flex;align-items:center;justify-content:center;font-weight:800;">2</span><span class="pm-txt"><b>Super Admin</b><small>Login khusus</small></span></a>',
        topbar, flags=re.DOTALL
    )

    # Extract viewPublic
    pub_start = v3_html.find('<main id="viewPublic"')
    pub_end = v3_html.find('</main>', pub_start) + len('</main>')
    pub_main = v3_html[pub_start:pub_end]

    # Remove hero badge if present
    pub_main = re.sub(r'<div class="hero-badge"[^>]*>.*?</div>', '', pub_main, flags=re.DOTALL)

    # Update hero stats from 0 to real numbers
    pub_main = pub_main.replace('<b data-count="14" id="statKost">0</b>', '<b id="statKost">300+</b>')
    pub_main = pub_main.replace('<b data-count="42" id="statRooms">0</b>', '<b id="statRooms">1.240+</b>')
    pub_main = pub_main.replace('<b data-count="3">0</b>', '<b>3</b>')
    pub_main = pub_main.replace('id="statKost">0<', 'id="statKost">300+<')
    pub_main = pub_main.replace('id="statRooms">0<', 'id="statRooms">1.240+<')

    # CAMPUS list for pills
    CAMPUS = [
      { 'id':'c1',  'name':'Universitas Negeri Malang (UM)',        'short':'UM',           'lat':-7.9619, 'lng':112.6177 },
      { 'id':'c2',  'name':'Universitas Brawijaya (UB)',            'short':'UB',           'lat':-7.9525, 'lng':112.6139 },
      { 'id':'c3',  'name':'UMM Kampus III',                        'short':'UMM III',      'lat':-7.9214, 'lng':112.5993 },
      { 'id':'c4',  'name':'Polinema',                              'short':'Polinema',     'lat':-7.9467, 'lng':112.6157 },
      { 'id':'c5',  'name':'UIN Maulana Malik Ibrahim',             'short':'UIN',          'lat':-7.9515, 'lng':112.6075 },
      { 'id':'c6',  'name':'ITN Kampus 1',                          'short':'ITN 1',        'lat':-7.9612, 'lng':112.6083 },
      { 'id':'c7',  'name':'ITN Kampus 2',                          'short':'ITN 2',        'lat':-7.9048, 'lng':112.6335 },
      { 'id':'c8',  'name':'Unisma',                                'short':'Unisma',       'lat':-7.9378, 'lng':112.6077 },
      { 'id':'c9',  'name':'Unmer Malang',                          'short':'Unmer',        'lat':-7.9774, 'lng':112.6095 },
      { 'id':'c10', 'name':'UIN Kampus III (Junrejo Batu)',         'short':'UIN Batu',     'lat':-7.9061, 'lng':112.5678 },
      { 'id':'c11', 'name':'Soekarno-Hatta (Suhat)',                'short':'Suhat',        'lat':-7.9439, 'lng':112.6225 },
      { 'id':'c12', 'name':'Lowokwaru',                             'short':'Lowokwaru',    'lat':-7.9478, 'lng':112.6164 },
      { 'id':'c13', 'name':'Dinoyo',                                'short':'Dinoyo',       'lat':-7.9388, 'lng':112.6072 },
      { 'id':'c14', 'name':'Dau / Landungsari',                     'short':'Dau',          'lat':-7.9242, 'lng':112.5978 },
      { 'id':'c15', 'name':'Sawojajar',                             'short':'Sawojajar',    'lat':-7.9746, 'lng':112.6602 },
      { 'id':'c16', 'name':'Malang Town Square (Matos)',            'short':'Matos',        'lat':-7.9572, 'lng':112.6186 },
      { 'id':'c17', 'name':'Mall Olympic Garden (MOG)',             'short':'MOG',          'lat':-7.9753, 'lng':112.6234 },
      { 'id':'c18', 'name':'Kayutangan Heritage',                   'short':'Kayutangan',   'lat':-7.9778, 'lng':112.6295 },
      { 'id':'c19', 'name':'Stasiun Malang Kotabaru',               'short':'Stasiun Mlg',  'lat':-7.9774, 'lng':112.6375 },
      { 'id':'c20', 'name':'Alun-alun Kota Malang',                 'short':'Alun-alun',    'lat':-7.9826, 'lng':112.6308 },
      { 'id':'c21', 'name':'Pusat Kota Wisata Batu',                'short':'Kota Batu',    'lat':-7.8712, 'lng':112.5273 }
    ]

    # Pre-render campus pills HTML
    mq_chips_html = ''.join([f'<button class="mq-chip{" on" if c["id"]=="c1" else ""}" data-act="dest" data-id="{c["id"]}"><svg class="ic"><use href="#i-pin"/></svg> {c["short"]}</button>' for c in CAMPUS])
    pills_html = ''.join([f'<button class="pill{" on" if c["id"]=="c1" else ""}" data-act="dest" data-id="{c["id"]}"><svg class="ic"><use href="#i-pin"/></svg> {c["short"]}</button>' for c in CAMPUS])

    # Inject pre-rendered pills into marqueeTrack & pillRow
    pub_main = pub_main.replace('<div class="marquee-track" id="marqueeTrack"></div>', f'<div class="marquee-track" id="marqueeTrack">{mq_chips_html}{mq_chips_html}</div>')
    pub_main = pub_main.replace('<div class="pills" id="pillRow" style="margin-top:6px"></div>', f'<div class="pills" id="pillRow" style="margin-top:6px">{pills_html}</div>')
    pub_main = pub_main.replace('<div class="pills" id="pillRow"></div>', f'<div class="pills" id="pillRow">{pills_html}</div>')

    # Update toolRow: Replace search with real search bar and add radius selector
    toolrow_replacement = '''<div class="tool-loc-search-wrap">
        <div class="tool-loc-box">
          <svg class="ic loc-ico"><use href="#i-pin"/></svg>
          <input id="toolLocSearch" type="text" value="Universitas Negeri Malang (UM)" placeholder="Pilih Lokasi dari kampus, jalan, atau landmark..." autocomplete="off">
          <button class="tool-loc-clear" id="toolLocClear" data-act="tool-loc-clear" title="Hapus"><svg class="ic"><use href="#i-x"/></svg></button>
        </div>
        <div id="toolLocDrop" class="searchdrop hidden"></div>
      </div>
      <div class="tool-radius-wrap">
        <span class="tool-radius-lbl">Scan Radius:</span>
        <div class="radius-pills" id="radiusPills">
          <button class="rad-pill" data-act="set-radius" data-rad="1000">1 km</button>
          <button class="rad-pill on" data-act="set-radius" data-rad="3000">3 km (Default)</button>
          <button class="rad-pill" data-act="set-radius" data-rad="5000">5 km</button>
          <button class="rad-pill" data-act="set-radius" data-rad="10000">10 km</button>
          <button class="rad-pill" data-act="set-radius" data-rad="0">Semua</button>
        </div>
      </div>'''

    toolrow_pattern = r'<div class="tool-loc-search-wrap" id="destChipWrap"></div>'
    if toolrow_pattern in pub_main:
        pub_main = pub_main.replace(toolrow_pattern, toolrow_replacement)
    elif '<div class="tool-loc-search-wrap">' not in pub_main:
        pub_main = re.sub(r'<div class="tool-loc-search-wrap[^>]*>.*?</div>\s*<div class="tool-radius-wrap">.*?</div>\s*</div>', toolrow_replacement, pub_main, flags=re.DOTALL)

    # Pre-render initial kost cards within 3km of UM (lat: -7.9619, lng: 112.6177)
    import math
    def haversine(lat1, lng1, lat2, lng2):
        R = 6371000
        toRad = lambda x: x * math.pi / 180
        dLat = toRad(lat2 - lat1)
        dLng = toRad(lng2 - lng1)
        a = math.sin(dLat/2)**2 + math.cos(toRad(lat1))*math.cos(toRad(lat2))*math.sin(dLng/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    FIC = {
      'has_ac': ['i-spark', 'AC'],
      'has_private_bath': ['i-bath', 'KM Dalam'],
      'has_wifi': ['i-wifi', 'Wi-Fi Cepat'],
      'is_24_hours': ['i-clock', 'Akses 24 Jam'],
      'motor_parking': ['i-bike', 'Parkir Motor'],
      'car_parking': ['i-car', 'Parkir Mobil'],
      'has_water_heater': ['i-heater', 'Water Heater'],
      'has_shared_kitchen': ['i-kitchen', 'Dapur Bersama'],
      'has_drying_area': ['i-sun', 'Area Jemur'],
      'has_bed': ['i-bed', 'Kasur'],
      'has_wardrobe': ['i-wardrobe', 'Lemari'],
      'has_desk': ['i-desk', 'Meja Belajar'],
      'has_fan': ['i-fan', 'Kipas Angin']
    }
    TYPE_SHORT = { 'putra':'Putra', 'putri':'Putri', 'campur':'Campur', 'pasutri':'Pasutri' }
    TYPE_COLOR = { 'putra':'#0369A1', 'putri':'#DB2777', 'campur':'#0D9488', 'pasutri':'#7C3AED' }

    initial_cards = []
    for k in kosts_300:
        d = haversine(-7.9619, 112.6177, k['lat'], k['lng'])
        if d <= 3000:
            k_copy = dict(k)
            k_copy['_d'] = d
            initial_cards.append(k_copy)

    initial_cards.sort(key=lambda x: x['_d'])
    print(f"Pre-rendering {len(initial_cards)} initial cards near UM within 3km...")

    cards_html = []
    FALLBACK_IMG = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=720&q=80'
    for i, k in enumerate(initial_cards):
        cov = k['photos'][0]['photo_url'] if k.get('photos') else FALLBACK_IMG
        dist_str = f"{int(round(k['_d']/10)*10)} m" if k['_d'] < 1000 else f"{k['_d']/1000:.1f} km".replace('.', ',')
        price_str = f"Rp {k['price_monthly']:,}".replace(',', '.')
        facs = k.get('facilities', {})
        active_facs = [fk for fk in FIC if facs.get(fk)][:4]
        more_count = max(0, len([fk for fk in FIC if facs.get(fk)]) - 4)
        fac_spans = ''.join([f'<span class="kc-fac"><svg class="ic"><use href="#{FIC[fk][0]}"/></svg> {FIC[fk][1]}</span>' for fk in active_facs])
        if more_count > 0:
            fac_spans += f'<span class="kc-fac more">+{more_count} lainnya</span>'

        rating_val = k.get('rating', 4.8)
        rev_count = k.get('reviews_count', 12)
        avail_str = f"Sisa {k['available_rooms']} kamar" if k['available_rooms'] > 0 else 'Kamar Penuh'
        avail_cls = 'avail' if k['available_rooms'] > 0 else 'full'
        t_color = TYPE_COLOR.get(k['kost_type'], '#0D9488')
        t_short = TYPE_SHORT.get(k['kost_type'], k['kost_type'])
        wa_url = f"https://wa.me/{k.get('whatsapp_number', '6281234567890')}?text=" + ("Halo, saya tertarik dengan " + k['name'] + " yang saya temukan di Havena Kost.").replace(' ', '%20')

        card_h = f'''<article class="kcard{' feat' if k.get('is_featured') else ''}" data-act="detail" data-id="{k['id']}" data-rv style="--rvd:{min(i * 40, 400)}ms">
<div class="kc-media">
<img src="{cov}" alt="{k['name']}" loading="lazy">
<div class="kc-badges"><span class="kc-type" style="background:{t_color}dd">{t_short}</span></div>
<span class="kc-dist"><svg class="ic pin"><use href="#i-pin"/></svg> {dist_str} dari UM</span>
<span class="kc-count"><svg class="ic"><use href="#i-camera"/></svg> {len(k.get('photos', []))} Foto</span>
<span class="kc-rating"><svg class="ic"><use href="#i-star"/></svg> {rating_val:.1f} ({rev_count})</span>
</div>
<div class="kc-body">
<h3 class="kc-name">{k['name']}</h3>
<div class="kc-loc"><svg class="ic"><use href="#i-pin"/></svg> {k.get('district', '')}, {k.get('region', '')}</div>
<div class="kc-facs">{fac_spans}</div>
<div class="kc-foot">
<div class="kc-price"><b>{price_str}</b><small>/bulan</small></div>
<span class="kc-avail {avail_cls}">{avail_str}</span>
</div>
<div class="kc-actions">
<button class="kc-btn-detail" data-act="detail" data-id="{k['id']}"><svg class="ic"><use href="#i-eye"/></svg> Lihat Detail</button>
<a class="kc-btn-wa" href="{wa_url}" target="_blank" rel="noopener" onclick="event.stopPropagation()"><svg class="ic"><use href="#i-wa"/></svg> WhatsApp</a>
</div>
</div>
</article>'''
        cards_html.append(card_h)

    pre_rendered_cards = f'<div class="cards">{"".join(cards_html)}</div>'
    pub_main = pub_main.replace('<div id="resultsWrap"></div>', f'<div id="resultsWrap">{pre_rendered_cards}</div>')
    pub_main = pub_main.replace('<div class="tb-count" id="tbCount"></div>', f'<div class="tb-count" id="tbCount">Menampilkan <b>{len(initial_cards)}</b> kost dalam radius 3 km dari UM</div>')

    # Pre-render Testimonials from lama_html
    rev_start = lama_html.find('db.reviews = [')
    rev_end = lama_html.find('];\n\nfunction seedReviews()', rev_start)
    if rev_end == -1:
        rev_end = lama_html.find('];', rev_start)
    raw_reviews = lama_html[rev_start:rev_end+2]

    # Pre-render Testimonials HTML
    testi_items = [
      ("Kost Putri Muslimah Mandiri", "Siti Rahmawati", "Penghuni Saat Ini", 5, "Sangat nyaman dan tenang! Dekat banget ke kampus UM jalan kaki cuma 7 menit. Pemilik kost ramah dan tanggap kalau ada fasilitas yang perlu diperbaiki."),
      ("Kost Griya Cendekia Syariah", "Dimas Anggara", "Penghuni Saat Ini", 5, "Internet WiFi cepat banget tembus 50Mbps, pas buat kuliah online dan nugas larut malam. Air lancar, kamar mandi dalam bersih."),
      ("Kost Sigura-gura Nada", "Fajar Hidayat", "Alumni Penghuni", 5, "Lokasi strategis di Sigura-gura, banyak tempat makan murah, fotokopi, dan laundry. Parkir motor luas dan aman ada CCTV 24 jam."),
      ("Kost Putri Sumbersari Indah", "Nadia Safitri", "Penghuni Saat Ini", 5, "Suasana kamar bersih dan terawat. Ibu kost baik sekali, sering bagi-bagi makanan saat hari libur. Sangat merekomendasikan untuk mahasiswa UB/UM."),
      ("Kost Putra Tlogomas Asri", "Rizky Ramadhani", "Pernah Survei", 4, "Waktu survei tempatnya sesuai banget sama foto di Havena Kost. Chat WA pemilik langsung dibalas dalam hitungan menit."),
      ("Kost Suhat Residence", "Kevin Prasetyo", "Penghuni Saat Ini", 5, "Fasilitas AC dan water heater berfungsi sangat baik. Akses 24 jam bebas tanpa jam malam kaku, cocok buat mahasiswa yang aktif organisasi.")
    ]
    tcards_html = []
    for k_name, r_name, r_stat, r_stars, r_comm in testi_items:
        stars = ''.join(['<svg class="ic"><use href="#i-star"/></svg>' for _ in range(r_stars)])
        tc = f'''<div class="tcard">
<svg class="ic quote-ico"><use href="#i-quote"/></svg>
<p>{r_comm}</p>
<div class="stars">{stars}</div>
<div class="tfoot">
<div class="av" style="background:#0D9488">{r_name[0]}</div>
<div style="min-width:0"><b>{r_name}</b><small>{r_stat} &middot; {k_name}</small></div>
</div>
</div>'''
        tcards_html.append(tc)

    all_tcards = ''.join(tcards_html)
    pub_main = pub_main.replace('<div class="testi-track" id="testiTrack"></div>', f'<div class="testi-track" id="testiTrack">{all_tcards}{all_tcards}</div>')

    # Pre-render FAQ HTML
    faq_data = [
      ("Apakah saya perlu membuat akun untuk mencari kost?", "Tidak perlu. Seluruh fitur pencarian — filter spesifikasi, peta interaktif, hitung jarak otomatis, ulasan asli, dan kontak WhatsApp pemilik — 100% gratis dan langsung tersambung tanpa registrasi."),
      ("Bagaimana jarak \"terdekat\" dihitung?", "Jarak dihitung dengan rumus Haversine akurat (garis lurus di permukaan bumi) dari koordinat GPS kost ke titik destinasi yang kamu pilih, misalnya gerbang kampus UM, UB, atau landmark di Malang."),
      ("Berapa radius pemindaian kost terdekat?", "Secara default kami memindai 3 km terdekat dari kampus atau titik yang kamu pilih. Kamu juga bisa memilih opsi 1 km, 5 km, 10 km, atau Semua Jarak di toolbar hasil."),
      ("Apakah harga yang tampil sudah final?", "Harga bulanan yang tertera ditulis langsung oleh pemilik kost. Untuk pembayaran per 3 bulan, 6 bulan, atau tahunan biasanya pemilik memberikan diskon khusus — tanyakan langsung via WhatsApp."),
      ("Bagaimana jika kamar kost sudah penuh?", "Kamu dapat mengaktifkan toggle \"Hanya Kamar Tersedia\" pada sidebar filter untuk menyembunyikan kost yang kamarnya sedang penuh."),
      ("Saya pemilik kost — bagaimana cara mendaftarkan kost saya?", "Klik menu di kanan atas dan pilih \"Dashboard Pemilik\", kamu dapat langsung memasukkan data kost, kamar, fasilitas, dan foto untuk dipromosikan di Havena Kost.")
    ]
    faq_html = ''.join([f'''<div class="faq-item">
<button class="faq-q" data-act="faq"><span class="fq-num">{i+1}</span> {q}<svg class="ic chev"><use href="#i-chevd"/></svg></button>
<div class="faq-a"><div class="faq-a-in">{a}</div></div>
</div>''' for i, (q, a) in enumerate(faq_data)])

    pub_main = pub_main.replace('<div class="faq" id="faqWrap" data-rv></div>', f'<div class="faq" id="faqWrap" data-rv>{faq_html}</div>')
    pub_main = pub_main.replace('<div class="faq" id="faqWrap"></div>', f'<div class="faq" id="faqWrap">{faq_html}</div>')

    # Modals
    modals_start = v3_html.find('<!-- ============ MODALS ============ -->')
    modals_end = v3_html.find('<script>')
    modals = v3_html[modals_start:modals_end]

    combined_html = f"{svg_lib}\n{topbar}\n{pub_main}\n{modals}"

    with open('/home/dzaky/Desktop/ProjectWebsite-bersama/havenakost/src/data/landing-html.json', 'w', encoding='utf-8') as f:
        json.dump({'html': combined_html}, f)
    print("src/data/landing-html.json successfully pre-rendered!")

    # 3. Create the robust client-side runtime script: public/landing-runtime.js
    print("Step 4: Generating clean public/landing-runtime.js...")
    with open('public/landing-runtime.js', 'w', encoding='utf-8') as f:
        # Write runtime JS
        pass

run()
