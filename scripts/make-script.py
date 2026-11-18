import json

# Read data files
with open('src/data/kost-300.json', 'r', encoding='utf-8') as f:
    kosts_300 = json.load(f)

with open('template-design/havena-kostv3-lama.html', 'r', encoding='utf-8') as f:
    lama_html = f.read()

rev_start = lama_html.find('db.reviews = [')
rev_end = lama_html.find('];\n\nfunction seedReviews()', rev_start)
if rev_end == -1:
    rev_end = lama_html.find('];', rev_start)
raw_reviews = lama_html[rev_start:rev_end+2]

with open('scripts/build-full-landing.py', 'r', encoding='utf-8') as f:
    builder_code = f.read()

# Runtime JS code template
js_template = r'''/* Havena Kost Malang Raya — Interactive Landing Page Runtime */
(function(){
"use strict";

const $ = (s, root) => (root || document).querySelector(s);
const $$ = (s, root) => Array.from((root || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = p => (p || 'u-') + Math.random().toString(36).slice(2, 9);
const fmtRp = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const fmtShortRp = n => {
  if (n >= 1000000) return 'Rp ' + (n / 1000000).toFixed(1).replace('.0', '') + ' jt';
  return 'Rp ' + Math.round(n / 1000) + ' rb';
};
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=720&q=80';

const CAMPUS = [
  { id:'c1',  name:'Universitas Negeri Malang (UM)',        short:'UM',           lat:-7.9619, lng:112.6177 },
  { id:'c2',  name:'Universitas Brawijaya (UB)',            short:'UB',           lat:-7.9525, lng:112.6139 },
  { id:'c3',  name:'UMM Kampus III',                        short:'UMM III',      lat:-7.9214, lng:112.5993 },
  { id:'c4',  name:'Polinema',                              short:'Polinema',     lat:-7.9467, lng:112.6157 },
  { id:'c5',  name:'UIN Maulana Malik Ibrahim',             short:'UIN',          lat:-7.9515, lng:112.6075 },
  { id:'c6',  name:'ITN Kampus 1',                          short:'ITN 1',        lat:-7.9612, lng:112.6083 },
  { id:'c7',  name:'ITN Kampus 2',                          short:'ITN 2',        lat:-7.9048, lng:112.6335 },
  { id:'c8',  name:'Unisma',                                short:'Unisma',       lat:-7.9378, lng:112.6077 },
  { id:'c9',  name:'Unmer Malang',                          short:'Unmer',        lat:-7.9774, lng:112.6095 },
  { id:'c10', name:'UIN Kampus III (Junrejo Batu)',         short:'UIN Batu',     lat:-7.9061, lng:112.5678 },
  { id:'c11', name:'Soekarno-Hatta (Suhat)',                short:'Suhat',        lat:-7.9439, lng:112.6225 },
  { id:'c12', name:'Lowokwaru',                             short:'Lowokwaru',    lat:-7.9478, lng:112.6164 },
  { id:'c13', name:'Dinoyo',                                short:'Dinoyo',       lat:-7.9388, lng:112.6072 },
  { id:'c14', name:'Dau / Landungsari',                     short:'Dau',          lat:-7.9242, lng:112.5978 },
  { id:'c15', name:'Sawojajar',                             short:'Sawojajar',    lat:-7.9746, lng:112.6602 },
  { id:'c16', name:'Malang Town Square (Matos)',            short:'Matos',        lat:-7.9572, lng:112.6186 },
  { id:'c17', name:'Mall Olympic Garden (MOG)',             short:'MOG',          lat:-7.9753, lng:112.6234 },
  { id:'c18', name:'Kayutangan Heritage',                   short:'Kayutangan',   lat:-7.9778, lng:112.6295 },
  { id:'c19', name:'Stasiun Malang Kotabaru',               short:'Stasiun Mlg',  lat:-7.9774, lng:112.6375 },
  { id:'c20', name:'Alun-alun Kota Malang',                 short:'Alun-alun',    lat:-7.9826, lng:112.6308 },
  { id:'c21', name:'Pusat Kota Wisata Batu',                short:'Kota Batu',    lat:-7.8712, lng:112.5273 }
];

const AREAS = [
  { name:'Lowokwaru', lat:-7.9478, lng:112.6164, region:'Kota Malang' },
  { name:'Dinoyo & MT Haryono', lat:-7.9388, lng:112.6072, region:'Kota Malang' },
  { name:'Sukun', lat:-7.9655, lng:112.6200, region:'Kota Malang' },
  { name:'Kedungkandang', lat:-7.9750, lng:112.6500, region:'Kota Malang' },
  { name:'Sawojajar', lat:-7.9746, lng:112.6602, region:'Kota Malang' },
  { name:'Klojen / Pusat Kota', lat:-7.9660, lng:112.6315, region:'Kota Malang' },
  { name:'Blimbing', lat:-7.9300, lng:112.6350, region:'Kota Malang' },
  { name:'Tlogomas', lat:-7.9312, lng:112.6021, region:'Kota Malang' },
  { name:'Ketawanggede', lat:-7.9502, lng:112.6128, region:'Kota Malang' },
  { name:'Sumbersari & Sigura-gura', lat:-7.9598, lng:112.6091, region:'Kota Malang' },
  { name:'Dau / Landungsari', lat:-7.9242, lng:112.5978, region:'Kabupaten Malang' },
  { name:'Karangploso', lat:-7.9065, lng:112.6318, region:'Kabupaten Malang' },
  { name:'Singosari', lat:-7.8935, lng:112.6654, region:'Kabupaten Malang' },
  { name:'Kota Wisata Batu', lat:-7.8785, lng:112.5255, region:'Kota Batu' }
];

const FAQ_DATA = [
  { q:'Apakah saya perlu membuat akun untuk mencari kost?', a:'Tidak perlu. Seluruh fitur pencarian — filter spesifikasi, peta interaktif, hitung jarak otomatis, ulasan asli, dan kontak WhatsApp pemilik — 100% gratis dan langsung tersambung tanpa registrasi.' },
  { q:'Bagaimana jarak "terdekat" dihitung?', a:'Jarak dihitung dengan rumus Haversine akurat (garis lurus di permukaan bumi) dari koordinat GPS kost ke titik destinasi yang kamu pilih, misalnya gerbang kampus UM, UB, atau landmark di Malang.' },
  { q:'Berapa radius pemindaian kost terdekat?', a:'Secara default kami memindai 3 km terdekat dari kampus atau titik yang kamu pilih. Kamu juga bisa memilih opsi 1 km, 5 km, 10 km, atau Semua Jarak di toolbar hasil.' },
  { q:'Apakah harga yang tampil sudah final?', a:'Harga bulanan yang tertera ditulis langsung oleh pemilik kost. Untuk pembayaran per 3 bulan, 6 bulan, atau tahunan biasanya pemilik memberikan diskon khusus — tanyakan langsung via WhatsApp.' },
  { q:'Bagaimana jika kamar kost sudah penuh?', a:'Kamu dapat mengaktifkan toggle "Hanya Kamar Tersedia" pada sidebar filter untuk menyembunyikan kost yang kamarnya sedang penuh.' },
  { q:'Saya pemilik kost — bagaimana cara mendaftarkan kost saya?', a:'Klik menu di kanan atas dan pilih "Dashboard Pemilik", kamu dapat langsung memasukkan data kost, kamar, fasilitas, dan foto untuk dipromosikan di Havena Kost.' }
];

const FIC = {
  has_ac: ['i-spark', 'AC'],
  has_private_bath: ['i-bath', 'KM Dalam'],
  has_wifi: ['i-wifi', 'Wi-Fi Cepat'],
  is_24_hours: ['i-clock', 'Akses 24 Jam'],
  motor_parking: ['i-bike', 'Parkir Motor'],
  car_parking: ['i-car', 'Parkir Mobil'],
  has_water_heater: ['i-heater', 'Water Heater'],
  has_shared_kitchen: ['i-kitchen', 'Dapur Bersama'],
  has_drying_area: ['i-sun', 'Area Jemur'],
  has_bed: ['i-bed', 'Kasur'],
  has_wardrobe: ['i-wardrobe', 'Lemari'],
  has_desk: ['i-desk', 'Meja Belajar'],
  has_fan: ['i-fan', 'Kipas Angin']
};

const TYPE_LABEL = { putra:'Kost Putra', putri:'Kost Putri', campur:'Kost Campur', pasutri:'Kost Pasutri & Karyawan' };
const TYPE_SHORT = { putra:'Putra', putri:'Putri', campur:'Campur', pasutri:'Pasutri' };
const TYPE_COLOR = { putra:'#0369A1', putri:'#DB2777', campur:'#0D9488', pasutri:'#7C3AED' };

const state = {
  dest: Object.assign({}, CAMPUS[0]),
  scanRadius: 3000,
  view: 'list',
  sort: 'nearest',
  filters: {
    type: 'all',
    priceMin: null,
    priceMax: 2500000,
    periods: [],
    roomFac: [],
    connFac: [],
    pubFac: [],
    onlyAvailable: false
  },
  searchQ: '',
  detail: { kostId: null, gidx:0, tab:'info' }
};

const db = {
  kost_listings: __KOST_DATA__,
  reviews: []
};

function mkRev(kost_id, reviewer_name, reviewer_status, rating, comment, created, hidden){
  return { id: uid('r-'), kost_id, reviewer_name, reviewer_status, rating, comment, is_hidden: !!hidden, created_at: created };
}
__RAW_REVIEWS__

function coverOf(kid){
  const k = db.kost_listings.find(x => x.id === kid);
  if (!k || !k.photos || !k.photos.length) return null;
  return k.photos.find(p => p.is_cover) || k.photos[0];
}
function photosOf(kid){
  const k = db.kost_listings.find(x => x.id === kid);
  return (k && k.photos) ? k.photos : [];
}
function facOf(kid){
  const k = db.kost_listings.find(x => x.id === kid);
  return (k && k.facilities) ? k.facilities : {};
}
function ratingOf(kid){
  const k = db.kost_listings.find(x => x.id === kid);
  if (k && k.rating) return { avg: k.rating, n: k.reviews_count || 12 };
  return { avg: 4.8, n: 16 };
}

function haversine(lat1, lng1, lat2, lng2){
  const R = 6371000, toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function distOf(k){
  return haversine(state.dest.lat, state.dest.lng, k.lat, k.lng);
}
function kmFromMeters(m){
  return m < 1000 ? Math.round(m/10)*10 + ' m' : (m/1000).toFixed(1).replace('.', ',') + ' km';
}

function matchesQuery(k, q){
  const hay = [k.name, k.address, k.district, k.region, TYPE_LABEL[k.kost_type] || ''].join(' ').toLowerCase();
  return hay.includes(q);
}

function filteredRows(){
  const f = state.filters, q = state.searchQ.trim().toLowerCase();
  let rows = db.kost_listings.map(k => Object.assign({}, k, { _d: distOf(k) }));

  if (state.scanRadius > 0){
    rows = rows.filter(k => k._d <= state.scanRadius);
  }

  if (q) rows = rows.filter(k => matchesQuery(k, q));
  if (f.type !== 'all') rows = rows.filter(k => k.kost_type === f.type);
  if (f.priceMin != null) rows = rows.filter(k => k.price_monthly >= f.priceMin);
  if (f.priceMax != null) rows = rows.filter(k => k.price_monthly <= f.priceMax);
  if (f.periods.length) rows = rows.filter(k => f.periods.some(p => k.payment_periods && k.payment_periods.includes(p)));
  if (f.roomFac.length) rows = rows.filter(k => { const F = facOf(k.id); return f.roomFac.every(x => F[x]); });
  if (f.connFac.length) rows = rows.filter(k => { const F = facOf(k.id); return f.connFac.every(x => F[x]); });
  if (f.pubFac.length) rows = rows.filter(k => { const F = facOf(k.id); return f.pubFac.every(x => F[x]); });
  if (f.onlyAvailable) rows = rows.filter(k => k.available_rooms > 0);

  const s = state.sort;
  rows.sort((a, b) => {
    if (s === 'price_asc') return a.price_monthly - b.price_monthly;
    if (s === 'price_desc') return b.price_monthly - a.price_monthly;
    if (s === 'rating') return ((ratingOf(b.id) || {avg:0}).avg) - ((ratingOf(a.id) || {avg:0}).avg);
    if (s === 'newest') return (b.id > a.id ? 1 : -1);
    return a._d - b._d;
  });

  return rows;
}

function kostCard(k, i){
  const cov = coverOf(k.id), ph = photosOf(k.id), r = ratingOf(k.id);
  const F = facOf(k.id) || {};
  const activeKeys = Object.keys(FIC).filter(x => F[x]).slice(0, 4);
  const moreCount = Math.max(0, Object.keys(FIC).filter(x => F[x]).length - 4);
  const waUrl = 'https://wa.me/' + (k.whatsapp_number || '6281234567890') + '?text=' + encodeURIComponent('Halo, saya tertarik dengan ' + k.name + ' yang saya temukan di Havena Kost. Apakah masih ada kamar kosong?');

  return '<article class="kcard' + (k.is_featured ? ' feat' : '') + '" data-act="detail" data-id="' + k.id + '" data-rv style="--rvd:' + Math.min(i * 40, 400) + 'ms">' +
    '<div class="kc-media">' +
      '<img src="' + (cov ? cov.photo_url : FALLBACK_IMG) + '" alt="' + esc(k.name) + '" loading="lazy">' +
      '<div class="kc-badges">' +
        '<span class="kc-type" style="background:' + (TYPE_COLOR[k.kost_type] || '#0D9488') + 'dd">' + esc(TYPE_SHORT[k.kost_type] || k.kost_type) + '</span>' +
      '</div>' +
      '<span class="kc-dist"><svg class="ic pin"><use href="#i-pin"/></svg> ' + kmFromMeters(k._d) + ' dari ' + esc(state.dest.short) + '</span>' +
      '<span class="kc-count"><svg class="ic"><use href="#i-camera"/></svg> ' + ph.length + ' Foto</span>' +
      (r ? '<span class="kc-rating"><svg class="ic"><use href="#i-star"/></svg> ' + r.avg.toFixed(1) + ' (' + r.n + ')</span>' : '') +
    '</div>' +
    '<div class="kc-body">' +
      '<h3 class="kc-name">' + esc(k.name) + '</h3>' +
      '<div class="kc-loc"><svg class="ic"><use href="#i-pin"/></svg> ' + esc(k.district) + ', ' + esc(k.region) + '</div>' +
      '<div class="kc-facs">' +
        activeKeys.map(fk => '<span class="kc-fac"><svg class="ic"><use href="#' + FIC[fk][0] + '"/></svg> ' + esc(FIC[fk][1]) + '</span>').join('') +
        (moreCount > 0 ? '<span class="kc-fac more">+' + moreCount + ' lainnya</span>' : '') +
      '</div>' +
      '<div class="kc-foot">' +
        '<div class="kc-price"><b>' + fmtRp(k.price_monthly) + '</b><small>/bulan</small></div>' +
        '<span class="kc-avail ' + (k.available_rooms > 0 ? 'avail' : 'full') + '">' + (k.available_rooms > 0 ? 'Sisa ' + k.available_rooms + ' kamar' : 'Kamar Penuh') + '</span>' +
      '</div>' +
      '<div class="kc-actions">' +
        '<button class="kc-btn-detail" data-act="detail" data-id="' + k.id + '"><svg class="ic"><use href="#i-eye"/></svg> Lihat Detail</button>' +
        '<a class="kc-btn-wa" href="' + waUrl + '" target="_blank" rel="noopener" onclick="event.stopPropagation()"><svg class="ic"><use href="#i-wa"/></svg> WhatsApp</a>' +
      '</div>' +
    '</div>' +
  '</article>';
}

let mainMap = null;
let canvasRenderer = null;
function destroyMainMap(){
  if (mainMap){
    try { mainMap.remove(); } catch(e){}
    mainMap = null;
  }
}

function renderLeafletMap(rows){
  destroyMainMap();
  const el = $('#leafletMap');
  if (!el || !window.L) return;

  mainMap = L.map('leafletMap', {
    scrollWheelZoom: true,
    zoomControl: true,
    preferCanvas: true
  }).setView([state.dest.lat, state.dest.lng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: 'Data &copy; OpenStreetMap'
  }).addTo(mainMap);

  const destIcon = L.divIcon({
    className: '',
    html: '<div style="position:relative;width:28px;height:28px;background:#EF4444;border:2.5px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(239,68,68,.5);font-size:14px;color:#fff;">🎯<div class="hk-dest-pulse"></div></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
  L.marker([state.dest.lat, state.dest.lng], { icon: destIcon, zIndexOffset: 1000 })
    .addTo(mainMap)
    .bindPopup('<b>Titik Tujuan: ' + esc(state.dest.name) + '</b><br><small>Jarak kost diukur dari titik ini.</small>');

  if (state.scanRadius > 0){
    L.circle([state.dest.lat, state.dest.lng], {
      radius: state.scanRadius,
      color: '#0D9488',
      weight: 1.5,
      fillColor: '#0D9488',
      fillOpacity: 0.08
    }).addTo(mainMap);
  }

  canvasRenderer = L.canvas({ padding: 0.5 });

  rows.forEach(k => {
    const color = TYPE_COLOR[k.kost_type] || '#0D9488';
    const marker = L.circleMarker([k.lat, k.lng], {
      renderer: canvasRenderer,
      radius: 7,
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      fillOpacity: 0.95
    });

    const cov = coverOf(k.id);
    const popContent = '<div class="hk-pop" style="width:200px">' +
      '<img src="' + (cov ? cov.photo_url : FALLBACK_IMG) + '" style="width:100%;height:90px;object-fit:cover;border-radius:8px;margin-bottom:6px;">' +
      '<b style="font-size:12.5px;display:block;margin-bottom:2px;">' + esc(k.name) + '</b>' +
      '<small style="color:#64748B;display:block;margin-bottom:4px;">' + esc(k.district) + ' &middot; ' + kmFromMeters(k._d) + ' dari tujuan</small>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">' +
        '<b style="color:#0D9488;font-size:13px;">' + fmtRp(k.price_monthly) + '<small style="font-weight:400;color:#64748B">/bln</small></b>' +
      '</div>' +
      '<button data-act="detail" data-id="' + k.id + '" style="width:100%;margin-top:8px;background:#0D9488;color:#fff;border:none;border-radius:6px;padding:6px;font-size:11.5px;font-weight:700;cursor:pointer;">Lihat Detail</button>' +
    '</div>';

    marker.bindPopup(popContent);
    marker.addTo(mainMap);
  });

  setTimeout(() => {
    try { mainMap.invalidateSize(); } catch(e){}
  }, 150);
}

function paintRows(rows){
  const wrap = $('#resultsWrap');
  if (!wrap) return;

  if (state.view === 'map'){
    wrap.innerHTML = '<div class="mapbox"><div class="map-head"><svg class="ic"><use href="#i-map"/></svg><b>Peta Interaktif Kost Malang Raya</b>' +
      '<span class="badge bg-teal" style="margin-left:6px"><svg class="ic"><use href="#i-pin"/></svg> ' + rows.length + ' kost</span>' +
      '<div class="map-legend"><span><i class="lg-dot" style="background:#0369A1"></i> Putra</span><span><i class="lg-dot" style="background:#DB2777"></i> Putri</span><span><i class="lg-dot" style="background:#0D9488"></i> Campur</span><span><i class="lg-dot" style="background:#7C3AED"></i> Pasutri</span></div></div>' +
      '<div id="leafletMap" style="height:560px;border-radius:0 0 20px 20px;"></div></div>';
    if (window.L) {
      renderLeafletMap(rows);
    } else {
      setTimeout(() => { if (window.L) renderLeafletMap(rows); }, 500);
    }
    return;
  }

  if (!rows.length){
    wrap.innerHTML = '<div class="empty-state" style="text-align:center;padding:50px 20px;background:#fff;border-radius:20px;border:1px dashed var(--line);">' +
      '<svg class="ic" style="width:48px;height:48px;color:var(--mut);margin-bottom:12px;"><use href="#i-search"/></svg>' +
      '<h4 style="font-size:16px;color:var(--teal-950);margin-bottom:6px;">Tidak ada kost dalam radius ini</h4>' +
      '<p style="font-size:13px;color:var(--mut);margin-bottom:16px;">Coba pilih "5 km" atau "Semua Jarak" pada tombol radius scan di atas.</p>' +
      '<button class="btn btn-teal" data-act="reset-filters" style="margin:0 auto;display:inline-flex;align-items:center;gap:6px;"><svg class="ic"><use href="#i-refresh"/></svg> Reset Filter</button>' +
    '</div>';
    return;
  }

  wrap.innerHTML = '<div class="cards">' + rows.map((k, i) => kostCard(k, i)).join('') + '</div>';
  revealScan(wrap);
}

function renderResults(){
  const rows = filteredRows();
  const countEl = $('#tbCount');
  if (countEl){
    const radText = state.scanRadius > 0 ? ' dalam radius ' + (state.scanRadius / 1000) + ' km' : '';
    countEl.innerHTML = 'Menampilkan <b>' + rows.length + '</b> kost' + radText + ' dari ' + esc(state.dest.short);
  }

  const filterCnt = $('#filterCnt');
  if (filterCnt){
    const n = (state.filters.type !== 'all' ? 1 : 0) + state.filters.periods.length + state.filters.roomFac.length + (state.filters.onlyAvailable ? 1 : 0);
    filterCnt.classList.toggle('hidden', n === 0);
    filterCnt.textContent = n;
  }

  paintRows(rows);
}

function renderMarquee(){
  const track = $('#marqueeTrack');
  if (!track) return;
  const chips = CAMPUS.map(c => '<button class="mq-chip' + (state.dest.id === c.id ? ' on' : '') + '" data-act="dest" data-id="' + c.id + '"><svg class="ic"><use href="#i-pin"/></svg> ' + esc(c.short) + '</button>').join('');
  track.innerHTML = chips + chips;
}

function renderPills(){
  const row = $('#pillRow');
  if (!row) return;
  row.innerHTML = CAMPUS.map(c => '<button class="pill' + (state.dest.id === c.id ? ' on' : '') + '" data-act="dest" data-id="' + c.id + '"><svg class="ic"><use href="#i-pin"/></svg> ' + esc(c.short) + '</button>').join('');
}

function renderRadiusPills(){
  $$('.rad-pill').forEach(btn => {
    const rad = parseInt(btn.dataset.rad, 10);
    btn.classList.toggle('on', rad === state.scanRadius);
  });
}

function searchSuggest(q){
  q = q.trim().toLowerCase();
  if (!q) return [];
  const out = [];
  CAMPUS.forEach(c => {
    if (c.name.toLowerCase().includes(q) || c.short.toLowerCase().includes(q))
      out.push({ type:'campus', label:c.name, sub:'Kampus / Landmark', id:c.id, lat:c.lat, lng:c.lng, short:c.short });
  });
  AREAS.forEach(a => {
    if (a.name.toLowerCase().includes(q))
      out.push({ type:'area', label:a.name, sub:'Area / Lokasi · ' + a.region, lat:a.lat, lng:a.lng, short:a.name.split(' ')[0] });
  });
  db.kost_listings.forEach(k => {
    if (k.name.toLowerCase().includes(q) && out.length < 8)
      out.push({ type:'kost', label:k.name, sub:'Kost · ' + k.district, id:k.id });
  });
  return out.slice(0, 8);
}

function renderSearchDrop(items, targetId){
  const drop = $('#' + targetId);
  if (!drop) return;
  if (!items || !items.length){ drop.classList.add('hidden'); return; }
  drop.innerHTML = items.map(it =>
    '<div class="sd-item" data-act="suggest" data-type="' + it.type + '" data-id="' + (it.id || '') + '" data-lat="' + (it.lat || '') + '" data-lng="' + (it.lng || '') + '" data-short="' + (it.short || it.label) + '" data-label="' + esc(it.label) + '">' +
      '<svg class="ic"><use href="#' + (it.type === 'kost' ? 'i-home' : 'i-pin') + '"/></svg>' +
      '<div><b>' + esc(it.label) + '</b><small>' + esc(it.sub) + '</small></div>' +
    '</div>'
  ).join('');
  drop.classList.remove('hidden');
}

/* Detail Modal */
window.havenaOpenDetail = function(kid){
  openDetail(kid);
};

function openDetail(kid){
  const k = db.kost_listings.find(x => x.id === kid);
  if (!k) return;
  Object.assign(state.detail, { kostId:kid, gidx:0, tab:'info' });
  paintDetail();
  const m = document.getElementById('detailModal');
  if (m) m.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDetail(){
  const m = document.getElementById('detailModal');
  if (m) m.classList.add('hidden');
  document.body.style.overflow = '';
}

function detailPhotos(){
  return photosOf(state.detail.kostId);
}
function ownerOf(k){
  return { full_name: 'Pemilik Mitra Havena', whatsapp: k.whatsapp_number || '6281234567890' };
}
function waLink(k){
  return 'https://wa.me/' + (k.whatsapp_number || '6281234567890') + '?text=' + encodeURIComponent('Halo, saya tertarik dengan ' + k.name + ' yang saya temukan di Havena Kost. Apakah masih ada kamar kosong?');
}
function gmapsLink(k){
  return 'https://www.google.com/maps/search/?api=1&query=' + k.lat + ',' + k.lng;
}
function availChip(k){
  return k.available_rooms > 0 ? '<span class="kc-avail avail">Sisa ' + k.available_rooms + ' kamar</span>' : '<span class="kc-avail full">Kamar Penuh</span>';
}
function fmtDateShort(d){
  if (!d) return 'Baru ditambahkan';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
  } catch(e){ return 'Baru ditambahkan'; }
}
function avatarHTML(name, bg){
  return '<div class="av" style="background:' + (bg || '#0D9488') + '">' + esc((name || 'A').charAt(0).toUpperCase()) + '</div>';
}
function avColor(name){
  const colors = ['#0D9488', '#0369A1', '#7C3AED', '#DB2777', '#D97706'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
function starsHTML(n){
  let s = '<div class="stars">';
  for (let i = 1; i <= 5; i++) s += '<svg class="ic' + (i <= n ? '' : ' off') + '"><use href="#i-star"/></svg>';
  return s + '</div>';
}

function paintDetail(){
  const k = db.kost_listings.find(x => x.id === state.detail.kostId);
  if (!k) return;
  const F = facOf(k.id) || {}, o = ownerOf(k), ph = detailPhotos();
  const d = distOf(k), r = ratingOf(k.id);
  const gal = ph.length ? ph : [{ photo_url: FALLBACK_IMG }];
  const cur = gal[Math.min(state.detail.gidx, gal.length - 1)];

  let html = '<div class="modal-panel">';
  html += '<button class="modal-x" data-act="close-detail"><svg class="ic"><use href="#i-x"/></svg></button>';

  html += '<div class="dm-gallery">';
  html += '<img id="dmImg" src="' + (cur ? cur.photo_url : FALLBACK_IMG) + '" alt="Foto ' + esc(k.name) + '">';
  if (gal.length > 1){
    html += '<button class="dm-gnav prev" data-act="g-nav" data-dir="-1"><svg class="ic"><use href="#i-chevl"/></svg></button><button class="dm-gnav next" data-act="g-nav" data-dir="1"><svg class="ic"><use href="#i-chevr"/></svg></button>';
    html += '<div class="dm-thumbs">' + gal.map((p, i) => '<img src="' + p.photo_url + '" data-act="g-idx" data-i="' + i + '" class="' + (i === state.detail.gidx ? 'on' : '') + '">').join('') + '</div>';
    html += '<span class="dm-gcount">' + (state.detail.gidx + 1) + ' / ' + gal.length + '</span>';
  }
  html += '</div>';

  html += '<div class="dm-head"><h3>' + esc(k.name) + '</h3>' +
    '<div class="dm-loc"><svg class="ic"><use href="#i-pin"/></svg> ' + esc(k.address) + ' &middot; ' + esc(k.district) + ', ' + esc(k.region) + '</div>' +
    '<div class="dm-badges">' +
    '<span class="badge" style="background:' + (TYPE_COLOR[k.kost_type] || '#0D9488') + ';color:#fff">' + esc(TYPE_LABEL[k.kost_type] || k.kost_type) + '</span>' +
    (k.is_featured ? '<span class="badge bg-gold"><svg class="ic"><use href="#i-crown"/></svg> Kost Pilihan Havena</span>' : '') +
    '<span class="badge bg-teal"><svg class="ic"><use href="#i-pin"/></svg> ' + kmFromMeters(d) + ' dari ' + esc(state.dest.short) + '</span>' +
    (r ? '<span class="badge bg-gold"><svg class="ic" style="fill:#FBBF24;stroke:none"><use href="#i-star"/></svg> ' + r.avg.toFixed(1) + ' (' + r.n + ' ulasan)</span>' : '<span class="badge bg-muted">Belum ada ulasan</span>') +
    availChip(k).replace('kc-avail', 'badge') + '</div></div>';

  html += '<div class="dm-tabs">' +
    '<button class="dm-tab' + (state.detail.tab === 'info' ? ' on' : '') + '" data-act="dtab" data-t="info">Informasi</button>' +
    '<button class="dm-tab' + (state.detail.tab === 'fac' ? ' on' : '') + '" data-act="dtab" data-t="fac">Fasilitas</button>' +
    '<button class="dm-tab' + (state.detail.tab === 'rev' ? ' on' : '') + '" data-act="dtab" data-t="rev">Ulasan (' + (r ? r.n : 0) + ')</button></div>';

  html += '<div class="dm-body">';

  if (state.detail.tab === 'info'){
    html += '<div class="dm-pane"><div class="dm-price-row"><div><div class="dp-big">' + fmtRp(k.price_monthly) + ' <small>/ bulan</small></div></div>' +
      '<div class="dp-note">Periode diterima:<br><b style="color:var(--teal-900)">' + (k.payment_periods || ['Bulanan']).join(' &middot; ') + '</b></div></div>' +
      '<div class="info-grid"><div class="info-block"><h5>Deskripsi Pemilik</h5><p>' + esc(k.description) + '</p></div>' +
      '<div class="info-block"><h5>Spesifikasi</h5><div class="spec-list">' +
      '<div class="spec-item"><svg class="ic"><use href="#i-zap"/></svg> Listrik <small>' + esc(F.electricity_type || 'Termasuk Listrik') + '</small></div>' +
      '<div class="spec-item"><svg class="ic"><use href="#i-door"/></svg> Sisa Kamar <small>' + k.available_rooms + ' unit</small></div>' +
      '<div class="spec-item"><svg class="ic"><use href="#i-phone"/></svg> Pemilik <small>' + esc(o.full_name) + '</small></div>' +
      '<div class="spec-item"><svg class="ic"><use href="#i-key"/></svg> Akses <small>' + (F.is_24_hours ? 'Bebas 24 Jam' : 'Jam Malam Tertib') + '</small></div>' +
      '<div class="spec-item"><svg class="ic"><use href="#i-globe"/></svg> Koordinat <small class="mono">' + k.lat.toFixed(4) + ', ' + k.lng.toFixed(4) + '</small></div>' +
      '</div><a class="btn btn-ghost btn-sm" style="margin-top:12px" href="' + gmapsLink(k) + '" target="_blank" rel="noopener"><svg class="ic"><use href="#i-map"/></svg> Buka Petunjuk Arah Google Maps</a></div></div></div>';
  }

  if (state.detail.tab === 'fac'){
    const allF = Object.keys(FIC).filter(x => F[x]);
    html += '<div class="dm-pane"><div class="info-grid" style="grid-template-columns:1fr 1fr;gap:12px">' +
      allF.map(x => '<div class="spec-item"><svg class="ic"><use href="#' + FIC[x][0] + '"/></svg> ' + FIC[x][1] + '</div>').join('') +
      '</div>' + ((F.extra_tags || []).length ? '<div class="fg-title" style="margin-top:16px">Keunggulan Khusus</div><div class="chips">' + F.extra_tags.map(t => '<span class="chip on" style="cursor:default">' + esc(t) + '</span>').join('') + '</div>' : '') +
      ((k.payment_periods || []).length ? '<div class="fg-title" style="margin-top:16px">Periode Pembayaran Diterima</div><div class="chips">' + k.payment_periods.map(t => '<span class="chip on" style="cursor:default">' + esc(t) + '</span>').join('') + '</div>' : '') + '</div>';
  }

  if (state.detail.tab === 'rev'){
    const rs = db.reviews.filter(x => x.kost_id === k.id && !x.is_hidden);
    html += '<div class="dm-pane">';
    html += rs.length ? rs.map(rv =>
      '<div class="rev-item"><div class="rev-head">' + avatarHTML(rv.reviewer_name, avColor(rv.reviewer_name)) +
      '<div><b>' + esc(rv.reviewer_name) + '</b><small>' + esc(rv.reviewer_status) + '</small></div>' + starsHTML(rv.rating) +
      '<span class="rev-date">' + fmtDateShort(rv.created_at) + '</span></div><p>' + esc(rv.comment) + '</p></div>').join('')
      : '<div class="empty-state" style="padding:34px"><b>Belum ada ulasan</b><p>Kost ini baru terdaftar di Havena Kost.</p></div>';
    html += '</div>';
  }

  html += '</div>';

  html += '<div style="display:flex;gap:10px;padding:0 26px 24px;flex-wrap:wrap;align-items:center">' +
    '<a class="btn btn-wa" style="flex:1;min-width:190px" href="' + waLink(k) + '" target="_blank" rel="noopener"><svg class="ic"><use href="#i-wa"/></svg> Chat WhatsApp Pemilik</a>' +
    '<button class="copy-chip" data-act="copy-wa" data-wa="' + esc(k.whatsapp_number) + '"><svg class="ic"><use href="#i-copy"/></svg> Salin No. WA</button>' +
    '<a class="btn btn-ghost" href="' + gmapsLink(k) + '" target="_blank" rel="noopener"><svg class="ic"><use href="#i-map"/></svg> Petunjuk Arah</a>' +
    '</div>';

  html += '</div>';

  const m = document.getElementById('detailModal');
  if (m) m.innerHTML = html;
}

let rvObserver = null;
if (typeof IntersectionObserver !== 'undefined'){
  rvObserver = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting){
        en.target.classList.add('rv-in');
        rvObserver.unobserve(en.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
}

function revealScan(root){
  if (!rvObserver) return;
  $$('[data-rv]', root || document).forEach(el => {
    if (!el.classList.contains('rv-in')) rvObserver.observe(el);
  });
}

function initRotator(){
  const words = [
    'Universitas Negeri Malang (UM)', 'Universitas Brawijaya (UB)', 'UMM Kampus III',
    'Polinema', 'UIN Maulana Malik Ibrahim', 'ITN Malang', 'Unisma', 'Kota Wisata Batu'
  ];
  let idx = 0;
  setInterval(() => {
    const w = $('#rotWord');
    if (!w) return;
    w.classList.add('rot-out');
    setTimeout(() => {
      idx = (idx + 1) % words.length;
      w.textContent = words[idx];
      w.classList.remove('rot-out');
      w.classList.add('rot-in');
      setTimeout(() => { if (w) w.classList.remove('rot-in'); }, 480);
    }, 290);
  }, 2800);
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;

  switch (act){
    case 'profile-toggle': {
      e.preventDefault();
      const m = $('#profileMenu');
      if (m) m.classList.toggle('hidden');
      break;
    }
    case 'dest': {
      const c = CAMPUS.find(x => x.id === t.dataset.id);
      if (c){
        state.dest = Object.assign({}, c);
        state.scanRadius = 3000;
        const inp = $('#toolLocSearch');
        if (inp) inp.value = c.name;
        renderPills();
        renderMarquee();
        renderRadiusPills();
        renderResults();
        const resSec = $('#resLayout');
        if (resSec) window.scrollTo({ top: resSec.offsetTop - 120, behavior: 'smooth' });
      }
      break;
    }
    case 'set-radius': {
      state.scanRadius = parseInt(t.dataset.rad, 10);
      renderRadiusPills();
      renderResults();
      break;
    }
    case 'suggest': {
      const drop = t.closest('.searchdrop');
      if (drop) drop.classList.add('hidden');
      if (t.dataset.type === 'kost'){
        openDetail(t.dataset.id);
      } else {
        state.dest = {
          id: t.dataset.id || 'custom',
          name: t.dataset.label,
          short: t.dataset.short || t.dataset.label,
          lat: parseFloat(t.dataset.lat),
          lng: parseFloat(t.dataset.lng)
        };
        state.scanRadius = 3000;
        const inp = $('#toolLocSearch');
        if (inp) inp.value = state.dest.name;
        renderPills();
        renderMarquee();
        renderRadiusPills();
        renderResults();
        const resSec = $('#resLayout');
        if (resSec) window.scrollTo({ top: resSec.offsetTop - 120, behavior: 'smooth' });
      }
      break;
    }
    case 'tool-loc-clear': {
      state.dest = Object.assign({}, CAMPUS[0]);
      state.scanRadius = 3000;
      const inp = $('#toolLocSearch');
      if (inp) inp.value = state.dest.name;
      $('#toolLocClear').classList.add('hidden');
      renderPills();
      renderMarquee();
      renderRadiusPills();
      renderResults();
      break;
    }
    case 'fg-type': {
      const v = t.dataset.v;
      state.filters.type = v;
      $$('#fgType .pill-chip').forEach(c => c.classList.toggle('on', c.dataset.v === v));
      renderResults();
      break;
    }
    case 'fg-period': {
      const v = t.dataset.v;
      const idx = state.filters.periods.indexOf(v);
      if (idx >= 0){
        state.filters.periods.splice(idx, 1);
        t.classList.remove('on');
      } else {
        state.filters.periods.push(v);
        t.classList.add('on');
      }
      renderResults();
      break;
    }
    case 'toggle-manual-price': {
      const box = $('#priceManualBox');
      if (box) box.classList.toggle('hidden');
      break;
    }
    case 'preset-price': {
      const min = t.dataset.min ? parseInt(t.dataset.min, 10) : null;
      const max = t.dataset.max ? parseInt(t.dataset.max, 10) : null;
      state.filters.priceMin = min;
      state.filters.priceMax = max;
      const pSlider = $('#priceRange');
      if (pSlider && max) pSlider.value = max;
      const pTag = $('#priceMaxTag');
      if (pTag && max) pTag.textContent = 'Maks. ' + fmtShortRp(max);
      $$('.preset-row .chip').forEach(c => c.classList.remove('on'));
      t.classList.add('on');
      renderResults();
      break;
    }
    case 'reset-filters': {
      state.filters = {
        type: 'all',
        priceMin: null,
        priceMax: 2500000,
        periods: [],
        roomFac: [],
        connFac: [],
        pubFac: [],
        onlyAvailable: false
      };
      state.searchQ = '';
      state.scanRadius = 3000;

      const pSlider = $('#priceRange');
      if (pSlider){ pSlider.value = 2500000; }
      const pTag = $('#priceMaxTag');
      if (pTag){ pTag.textContent = 'Maks. Rp 2.5 jt'; }

      $$('#fgType .pill-chip').forEach(c => c.classList.toggle('on', c.dataset.v === 'all'));
      $$('#fgPeriod .pill-chip').forEach(c => c.classList.remove('on'));
      $$('#facCheckGrid input[type="checkbox"]').forEach(c => c.checked = false);
      const fAvail = $('#fAvail');
      if (fAvail) fAvail.checked = false;

      renderRadiusPills();
      renderResults();
      break;
    }
    case 'faq': {
      const item = t.closest('.faq-item');
      if (item) item.classList.toggle('open');
      break;
    }
    case 'detail': {
      openDetail(t.dataset.id);
      break;
    }
    case 'close-detail':
    case 'close-modal': {
      closeDetail();
      break;
    }
    case 'dtab': {
      state.detail.tab = t.dataset.t;
      paintDetail();
      break;
    }
    case 'g-nav': {
      const dir = parseInt(t.dataset.dir, 10);
      const ph = detailPhotos();
      if (ph.length){
        state.detail.gidx = (state.detail.gidx + dir + ph.length) % ph.length;
        paintDetail();
      }
      break;
    }
    case 'g-idx': {
      state.detail.gidx = parseInt(t.dataset.i, 10);
      paintDetail();
      break;
    }
    case 'copy-wa': {
      const num = t.dataset.wa;
      if (navigator.clipboard && num) {
        navigator.clipboard.writeText(num);
        const orig = t.innerHTML;
        t.innerHTML = '<svg class="ic"><use href="#i-check"/></svg> Tersalin!';
        setTimeout(() => { t.innerHTML = orig; }, 2000);
      }
      break;
    }
    case 'view': {
      state.view = t.dataset.v;
      $('#vBtnList').classList.toggle('on', state.view === 'list');
      $('#vBtnMap').classList.toggle('on', state.view === 'map');
      renderResults();
      break;
    }
    case 'open-drawer': {
      const s = $('#filterSide');
      if (s) s.classList.add('drawer-open');
      break;
    }
    case 'close-drawer': {
      const s = $('#filterSide');
      if (s) s.classList.remove('drawer-open');
      break;
    }
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'priceRange'){
    const val = parseInt(e.target.value, 10);
    const tag = $('#priceMaxTag');
    if (tag){
      if (val >= 5000000){
        tag.textContent = 'Maks. Rp 5 jt+';
        state.filters.priceMax = null;
      } else {
        tag.textContent = 'Maks. ' + fmtShortRp(val);
        state.filters.priceMax = val;
      }
    }
    renderResults();
  }

  if (e.target.id === 'toolLocSearch'){
    const q = e.target.value.trim();
    $('#toolLocClear').classList.toggle('hidden', !q);
    const items = searchSuggest(q);
    renderSearchDrop(items, 'toolLocDrop');
  }

  if (e.target.id === 'searchInput'){
    const q = e.target.value.trim();
    const items = searchSuggest(q);
    renderSearchDrop(items, 'searchDrop');
  }
});

document.addEventListener('focusin', e => {
  if (e.target.id === 'toolLocSearch'){
    const items = searchSuggest(e.target.value);
    renderSearchDrop(items.length ? items : CAMPUS.slice(0, 8).map(c => ({ type:'campus', label:c.name, sub:'Kampus / Landmark', id:c.id, lat:c.lat, lng:c.lng, short:c.short })), 'toolLocDrop');
  }
});

document.addEventListener('change', e => {
  if (e.target.dataset.act === 'fg-fac-check'){
    const cat = e.target.dataset.cat;
    const v = e.target.dataset.v;
    if (e.target.checked){
      if (!state.filters[cat].includes(v)) state.filters[cat].push(v);
    } else {
      const idx = state.filters[cat].indexOf(v);
      if (idx >= 0) state.filters[cat].splice(idx, 1);
    }
    renderResults();
  }

  if (e.target.id === 'fAvail'){
    state.filters.onlyAvailable = e.target.checked;
    renderResults();
  }

  if (e.target.id === 'sortSel'){
    state.sort = e.target.value;
    renderResults();
  }
});

document.addEventListener('click', e => {
  if (!e.target.closest('.tool-loc-search-wrap')){
    const d = $('#toolLocDrop');
    if (d) d.classList.add('hidden');
  }
  if (!e.target.closest('.hero-search')){
    const d = $('#searchDrop');
    if (d) d.classList.add('hidden');
  }
  if (!e.target.closest('.profile-wrap')){
    const m = $('#profileMenu');
    if (m) m.classList.add('hidden');
  }
});

function initAll(){
  console.log("Havena Kost runtime initialized. Total listings:", db.kost_listings.length);
  const locInp = $('#toolLocSearch');
  if (locInp) locInp.value = state.dest.name;

  const statKost = $('#statKost');
  if (statKost) statKost.textContent = '300+';
  const statRooms = $('#statRooms');
  if (statRooms) statRooms.textContent = '1.240+';

  renderMarquee();
  renderPills();
  renderRadiusPills();
  initRotator();
  revealScan();
}

if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}

})();
'''

final_js = js_template.replace('__KOST_DATA__', json.dumps(kosts_300, ensure_ascii=False)).replace('__RAW_REVIEWS__', raw_reviews)

with open('public/landing-runtime.js', 'w', encoding='utf-8') as f:
    f.write(final_js)

print("public/landing-runtime.js generated!")
