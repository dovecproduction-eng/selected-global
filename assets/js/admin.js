// Selected Global — Admin paneli
import { supabase, REGION_GROUPS, KONUT_TIPLERI, ODA_TIPLERI, PROJELER, STORAGE_BUCKET, CURRENCY, BRAND, ALL_LISTINGS_URL, nameFromEmail, CREATORS } from './config.js?v=45';
import { ICON, esc, pickTitle, pickDesc, coverUrl, fmtPrice, toast, brandedCover, downloadPropertyPhotos, slugify, regionDistrict, regionDisplay, logoMark } from './ui.js?v=45';

// WhatsApp paylaşım metni (link önizlemesi p.html OG etiketlerinden gelir)
const waShare = (url) => `https://wa.me/?text=${encodeURIComponent(url)}`;

// Üst bardaki "Web sitesi" linki
document.getElementById('viewSiteLink').href = ALL_LISTINGS_URL;

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let props = [];
let ports = [];
let editId = null;
let photos = [];           // [{url, path}]
let selected = new Set();  // portföy seçimi

// Filtre durumları (regions = çoklu seçim dizisi)
const fProps = { tip: 'all', regions: [], proje: '', furn: '', sort: 'new', q: '' };
const fSel   = { tip: 'all', regions: [], proje: '', furn: '', q: '' };

function matchFilter(p, f) {
  if (f.tip !== 'all' && p.tip !== f.tip) return false;
  if (f.regions && f.regions.length) {
    const kk = (s) => (s || '').trim().toLocaleLowerCase('tr');
    const pd = regionDistrict(p.bolge) || p.bolge;
    const ok = f.regions.some((r) => r.startsWith('__il__') ? kk(pd) === kk(r.slice(6)) : kk(p.bolge) === kk(r));
    if (!ok) return false;
  }
  if (f.proje) { if ((p.proje || '').trim().toLocaleLowerCase('tr') !== f.proje.trim().toLocaleLowerCase('tr')) return false; }
  if (f.furn !== '') { if (p.esyali == null || String(p.esyali) !== f.furn) return false; }
  if (f.q) {
    const q = f.q.toLowerCase();
    const hay = `${p.baslik || ''} ${p.title_en || ''} ${p.bolge || ''} ${p.oda_sayisi || ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}
function sortProps(list, sort) {
  const a = [...list];
  if (sort === 'price_asc') a.sort((x, y) => (x.fiyat ?? Infinity) - (y.fiyat ?? Infinity));
  else if (sort === 'price_desc') a.sort((x, y) => (y.fiyat ?? -Infinity) - (x.fiyat ?? -Infinity));
  return a; // 'new' = created_at desc (zaten sıralı)
}

// Kullanılan bölgeleri ilçeye göre grupla
function groupedUsedRegions() {
  const key = (s) => (s || '').trim().toLocaleLowerCase('tr');
  const seen = new Set(); const used = [];
  props.map((p) => (p.bolge || '').trim()).filter(Boolean).forEach((r) => {
    const k = key(r); if (!seen.has(k)) { seen.add(k); used.push(r); }
  });
  const grp = {}; const other = [];
  used.forEach((r) => { const d = regionDistrict(r); if (d) (grp[d] = grp[d] || []).push(r); else other.push(r); });
  const out = [];
  Object.keys(REGION_GROUPS).forEach((d) => {
    const a = grp[d]; if (a && a.length) { const order = REGION_GROUPS[d]; a.sort((x, y) => order.indexOf(x) - order.indexOf(y)); out.push({ district: d, areas: a }); }
  });
  return { groups: out, other };
}

function updateRegionBtn(btn, state) {
  const n = state.regions.length;
  btn.textContent = n ? `${n} bölge` : 'Tüm bölgeler';
  btn.classList.toggle('has-sel', n > 0);
}

// Çoklu bölge panelini doldur ve bağla
function renderRegionMulti(panelSel, btnSel, state, onChange) {
  const panel = $(panelSel), btn = $(btnSel); if (!panel || !btn) return;
  const key = (s) => (s || '').trim().toLocaleLowerCase('tr');
  const { groups, other } = groupedUsedRegions();
  let html = '';
  groups.forEach(({ district, areas }) => {
    html += `<div class="mp-group-label">${esc(district)}</div>`;
    html += `<label class="multi-opt"><input type="checkbox" value="__il__${esc(district)}"> ${esc(district)} (tümü)</label>`;
    areas.forEach((a) => { if (key(a) !== key(district)) html += `<label class="multi-opt"><input type="checkbox" value="${esc(a)}"> ${esc(regionDisplay(a))}</label>`; });
  });
  if (other.length) html += `<div class="mp-group-label">Diğer</div>` + other.map((r) => `<label class="multi-opt"><input type="checkbox" value="${esc(r)}"> ${esc(r)}</label>`).join('');
  html += `<div class="multi-actions"><button type="button" data-clear>Temizle</button><button type="button" data-done>Kapat</button></div>`;
  panel.innerHTML = html.includes('multi-opt') ? html : '<p class="text-muted" style="padding:8px">Henüz bölge yok</p>';

  panel.querySelectorAll('input[type=checkbox]').forEach((cb) => {
    cb.checked = state.regions.includes(cb.value);
    cb.addEventListener('change', () => {
      state.regions = Array.from(panel.querySelectorAll('input:checked')).map((x) => x.value);
      updateRegionBtn(btn, state); onChange();
    });
  });
  panel.querySelector('[data-clear]')?.addEventListener('click', () => {
    state.regions = []; panel.querySelectorAll('input').forEach((x) => (x.checked = false));
    updateRegionBtn(btn, state); onChange();
  });
  panel.querySelector('[data-done]')?.addEventListener('click', () => panel.classList.add('hidden'));
  updateRegionBtn(btn, state);
}
function propTags(p) {
  const tags = [];
  tags.push(`<span class="tag ${p.tip === 'satilik' ? 'sale' : 'rent'}">${p.tip === 'satilik' ? 'Satılık' : 'Kiralık'}</span>`);
  if (p.konut_tipi) tags.push(`<span class="tag">${esc(p.konut_tipi)}</span>`);
  if (p.bolge) tags.push(`<span class="tag">${esc(regionDisplay(p.bolge))}</span>`);
  if (p.oda_sayisi) tags.push(`<span class="tag">${esc(p.oda_sayisi)}</span>`);
  if (p.esyali != null) tags.push(`<span class="tag">${p.esyali ? 'Eşyalı' : 'Eşyasız'}</span>`);
  const price = fmtPrice(p.fiyat, p.para_birimi, p.tip).replace(/<[^>]+>/g, '');
  if (p.fiyat != null) tags.push(`<span class="tag price">${price}</span>`);
  return `<div class="tags">${tags.join('')}</div>`;
}

// İkon yerleştir
$('#plusIcon').innerHTML = ICON.plus;
$('#plusIcon2').innerHTML = ICON.plus;
$$('.icon-btn[data-close]').forEach((b) => (b.innerHTML = ICON.x));

const rkey = (s) => (s || '').trim().toLocaleLowerCase('tr');

// İl seçeneklerini doldur
$('#f_il').innerHTML = '<option value="">Seçiniz</option>' +
  Object.keys(REGION_GROUPS).map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join('');

// Seçilen ile göre ilçeleri doldur
function fillIlceOptions(il, selected) {
  const sel = $('#f_bolge');
  if (!il || !REGION_GROUPS[il]) { sel.innerHTML = '<option value="">Önce il seçin</option>'; sel.value = ''; return; }
  const areas = REGION_GROUPS[il].filter((a) => rkey(a) !== rkey(il));
  sel.innerHTML = `<option value="">${esc(il)} (geneli)</option>` +
    areas.map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join('');
  sel.value = selected || '';
}
// İl değişince ilçeleri tazele + önizleme
$('#f_il').addEventListener('change', () => { fillIlceOptions($('#f_il').value); updateCoverPreview(); });

// Konut tipi seçeneklerini doldur
$('#f_konut').innerHTML = '<option value="">Belirtilmemiş</option>' +
  KONUT_TIPLERI.map((k) => `<option value="${esc(k)}">${esc(k)}</option>`).join('');

// Oda sayısı seçeneklerini doldur
$('#f_oda').innerHTML = '<option value="">Seçiniz</option>' +
  ODA_TIPLERI.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('');

// Proje seçeneklerini doldur
$('#f_proje').innerHTML = '<option value="">Belirtilmemiş</option>' +
  PROJELER.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('');

// Proje → il/ilçe ön ayarı (seçilince otomatik doldurur)
const PROJECT_PRESET = {
  'Courtyard Long Beach': { il: 'İskele', bolge: 'Long Beach' },
  'Four Season 1':        { il: 'İskele', bolge: 'Boğaz' },
  'Four Season 2':        { il: 'İskele', bolge: 'Boğaz' },
  'Four Season 3':        { il: 'İskele', bolge: 'Boğaz' },
  'La Isla':              { il: 'İskele', bolge: 'Yeniboğaziçi' },
  'Panorama':             { il: 'İskele', bolge: 'Long Beach' },
};
function applyProjectPreset(proje) {
  const pre = PROJECT_PRESET[proje];
  if (!pre) return;
  $('#f_il').value = pre.il;
  fillIlceOptions(pre.il, '');
  const bsel = $('#f_bolge');
  // Bölge il listesinde yoksa seçeneği ekle (örn. Yeniboğaziçi)
  if (pre.bolge && !Array.from(bsel.options).some((o) => o.value === pre.bolge)) {
    bsel.insertAdjacentHTML('beforeend', `<option value="${esc(pre.bolge)}">${esc(pre.bolge)}</option>`);
  }
  bsel.value = pre.bolge || '';
  $('#f_il').style.borderColor = '';
  updateCoverPreview();
}
// Proje → site olanakları (Özellikler + Açıklama otomatik dolar)
const PROJECT_AMENITIES = {
  'Courtyard Long Beach': ['Açık Havuz', 'Kapalı Havuz', 'Aquapark / Su Kaydırağı', 'Spa', 'Hamam', 'Sauna', 'Fitness / Spor Salonu', 'Güzellik Merkezi', 'Restaurant', 'Bar', 'Market', 'Çocuk Kulübü', 'Çocuk Oyun Alanı', 'Mini Golf', '7/24 Güvenlik', 'Otopark'],
  'Panorama': ['Deniz Manzarası', 'Açık Havuz', 'Çocuk Havuzu', 'Çatı (Infinity) Havuz', 'Roof Bar & Restoran', 'Café & Bar', 'Gym / Fitness', 'Spa', 'Yoga Salonu', 'Cep Sineması', 'Oyun Odası', 'Mini Golf', 'Masa Tenisi', 'Bilardo', 'Çocuk Oyun Alanı', '7/24 Güvenlik', 'Resepsiyon & Concierge'],
  'Four Season 1': ['Açık Havuz', 'Çocuk Havuzu', 'Aquapark', 'Fitness', 'Spa', 'Restoran', 'Pool Bar', 'Beach Bar', 'Su Sporları', 'Yürüyüş & Bisiklet Yolu', 'Çocuk Oyun Alanı', 'Otopark', '7/24 Güvenlik'],
  'Four Season 2': ['Açık Havuz', 'Kapalı Havuz', 'Aquapark', 'Fitness', 'Spa & Masaj', 'Güzellik Merkezi', 'Tenis Kortu', 'Basketbol Sahası', 'Voleybol Sahası', 'Restoran', 'Café & Bar', 'Roof Teras', 'Beach Bar', 'Çocuk Kulübü', 'Bisiklet & Yürüyüş Yolu', '7/24 Güvenlik', 'Otopark'],
  'Four Season 3': ['Açık Havuz', 'Kapalı Havuz', 'Aquapark', 'Fitness', 'Spa & Masaj', 'Güzellik Merkezi', 'Tenis Kortu', 'Basketbol Sahası', 'Restoran', 'Café & Bar', 'Roof Teras', 'Beach Bar', 'Çocuk Kulübü', 'Bisiklet & Yürüyüş Yolu', '7/24 Güvenlik', 'Otopark'],
};
let lastAutoAciklama = '';
function applyProjectAmenities(proje) {
  const list = PROJECT_AMENITIES[proje];
  if (!list) return;
  const acStr = `${proje} projesinde; ${list.join(', ')} gibi zengin sosyal olanaklar bulunmaktadır.`;
  const acEl = $('#f_aciklama');
  // Boşsa ya da önceki otomatik metinse doldur/değiştir; elle yazılmışsa dokunma
  if (!acEl.value.trim() || acEl.value.trim() === lastAutoAciklama) { acEl.value = acStr; lastAutoAciklama = acStr; }
  updateCoverPreview();
}
// Proje ORTAK ALAN fotoğrafları — proje seçilince galeriye otomatik eklenir.
// Yeni proje görselleri eklemek için: Supabase'e yükle, URL'leri buraya ekle.
const FS_COMMON_PHOTOS = [
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season/fsl1-1.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season/fsl1-2.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season/fsl1-3.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season/fsl1-4.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season/fsl1-5.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season/fsl1-6.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season/fsl1-7.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season/fsl1-8.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season/fsl1-9.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season/fsl1-10.webp',
];
const FS2_COMMON_PHOTOS = [
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season-2/fsl2-1.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season-2/fsl2-2.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season-2/fsl2-3.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season-2/fsl2-4.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season-2/fsl2-5.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/four-season-2/fsl2-6.webp',
];
const CLB_COMMON_PHOTOS = [
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/courtyard/clb-1.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/courtyard/clb-2.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/courtyard/clb-3.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/courtyard/clb-4.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/courtyard/clb-5.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/courtyard/clb-6.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/courtyard/clb-7.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/courtyard/clb-8.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/courtyard/clb-9.webp',
];
const LAISLA_COMMON_PHOTOS = [
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/la-isla/laisla-1.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/la-isla/laisla-2.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/la-isla/laisla-3.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/la-isla/laisla-4.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/la-isla/laisla-5.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/la-isla/laisla-6.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/la-isla/laisla-7.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/la-isla/laisla-8.webp',
  'https://kimwdxymgdnkvivbvmtk.supabase.co/storage/v1/object/public/property-images/_ortak/la-isla/laisla-9.webp',
];
const PROJECT_COMMON_PHOTOS = {
  'Four Season 1': FS_COMMON_PHOTOS,
  'Four Season 2': FS2_COMMON_PHOTOS,
  'Courtyard Long Beach': CLB_COMMON_PHOTOS,
  'La Isla': LAISLA_COMMON_PHOTOS,
};
// Proje değişince: önceki ortak fotoğrafları çıkar, yeni projeninkileri sona ekle (dairenin kendi
// fotoğrafları başta kalır → kapak dairenin kendi fotoğrafı olur).
function applyProjectPhotos(proje) {
  photos = photos.filter((ph) => !ph.common);
  const commons = PROJECT_COMMON_PHOTOS[proje];
  if (commons && commons.length) {
    const have = new Set(photos.map((p) => p.url));
    commons.forEach((url) => { if (!have.has(url)) photos.push({ url, path: urlToPath(url), common: true }); });
  }
  renderPreviews();
}

// Kullanıcı projeyi değiştirince il/ilçe + olanaklar + ortak fotoğraflar otomatik dolar (kayıt yüklerken tetiklenmez)
$('#f_proje').addEventListener('change', () => {
  applyProjectPreset($('#f_proje').value);
  applyProjectAmenities($('#f_proje').value);
  applyProjectPhotos($('#f_proje').value);
});

// Bir select'te olmayan değeri (eski/serbest) koruyarak seç
function setSelectValue(selId, val) {
  const el = $(selId); val = val || '';
  if (val && !Array.from(el.options).some((o) => o.value === val)) {
    el.insertAdjacentHTML('beforeend', `<option value="${esc(val)}">${esc(val)}</option>`);
  }
  el.value = val;
}

// Müstakil ev tiplerinde "Kat" alanını gizle (villa/ikiz villa/müstakil ev/bungalov)
const HOUSE_TYPES = ['villa', 'ikiz villa', 'müstakil ev'];
function updateKatVisibility() {
  const isHouse = HOUSE_TYPES.includes(rkey($('#f_konut').value));
  $('#katField').classList.toggle('hidden', isHouse);
  if (isHouse) $('#f_kat').value = '';
}
$('#f_konut').addEventListener('change', updateKatVisibility);

/* ============== AUTH ============== */
let myEmail = '';
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) { myEmail = session.user?.email || ''; showApp(); } else showLogin();
}

function showLogin() { $('#loginScreen').classList.remove('hidden'); $('#app').classList.add('hidden'); }
function showApp() {
  $('#loginScreen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  loadProps();
  loadPorts();
  // Adres #ports / #excel ile geldiyse o sekmeyi aç (önizlemeden "geri" için)
  const hashTab = (location.hash || '').replace('#', '');
  if (['props', 'ports', 'excel'].includes(hashTab)) {
    const btn = document.querySelector(`.admin-tabs button[data-tab="${hashTab}"]`);
    if (btn) btn.click();
  }
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#loginBtn'); btn.disabled = true; btn.textContent = 'Giriş yapılıyor…';
  $('#loginErr').textContent = '';
  const { data, error } = await supabase.auth.signInWithPassword({
    email: $('#loginEmail').value.trim(),
    password: $('#loginPass').value,
  });
  btn.disabled = false; btn.textContent = 'Giriş yap';
  if (error) { $('#loginErr').textContent = 'Giriş başarısız: e-posta veya şifre hatalı.'; return; }
  myEmail = data.user?.email || '';
  showApp();
});

$('#logoutBtn').addEventListener('click', async () => { await supabase.auth.signOut(); showLogin(); });

/* ============== SEKMELER ============== */
const TAB_IDS = ['props', 'ports', 'excel'];
$$('.admin-tabs button').forEach((b) => b.addEventListener('click', () => {
  $$('.admin-tabs button').forEach((x) => x.classList.toggle('active', x === b));
  TAB_IDS.forEach((id) => $(`#tab-${id}`).classList.toggle('hidden', b.dataset.tab !== id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}));

/* ============== DAİRELER ============== */
// Daireler filtresindeki proje seçeneklerini (kullanımdakiler) doldur
function fillPropProjeOptions() {
  const sel = $('#pf_proje'); if (!sel) return;
  const cur = sel.value;
  const projeler = [...new Set(props.map((p) => (p.proje || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'tr'));
  sel.innerHTML = '<option value="">Proje: hepsi</option>' +
    projeler.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
  sel.value = projeler.includes(cur) ? cur : '';
  fProps.proje = sel.value;
}

// Portföy seçimindeki proje filtresi seçeneklerini doldur
function fillSelProjeOptions() {
  const sel = $('#sf_proje'); if (!sel) return;
  const cur = sel.value;
  const projeler = [...new Set(props.map((p) => (p.proje || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'tr'));
  sel.innerHTML = '<option value="">Tüm Projeler</option>' +
    projeler.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
  sel.value = projeler.includes(cur) ? cur : '';
  fSel.proje = sel.value;
}

async function loadProps() {
  const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
  if (error) { toast('Daireler yüklenemedi', 'err'); return; }
  props = data || [];
  $('#propCount').textContent = props.length;
  fillPropProjeOptions();
  fillSelProjeOptions();
  renderRegionMulti('#pf_region_panel', '#pf_region_btn', fProps, renderPropList);
  renderRegionMulti('#sf_region_panel', '#sf_region_btn', fSel, renderSelectGrid);
  renderPropList();
}

// ---- Birleşik görünüm sistemi (browse = Daireler, select = portföy seçimi) ----
function priceText(p) { return p.fiyat != null ? fmtPrice(p.fiyat, p.para_birimi, p.tip).replace(/<[^>]+>/g, '') : '—'; }
function tipBadge(p) { return `<span class="badge-${p.tip === 'satilik' ? 'sale' : 'rent'}">${p.tip === 'satilik' ? 'Satılık' : 'Kiralık'}</span>`; }
function itemTail(p, ctx) {
  if (ctx === 'select') return `<span class="row-check">${ICON.check}</span>`;
  return `<div class="acts"><button class="icon-btn" data-edit="${p.id}" title="Düzenle">${ICON.edit}</button><button class="icon-btn danger" data-del="${p.id}" title="Sil">${ICON.trash}</button></div>`;
}
function selCls(p, ctx) { return ctx === 'select' && selected.has(p.id) ? ' sel' : ''; }
function ekleyenLine(p) {
  const parts = [
    p.blok ? `Blok ${esc(p.blok)}` : `<span class="miss">⚠ Blok eklenmeli</span>`,
    p.daire_no ? `No ${esc(p.daire_no)}` : `<span class="miss">⚠ Daire no eklenmeli</span>`,
  ];
  const bdLine = `<div class="ekleyen-line" style="color:var(--navy)">🏠 ${parts.join(' · ')}</div>`;
  return bdLine + (p.ekleyen ? `<div class="ekleyen-line">👤 ${esc(p.ekleyen)} ekledi</div>` : '');
}

function itemList(p, ctx) {
  const cover = coverUrl(p); const n = (p.fotograflar || []).length;
  return `<div class="admin-item${selCls(p, ctx)}" data-id="${p.id}">
    <div class="thumb-wrap">${cover ? `<img class="thumb" src="${esc(cover)}" alt="" /><span class="thumb-brand">${logoMark(true)}</span>` : `<div class="thumb" style="display:grid;place-items:center;color:#B6C2D0">${ICON.camera}</div>`}${n ? `<span class="thumb-count">${ICON.camera}${n}</span>` : ''}</div>
    <div class="meta"><div class="t">${esc(pickTitle(p) || 'Başlıksız')}</div>${propTags(p)}${ekleyenLine(p)}</div>
    ${itemTail(p, ctx)}
  </div>`;
}
function itemGrid(p, ctx) {
  const n = (p.fotograflar || []).length;
  return `<div class="prop-gcard${selCls(p, ctx)}" data-id="${p.id}">
    <div class="gcard-media branded">${brandedCover(p)}${n ? `<span class="pcount">${ICON.camera}${n}</span>` : ''}${ctx === 'select' ? `<span class="row-check tile-check">${ICON.check}</span>` : ''}</div>
    <div class="gcard-body"><div class="t">${esc(pickTitle(p) || 'Başlıksız')}</div>${propTags(p)}${ekleyenLine(p)}${ctx === 'browse' ? `<div class="gcard-acts">${itemTail(p, ctx)}</div>` : ''}</div>
  </div>`;
}
function itemGallery(p, ctx) {
  const cover = coverUrl(p);
  return `<div class="gtile${selCls(p, ctx)}" data-id="${p.id}">
    ${cover ? `<img src="${esc(cover)}" alt="" />` : `<span class="ph">${ICON.camera}</span>`}
    <div class="gtile-overlay"><span class="gt-logo">${logoMark(true)}</span><span class="gt-title">${esc(pickTitle(p) || 'Başlıksız')}</span></div>
    ${ctx === 'select' ? `<span class="row-check tile-check">${ICON.check}</span>` : `<button class="icon-btn danger gt-del" data-del="${p.id}" title="Sil">${ICON.trash}</button>`}
  </div>`;
}
function itemCompact(p, ctx) {
  const meta = [tipBadge(p), p.konut_tipi ? esc(p.konut_tipi) : null, regionDisplay(p.bolge) ? esc(regionDisplay(p.bolge)) : null, p.oda_sayisi ? esc(p.oda_sayisi) : null].filter(Boolean).join(' · ');
  return `<div class="compact-row${selCls(p, ctx)}" data-id="${p.id}">
    ${ctx === 'select' ? `<span class="row-check">${ICON.check}</span>` : ''}
    <span class="c-title">${esc(pickTitle(p) || 'Başlıksız')}</span>
    <span class="c-meta">${meta}</span>
    <span class="c-price">${priceText(p)}</span>
    ${ctx === 'browse' ? itemTail(p, ctx) : ''}
  </div>`;
}
function viewTable(list, ctx) {
  const head = `<tr>${ctx === 'select' ? '<th></th>' : ''}<th>Başlık</th><th>Tip</th><th>Konut</th><th>Bölge</th><th>Oda</th><th>Banyo</th><th>Kat</th><th>m²</th><th>Fiyat</th><th>Eşya</th>${ctx === 'browse' ? '<th></th>' : ''}</tr>`;
  const rows = list.map((p) => `<tr data-id="${p.id}" class="${selCls(p, ctx).trim()}">
    ${ctx === 'select' ? `<td><span class="tcheck">${ICON.check}</span></td>` : ''}
    <td class="td-title">${esc(pickTitle(p) || '—')}</td>
    <td>${tipBadge(p)}</td>
    <td>${esc(p.konut_tipi || '—')}</td>
    <td>${esc(regionDisplay(p.bolge) || '—')}</td>
    <td>${esc(p.oda_sayisi || '—')}</td>
    <td>${p.banyo_sayisi != null ? esc(p.banyo_sayisi) : '—'}</td>
    <td>${esc(p.kat || '—')}</td>
    <td>${p.metrekare != null ? esc(p.metrekare) : '—'}</td>
    <td class="price">${priceText(p)}</td>
    <td>${p.esyali == null ? '—' : (p.esyali ? 'Eşyalı' : 'Eşyasız')}</td>
    ${ctx === 'browse' ? `<td><div class="t-acts"><button class="icon-btn" data-edit="${p.id}" title="Düzenle">${ICON.edit}</button><button class="icon-btn danger" data-del="${p.id}" title="Sil">${ICON.trash}</button></div></td>` : ''}
  </tr>`).join('');
  return `<table class="prop-table"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}

const VIEW_MAP = { list: [itemList, 'admin-list'], grid: [itemGrid, 'prop-grid'], gallery: [itemGallery, 'prop-gallery'], compact: [itemCompact, 'prop-compact'] };

function renderView(el, list, mode, ctx) {
  if (mode === 'table') { el.className = 'prop-table-wrap'; el.innerHTML = viewTable(list, ctx); }
  else { const [tmpl, cls] = VIEW_MAP[mode] || VIEW_MAP.list; el.className = cls; el.innerHTML = list.map((p) => tmpl(p, ctx)).join(''); }

  if (ctx === 'browse') {
    el.querySelectorAll('[data-id]').forEach((it) => it.addEventListener('click', (e) => {
      if (e.target.closest('[data-edit],[data-del]')) return;
      openGallery(it.dataset.id);
    }));
    el.querySelectorAll('[data-edit]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); openProp(b.dataset.edit); });
    el.querySelectorAll('[data-del]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); delProp(b.dataset.del); });
  } else {
    el.querySelectorAll('[data-id]').forEach((it) => it.addEventListener('click', () => {
      const id = it.dataset.id;
      if (selected.has(id)) { selected.delete(id); it.classList.remove('sel'); } else { selected.add(id); it.classList.add('sel'); }
      $('#selCount').textContent = selected.size;
    }));
  }
}

let viewMode = 'grid';
function renderPropList() {
  const el = $('#propList');
  if (!props.length) { el.className = 'admin-list'; el.innerHTML = `<p class="text-muted">Henüz daire eklenmemiş. “Yeni daire ekle” ile başlayın.</p>`; $('#propShown').textContent = ''; return; }
  const list = sortProps(props.filter((p) => matchFilter(p, fProps)), fProps.sort);
  $('#propShown').textContent = `${list.length} / ${props.length} gösteriliyor`;
  if (!list.length) { el.className = 'admin-list'; el.innerHTML = `<p class="text-muted">Bu filtreye uygun daire yok.</p>`; return; }
  renderView(el, list, viewMode, 'browse');
}

// İlan önizleme (galeri + tüm detaylar — ilan sayfası gibi)
function listingSpecRows(p) {
  const rows = [
    ['Tip', p.tip === 'satilik' ? 'Satılık' : 'Kiralık'],
    ['Proje', p.proje],
    ['Blok', p.blok],
    ['Daire No', p.daire_no],
    ['Konut Tipi', p.konut_tipi],
    ['Bölge', p.bolge ? regionDisplay(p.bolge) : null],
    ['Oda Sayısı', p.oda_sayisi],
    ['Alan', p.metrekare ? `${p.metrekare} m²` : null],
    ['Banyo', p.banyo_sayisi],
    ['Kat', p.kat],
    ['Eşya Durumu', p.esyali == null ? null : (p.esyali ? 'Eşyalı' : 'Eşyasız')],
  ];
  return rows.filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `<div class="row"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join('');
}

function openGallery(id) {
  const p = props.find((x) => x.id === id); if (!p) return;
  const photos = p.fotograflar || [];
  const features = p.ozellikler || [];
  const desc = pickDesc(p);
  const isSale = p.tip === 'satilik';
  $('#photoModalTitle').textContent = pickTitle(p) || 'İlan';

  const cur = photos.length ? Math.min(p.kapak_index || 0, photos.length - 1) : 0;
  const coverHtml = photos.length
    ? brandedCover(p)
    : `<div class="cover-figure"><div class="cover-photo" style="display:grid;place-items:center;color:#B6C2D0">${ICON.camera}<span style="color:var(--muted);font-size:.85rem;margin-top:8px">Fotoğraf yok</span></div></div>`;
  const selectStrip = photos.length > 1
    ? `<div class="cover-select">
         <div class="cover-select-label">Kapak fotoğrafını seç (tıkla):</div>
         <div class="cover-thumbs" id="pmCoverThumbs">
           ${photos.map((u, i) => `<div class="cthumb ${i === cur ? 'active' : ''}" data-ci="${i}"><img src="${esc(u)}" alt="" />${i === cur ? '<span class="ck">KAPAK</span>' : ''}</div>`).join('')}
         </div>
       </div>`
    : '';

  $('#pmBody').innerHTML = `
    <div class="listing-preview">
      <div class="gallery">
        <div id="pmBranded">${coverHtml}</div>
        ${selectStrip}
      </div>
      <div class="listing-info">
        <span class="badge ${isSale ? 'sale' : ''}" style="position:static;display:inline-block;margin-bottom:10px">${isSale ? 'Satılık' : 'Kiralık'}</span>
        ${p.bolge ? `<div class="detail-region">${esc(regionDisplay(p.bolge))}</div>` : ''}
        <h2 class="detail-title" style="font-size:1.7rem">${esc(pickTitle(p) || 'Başlıksız')}</h2>
        ${p.ekleyen ? `<div class="ekleyen-line" style="margin:4px 0 0">👤 ${esc(p.ekleyen)} ekledi</div>` : ''}
        <div class="detail-price">${fmtPrice(p.fiyat, p.para_birimi, p.tip)}</div>
        <div class="spec-table">${listingSpecRows(p)}</div>
        ${features.length ? `<div class="feature-chips">${features.map((f) => `<span class="chip">${esc(f)}</span>`).join('')}</div>` : ''}
        ${desc ? `<h4 style="font-size:1rem;margin:14px 0 6px">Açıklama</h4><p class="detail-desc" style="margin:0">${esc(desc)}</p>` : ''}
      </div>
    </div>`;

  // Kapak seçimi: tıklanan fotoğrafı kapak yap (DB'ye kaydet, anında güncelle)
  const ct = $('#pmCoverThumbs');
  if (ct) ct.onclick = async (e) => {
    const tile = e.target.closest('.cthumb[data-ci]'); if (!tile) return;
    const idx = Number(tile.dataset.ci);
    if (idx === (p.kapak_index || 0)) return;
    const { error } = await supabase.from('properties').update({ kapak_index: idx }).eq('id', id);
    if (error) { toast('Kapak güncellenemedi', 'err'); return; }
    p.kapak_index = idx;                 // yerel veriyi de güncelle
    toast('Kapak güncellendi', 'ok');
    openGallery(id);                     // önizlemeyi tazele (markalı kapak yeni fotoğrafla)
    renderPropList();                    // listedeki kapak da değişsin
  };

  $('#pmEdit').onclick = () => { closeModal($('#photoModal')); openProp(id); };
  $('#pmOpen').href = `daire.html?id=${id}`;
  const dl = $('#pmDownload');
  dl.classList.toggle('hidden', !photos.length);
  dl.innerHTML = `${ICON.download}<span>Fotoğrafları indir</span>`;
  dl.onclick = async () => {
    const orig = dl.innerHTML; dl.disabled = true;
    dl.innerHTML = `<span class="spin" style="display:inline-flex">${ICON.spinner}</span><span>Hazırlanıyor…</span>`;
    await downloadPropertyPhotos([p], slugify(`${p.bolge || ''}-${pickTitle(p)}`), () => {});
    dl.disabled = false; dl.innerHTML = orig;
    toast('Fotoğraflar indirildi', 'ok');
  };
  openModal('#photoModal');
}

// Daireler sekmesi filtre olayları
$('#pf_tip').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tip]'); if (!b) return;
  fProps.tip = b.dataset.tip;
  $$('#pf_tip button').forEach((x) => x.classList.toggle('active', x === b));
  renderPropList();
});
$('#pf_proje').addEventListener('change', (e) => { fProps.proje = e.target.value; renderPropList(); });
$('#pf_furn').addEventListener('change', (e) => { fProps.furn = e.target.value; renderPropList(); });
$('#pf_sort').addEventListener('change', (e) => { fProps.sort = e.target.value; renderPropList(); });
$('#pf_q').addEventListener('input', (e) => { fProps.q = e.target.value.trim(); renderPropList(); });

// Görünüm anahtarı (Daireler)
$('#propView').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-view]'); if (!b) return;
  viewMode = b.dataset.view;
  $$('#propView button').forEach((x) => x.classList.toggle('active', x === b));
  renderPropList();
});

// Görünüm anahtarı (Portföy seçimi)
let selView = 'list';
$('#selView')?.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-view]'); if (!b) return;
  selView = b.dataset.view;
  $$('#selView button').forEach((x) => x.classList.toggle('active', x === b));
  renderSelectGrid();
});

// Çoklu bölge menüsü aç/kapa + dışarı tıklayınca kapan
['#pf_region_btn', '#sf_region_btn'].forEach((sel) => {
  const panel = sel.replace('_btn', '_panel');
  $(sel).addEventListener('click', (e) => { e.stopPropagation(); $(panel).classList.toggle('hidden'); });
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.multi-region')) { $('#pf_region_panel')?.classList.add('hidden'); $('#sf_region_panel')?.classList.add('hidden'); }
});

/* ---- Daire modalı ---- */
function openModal(id) { $(id).classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(el) { el.classList.remove('open'); document.body.style.overflow = ''; }
$$('.modal-overlay').forEach((ov) => {
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.closest('[data-close]')) closeModal(ov); });
});

$('#addPropBtn').addEventListener('click', () => openProp(null));

function openProp(id) {
  editId = id;
  photos = [];
  const p = id ? props.find((x) => x.id === id) : null;
  $('#propModalTitle').textContent = id ? 'Daireyi düzenle' : 'Yeni daire';
  $('#f_id').value = id || '';
  $('#f_baslik').value = p?.baslik || '';
  $('#f_tip').value = p?.tip || 'kiralik';
  // İl / ilçe (kademeli)
  const district = regionDistrict(p?.bolge);
  if (district) {
    $('#f_il').value = district;
    fillIlceOptions(district, rkey(p.bolge) !== rkey(district) ? p.bolge : '');
  } else if (p?.bolge) {
    $('#f_il').value = '';
    $('#f_bolge').innerHTML = `<option value="${esc(p.bolge)}">${esc(p.bolge)}</option>`;
    $('#f_bolge').value = p.bolge;
  } else {
    $('#f_il').value = '';
    fillIlceOptions('', '');
  }
  $('#f_konut').value = p?.konut_tipi || '';
  setSelectValue('#f_oda', p?.oda_sayisi);
  setSelectValue('#f_proje', p?.proje);
  $('#f_blok').value = p?.blok || '';
  $('#f_daire_no').value = p?.daire_no || '';
  $('#f_m2').value = p?.metrekare ?? '';
  $('#f_fiyat').value = p?.fiyat ?? '';
  $('#f_cur').value = p?.para_birimi || 'GBP';
  setSelectValue('#f_banyo', p?.banyo_sayisi != null ? String(p.banyo_sayisi) : '');
  $('#f_kat').value = p?.kat || '';
  updateKatVisibility();
  $('#f_esyali').value = p?.esyali == null ? '' : String(p.esyali);
  $('#f_aciklama').value = p?.aciklama || '';
  // Otomatik dolum izleyicisini sıfırla (mevcut değer korunsun, üzerine yazılmasın)
  lastAutoAciklama = '';
  if (p?.fotograflar?.length) {
    const cov = Math.min(p.kapak_index || 0, p.fotograflar.length - 1);
    const ordered = [p.fotograflar[cov], ...p.fotograflar.filter((_, i) => i !== cov)];
    photos = ordered.map((url) => ({ url, path: urlToPath(url) }));
  }
  renderPreviews();
  openModal('#propModal');
}

function urlToPath(url) {
  const m = url.split(`/object/public/${STORAGE_BUCKET}/`);
  return m[1] ? decodeURIComponent(m[1]) : null;
}

let previewSortable = null;
function renderPreviews() {
  const el = $('#previews');
  el.innerHTML = photos.map((ph, i) => `
    <div class="pv ${i === 0 ? 'cover' : ''}" data-i="${i}" title="${i === 0 ? 'Kapak fotoğrafı' : 'Sürükleyerek sırala · tıkla = kapak yap'}">
      ${ph.uploading ? `<div class="skeleton" style="width:100%;height:100%"></div>` : `<img src="${esc(ph.url)}" alt="" draggable="false" />`}
      <button type="button" class="rm" data-rm="${i}">×</button>
    </div>`).join('');

  // Tıkla = kapak yap (öne al)
  el.querySelectorAll('.pv').forEach((pv) => {
    pv.addEventListener('click', (e) => {
      if (e.target.closest('[data-rm]')) return;
      const i = Number(pv.dataset.i);
      if (i === 0) return;
      const [item] = photos.splice(i, 1); photos.unshift(item); renderPreviews();
    });
  });
  el.querySelectorAll('[data-rm]').forEach((b) => b.onclick = (e) => {
    e.stopPropagation();
    photos.splice(Number(b.dataset.rm), 1); renderPreviews();
  });

  // Sürükleyerek sıralama (masaüstü + dokunmatik) — SortableJS
  if (previewSortable) { previewSortable.destroy(); previewSortable = null; }
  if (window.Sortable) {
    previewSortable = window.Sortable.create(el, {
      animation: 150,
      delay: 120, delayOnTouchOnly: true, // dokunmatikte bas-bekle ile sürükle (kaydırmayla karışmasın)
      filter: '.rm',                       // çöp butonuna basınca sürükleme başlamasın
      onEnd: () => {
        const order = [...el.querySelectorAll('.pv')].map((x) => Number(x.dataset.i));
        photos = order.map((i) => photos[i]);
        renderPreviews();
      },
    });
  }

  updateCoverPreview();
}

// Markalı kapağın canlı önizlemesi
function updateCoverPreview() {
  const box = document.getElementById('coverPreview');
  if (!box) return;
  // Kapak = dairenin kendi (yüklediği) ilk fotoğrafı; otomatik ortak fotoğraflar kapak olmaz
  const cover = photos.find((p) => !p.common);
  if (!cover || cover.uploading || !cover.url) {
    box.innerHTML = `<div class="empty-cover">Kendi fotoğrafını ekleyince kapak burada görünür. (Otomatik ortak alan fotoğrafları galeride olur, kapak olmaz.)</div>`;
    return;
  }
  const row = {
    fotograflar: [cover.url],
    kapak_index: 0,
    tip: $('#f_tip').value,
    proje: $('#f_proje').value || null,
    bolge: $('#f_bolge').value || $('#f_il').value || null,
    oda_sayisi: $('#f_oda').value.trim() || null,
    esyali: $('#f_esyali').value === '' ? null : $('#f_esyali').value === 'true',
    baslik: $('#f_baslik').value,
  };
  box.innerHTML = brandedCover(row);
}

// Kapak bilgisi alanları değişince önizlemeyi tazele
['#f_tip', '#f_proje', '#f_bolge', '#f_oda', '#f_esyali'].forEach((sel) => {
  document.querySelector(sel)?.addEventListener('input', updateCoverPreview);
  document.querySelector(sel)?.addEventListener('change', updateCoverPreview);
});

// Foto yükleme
const uploader = $('#uploader');
const fileInput = $('#fileInput');
uploader.addEventListener('click', () => fileInput.click());
uploader.addEventListener('dragover', (e) => { e.preventDefault(); uploader.classList.add('drag'); });
uploader.addEventListener('dragleave', () => uploader.classList.remove('drag'));
uploader.addEventListener('drop', (e) => { e.preventDefault(); uploader.classList.remove('drag'); handleFiles(e.dataTransfer.files); });
fileInput.addEventListener('change', () => { handleFiles(fileInput.files); fileInput.value = ''; });

// Fotoğrafı yüklemeden önce küçült + sıkıştır (hızlı yükleme/açılma)
async function compressImage(file, maxDim = 1600, quality = 0.50) {
  try {
    // EXIF dönüşünü uygula (telefon fotoğrafları için)
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    // Önce WebP (daha küçük), desteklenmezse JPEG
    let blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', quality));
    let ext = 'webp';
    if (!blob || blob.type !== 'image/webp') {
      blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
      ext = 'jpg';
    }
    // Sıkıştırma işe yaramadıysa (zaten küçükse) orijinali kullan
    if (!blob || blob.size >= file.size) {
      return { blob: file, ext: (file.name.split('.').pop() || 'jpg').toLowerCase(), contentType: file.type };
    }
    return { blob, ext, contentType: blob.type };
  } catch (e) {
    // Küçültme başarısızsa orijinali yükle
    return { blob: file, ext: (file.name.split('.').pop() || 'jpg').toLowerCase(), contentType: file.type };
  }
}

async function handleFiles(fileList) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
  for (const file of files) {
    const ph = { url: '', path: '', uploading: true };
    // Yüklenen fotoğraf, otomatik ortak fotoğrafların ÖNÜNE girsin (kapak dairenin kendi fotoğrafı olsun)
    const ins = photos.findIndex((p) => p.common);
    if (ins === -1) photos.push(ph); else photos.splice(ins, 0, ph);
    renderPreviews();
    try {
      const { blob, ext, contentType } = await compressImage(file);
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { contentType, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      ph.url = data.publicUrl; ph.path = path; ph.uploading = false;
    } catch (err) {
      console.error(err);
      toast('Bir fotoğraf yüklenemedi', 'err');
      photos = photos.filter((x) => x !== ph);
    }
    renderPreviews();
  }
}

$('#savePropBtn').addEventListener('click', async () => {
  if (photos.some((p) => p.uploading)) { toast('Fotoğraflar yükleniyor, bekleyin…'); return; }
  // Bölge zorunlu
  if (!$('#f_il').value && !$('#f_bolge').value) {
    toast('Lütfen bölge (il) seçin', 'err');
    $('#f_il').focus();
    $('#f_il').style.borderColor = 'var(--danger)';
    return;
  }
  $('#f_il').style.borderColor = '';

  const payload = {
    baslik: $('#f_baslik').value.trim() || null,
    tip: $('#f_tip').value,
    konut_tipi: $('#f_konut').value || null,
    proje: $('#f_proje').value || null,
    blok: $('#f_blok').value.trim() || null,
    daire_no: $('#f_daire_no').value.trim() || null,
    bolge: $('#f_bolge').value || $('#f_il').value || null,
    oda_sayisi: $('#f_oda').value.trim() || null,
    metrekare: numOrNull($('#f_m2').value),
    fiyat: numOrNull($('#f_fiyat').value),
    para_birimi: $('#f_cur').value,
    banyo_sayisi: numOrNull($('#f_banyo').value),
    kat: $('#f_kat').value.trim() || null,
    esyali: $('#f_esyali').value === '' ? null : $('#f_esyali').value === 'true',
    aciklama: $('#f_aciklama').value.trim() || null,
    fotograflar: photos.map((p) => p.url),
    kapak_index: 0,
    // Ekleyen: mevcut varsa korunur, yoksa (yeni daire ya da eski boş kayıt) giriş yapan
    ekleyen: (editId && props.find((x) => x.id === editId)?.ekleyen) || currentCreatorName() || null,
  };

  // Mükerrer uyarısı (sadece yeni daire eklerken)
  if (!editId) {
    const dup = props.find((p) => dupKey(p) === dupKey(payload));
    if (dup) {
      const ad = pickTitle(dup) || (dup.blok || dup.daire_no ? `Blok ${dup.blok || '?'} No ${dup.daire_no || '?'}` : 'Bu daire');
      if (!confirm(`⚠️ Bu daire daha önce eklenmiş görünüyor:\n"${ad}" — ${regionDisplay(dup.bolge) || ''}\n\nYine de tekrar eklensin mi?`)) return;
    }
  }

  const btn = $('#savePropBtn'); btn.disabled = true; btn.textContent = 'Kaydediliyor…';
  const error = await savePropPayload(payload);

  btn.disabled = false; btn.textContent = 'Kaydet';
  if (error) { console.error(error); toast('Kaydedilemedi: ' + error.message, 'err'); return; }
  closeModal($('#propModal'));
  toast(editId ? 'Daire güncellendi' : 'Daire eklendi', 'ok');
  loadProps();
});

// İki dairenin "aynı" sayılması için imza: blok+daire no (+proje) varsa onu, yoksa başlık+bölge+oda
function dupKey(o) {
  const n = (s) => asciiLower(String(s ?? '')).replace(/\s+/g, ' ').trim();
  if (o.blok && o.daire_no) return `u|${n(o.proje)}|${n(o.blok)}|${n(o.daire_no)}`;
  return `t|${n(o.baslik)}|${n(o.bolge)}|${n(o.oda_sayisi)}`;
}

// Kaydet; blok/daire_no sütunları henüz eklenmemişse onlarsız tekrar dener (SQL çalıştırılana kadar çökmesin)
async function savePropPayload(payload) {
  const run = (pl) => editId
    ? supabase.from('properties').update(pl).eq('id', editId)
    : supabase.from('properties').insert(pl);
  let { error } = await run(payload);
  if (error && /blok|daire_no|schema cache|column/i.test(error.message || '')) {
    const { blok, daire_no, ...rest } = payload;
    ({ error } = await run(rest));
    if (!error) toast('Kaydedildi, fakat Blok/Daire No için önce SQL’i çalıştırın', 'err');
  }
  return error;
}

async function delProp(id) {
  const p = props.find((x) => x.id === id);
  if (!confirm(`"${pickTitle(p) || 'Bu daire'}" silinecek. Emin misiniz?`)) return;
  // Storage fotoğraflarını da temizle — ORTAK (_ortak/) fotoğraflar paylaşımlı, onları SİLME
  const paths = (p.fotograflar || []).map(urlToPath).filter(Boolean).filter((path) => !path.startsWith('_ortak/'));
  if (paths.length) await supabase.storage.from(STORAGE_BUCKET).remove(paths).catch(() => {});
  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) { toast('Silinemedi', 'err'); return; }
  toast('Daire silindi', 'ok');
  loadProps();
}

function numOrNull(v) { v = String(v).trim(); return v === '' ? null : Number(v); }

/* ============== PORTFÖYLER ============== */
async function loadPorts() {
  const { data } = await supabase.from('portfolios').select('*').order('created_at', { ascending: false });
  ports = data || [];
  $('#portCount').textContent = ports.length;
  renderPortList();
}

function portUrl(kod) { return new URL(`p?kod=${kod}`, location.href).href; }

function renderPortList() {
  const el = $('#portList');
  if (!ports.length) { el.innerHTML = `<p class="text-muted">Henüz portföy oluşturulmamış. “Yeni portföy oluştur” ile başlayın.</p>`; return; }
  el.innerHTML = ports.map((p) => {
    const url = portUrl(p.kod);
    const count = (p.property_ids || []).length;
    const date = new Date(p.created_at).toLocaleDateString('tr-TR');
    return `
    <div class="port-card" data-preview="${url}&admin=1" title="Önizlemek için tıkla">
      <div class="port-card-top">
        <div class="port-icon">${ICON.link}</div>
        <div class="port-meta">
          <div class="port-title">${esc(p.baslik || 'Başlıksız portföy')}</div>
          <div class="port-sub">${count} daire · ${date}${p.olusturan ? ' · Hazırlayan: ' + esc(p.olusturan) : ''}</div>
        </div>
        <button class="icon-btn" data-editport="${p.kod}" title="Düzenle">${ICON.edit}</button>
        <button class="icon-btn danger" data-delport="${p.kod}" title="Portföyü sil">${ICON.trash}</button>
      </div>
      <div class="port-link" data-copy="${p.kod}" title="Kopyalamak için tıkla">
        <span class="port-link-url">${esc(url)}</span>
        <span class="port-link-copy">${ICON.copy} Kopyala</span>
      </div>
      <div class="port-actions">
        <a class="btn btn-wa btn-sm" href="${waShare(url)}" target="_blank" rel="noopener">${ICON.wa}<span>WhatsApp'tan gönder</span></a>
        <button class="btn btn-ghost btn-sm" data-editport="${p.kod}">${ICON.edit}<span>Düzenle</span></button>
        <a class="btn btn-ghost btn-sm" href="${url}&admin=1" target="_blank" rel="noopener">${ICON.link}<span>Önizle</span></a>
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.port-link[data-copy]').forEach((b) => b.onclick = () => copy(portUrl(b.dataset.copy)));
  el.querySelectorAll('[data-delport]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); delPort(b.dataset.delport); });
  el.querySelectorAll('[data-editport]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); openEditPort(b.dataset.editport); });
  // Kartın boş yerine tıklayınca önizleme aç (buton/link/sil hariç)
  el.querySelectorAll('.port-card').forEach((card) => card.addEventListener('click', (e) => {
    if (e.target.closest('.port-link, .port-actions, [data-delport], [data-editport]')) return;
    window.open(card.dataset.preview, '_blank', 'noopener');
  }));
}

async function delPort(kod) {
  if (!confirm('Bu portföy linki silinecek. Link artık çalışmayacak. Emin misiniz?')) return;
  const { error } = await supabase.from('portfolios').delete().eq('kod', kod);
  if (error) { toast('Silinemedi', 'err'); return; }
  toast('Portföy silindi', 'ok'); loadPorts();
}

/* ---- Portföy oluşturma / düzenleme modalı ---- */
let editPortKod = null;
// Giriş yapan kişinin adı (otomatik) — Hazırlayan ve "daire ekleyen" için
function currentCreatorName() { return nameFromEmail(myEmail); }
// Hazırlayan dropdown'ını doldur ve seçili kişiyi ayarla (listede yoksa ekler)
function fillCreatorSelect(sel) {
  const el = $('#port_creator'); if (!el) return;
  el.innerHTML = CREATORS.map((c) => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
  if (sel && !CREATORS.some((c) => c.name === sel)) el.insertAdjacentHTML('afterbegin', `<option value="${esc(sel)}">${esc(sel)}</option>`);
  el.value = sel || CREATORS[0].name;
}
// Otomatik varsayılan hazırlayan: son seçilen → giriş e-postasından → ilk kişi
function defaultCreator() {
  const remembered = localStorage.getItem('sg_creator');
  if (remembered && CREATORS.some((c) => c.name === remembered)) return remembered;
  const auto = currentCreatorName();
  if (auto && CREATORS.some((c) => c.name === auto)) return auto;
  return CREATORS[0].name;
}
function resetPortFilters() {
  fSel.tip = 'all'; fSel.regions = []; fSel.proje = ''; fSel.furn = ''; fSel.q = '';
  $$('#sf_tip button').forEach((b) => b.classList.toggle('active', b.dataset.tip === 'all'));
  $('#sf_proje').value = ''; $('#sf_furn').value = ''; $('#sf_q').value = '';
  renderRegionMulti('#sf_region_panel', '#sf_region_btn', fSel, renderSelectGrid);
}
$('#addPortBtn').addEventListener('click', () => {
  editPortKod = null;
  selected = new Set();
  $('#port_title').value = '';
  fillCreatorSelect(defaultCreator());
  $('#portModalTitle').textContent = 'Yeni portföy';
  $('#savePortBtn').textContent = 'Link oluştur';
  resetPortFilters();
  renderSelectGrid();
  openModal('#portModal');
});

// Mevcut portföyü düzenle (aynı link/kod korunur)
function openEditPort(kod) {
  const port = ports.find((p) => p.kod === kod); if (!port) return;
  editPortKod = kod;
  selected = new Set(port.property_ids || []);
  $('#port_title').value = port.baslik || '';
  fillCreatorSelect(port.olusturan || defaultCreator());
  $('#portModalTitle').textContent = 'Portföyü düzenle';
  $('#savePortBtn').textContent = 'Güncelle';
  resetPortFilters();
  renderSelectGrid();
  openModal('#portModal');
}

function renderSelectGrid() {
  const el = $('#selectGrid');
  $('#selCount').textContent = selected.size;
  if (!props.length) { el.className = ''; el.innerHTML = `<p class="text-muted">Önce daire eklemelisiniz.</p>`; return; }
  const list = props.filter((p) => matchFilter(p, fSel));
  // "Tümünü seç": ekranda görüneni (filtre/projeye uyanları) seçer/kaldırır
  const allSel = list.length && list.every((p) => selected.has(p.id));
  $('#selAllBtn').innerHTML = allSel
    ? `${ICON.x}<span>Seçimi kaldır</span>`
    : `${ICON.check}<span>Tümünü seç (${list.length})</span>`;
  if (!list.length) { el.className = ''; el.innerHTML = `<p class="text-muted">Bu filtreye uygun daire yok.</p>`; return; }
  renderView(el, list, selView, 'select');
}

// Tümünü seç / kaldır — ekranda görünen (filtreye/projeye uyan) daireler
$('#selAllBtn').addEventListener('click', () => {
  const list = props.filter((p) => matchFilter(p, fSel));
  const allSel = list.length && list.every((p) => selected.has(p.id));
  if (allSel) list.forEach((p) => selected.delete(p.id));
  else list.forEach((p) => selected.add(p.id));
  renderSelectGrid();
});

// Portföy seçim filtresi olayları
$('#sf_tip').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tip]'); if (!b) return;
  fSel.tip = b.dataset.tip;
  $$('#sf_tip button').forEach((x) => x.classList.toggle('active', x === b));
  renderSelectGrid();
});
$('#sf_proje').addEventListener('change', (e) => { fSel.proje = e.target.value; renderSelectGrid(); });
$('#sf_furn').addEventListener('change', (e) => { fSel.furn = e.target.value; renderSelectGrid(); });
$('#sf_q').addEventListener('input', (e) => { fSel.q = e.target.value.trim(); renderSelectGrid(); });

$('#savePortBtn').addEventListener('click', async () => {
  if (!selected.size) { toast('En az bir daire seçin', 'err'); return; }
  const btn = $('#savePortBtn'); const origLabel = editPortKod ? 'Güncelle' : 'Link oluştur';
  btn.disabled = true; btn.textContent = editPortKod ? 'Güncelleniyor…' : 'Oluşturuluyor…';
  // seçim sırası: props listesindeki sıra
  const ids = props.filter((p) => selected.has(p.id)).map((p) => p.id);
  const creator = $('#port_creator').value.trim() || null;
  if (creator) localStorage.setItem('sg_creator', creator);
  const payload = { baslik: $('#port_title').value.trim() || null, property_ids: ids, olusturan: creator };

  let error, kod;
  if (editPortKod) {
    kod = editPortKod;
    ({ error } = await supabase.from('portfolios').update(payload).eq('kod', kod));
  } else {
    kod = Math.random().toString(36).slice(2, 9);
    ({ error } = await supabase.from('portfolios').insert({ kod, ...payload }));
  }

  btn.disabled = false; btn.textContent = origLabel;
  if (error) { toast((editPortKod ? 'Güncellenemedi: ' : 'Oluşturulamadı: ') + error.message, 'err'); return; }
  const wasEdit = !!editPortKod;
  editPortKod = null;
  closeModal($('#portModal'));
  if (wasEdit) { toast('Portföy güncellendi (link aynı)', 'ok'); } else { showLink(kod); }
  loadPorts();
});

function showLink(kod) {
  const url = portUrl(kod);
  const wa = $('#waLinkBtn');
  wa.innerHTML = `${ICON.wa}<span>WhatsApp'tan gönder</span>`;
  wa.onclick = () => window.open(waShare(url), '_blank');
  $('#copyLinkBtn').innerHTML = `${ICON.copy}<span>Linki kopyala</span>`;
  $('#copyLinkBtn').onclick = () => copy(url);
  openModal('#linkModal');
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Link kopyalandı', 'ok'); }
  catch { prompt('Linki kopyalayın:', text); }
}

/* ============== EXCEL İLE TOPLU EKLEME ============== */
// Not: 'id (değiştirmeyin)' sütunu güncelleme için kimliktir — dışa aktarınca dolu gelir, dokunma.
const XLS_HEADERS = ['id (değiştirmeyin)', 'Başlık', 'Tip', 'Proje', 'Blok', 'Daire No', 'Konut Tipi', 'Bölge', 'Oda Sayısı', 'Fiyat', 'Para Birimi', 'm2', 'Banyo', 'Kat', 'Eşya', 'Özellikler', 'Açıklama', "Fotoğraf URL'leri"];
// Bir daireyi Excel satırına çevir (dışa aktarma + şablon aynı sütun sırası)
function propToRow(p) {
  return [
    p.id || '', p.baslik || '', p.tip === 'satilik' ? 'Satılık' : 'Kiralık', p.proje || '',
    p.blok || '', p.daire_no || '', p.konut_tipi || '', p.bolge || '', p.oda_sayisi || '',
    p.fiyat ?? '', p.para_birimi || '', p.metrekare ?? '', p.banyo_sayisi ?? '', p.kat || '',
    p.esyali == null ? '' : (p.esyali ? 'Eşyalı' : 'Eşyasız'),
    (p.ozellikler || []).join(', '), p.aciklama || '', (p.fotograflar || []).join(', '),
  ];
}

// Başlık normalleştirme (büyük/küçük, Türkçe karakter, boşluk farkını yok say)
function asciiLower(s) {
  return String(s ?? '').toLowerCase()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/â/g, 'a');
}
function normHeader(h) { return asciiLower(h).replace(/[^a-z0-9]/g, ''); }

// Sütun başlığı -> alan eşlemesi
const FIELD_ALIASES = {
  id: ['id', 'iddegistirmeyin', 'uuid', 'kayitid'],
  blok: ['blok', 'block'],
  daire_no: ['daireno', 'dairenumarasi', 'apartmentno', 'unitno', 'dairenmarasi'],
  baslik: ['baslik', 'basliktr', 'title', 'titletr', 'ad', 'isim'],
  title_en: ['basliken', 'titleen'],
  tip: ['tip', 'tur', 'durum', 'type', 'islemtipi', 'islem'],
  proje: ['proje', 'project', 'site', 'sitead', 'siteadi'],
  konut_tipi: ['konuttipi', 'konut', 'emlaktipi', 'gayrimenkultipi', 'propertytype', 'evtipi'],
  bolge: ['bolge', 'konum', 'region', 'location', 'sehir', 'ilce'],
  oda_sayisi: ['odasayisi', 'oda', 'odatipi', 'rooms', 'odasay'],
  fiyat: ['fiyat', 'price', 'ucret', 'tutar'],
  para_birimi: ['parabirimi', 'currency', 'doviz', 'dovizcinsi', 'birim'],
  metrekare: ['m2', 'metrekare', 'alan', 'area', 'brut', 'net', 'buyukluk'],
  banyo_sayisi: ['banyo', 'banyosayisi', 'bath', 'bathroom', 'bathrooms'],
  kat: ['kat', 'floor'],
  esyali: ['esya', 'esyali', 'esyadurumu', 'furnished', 'mobilya', 'esyalimi'],
  ozellikler: ['ozellikler', 'features', 'olanaklar', 'donanim'],
  aciklama: ['aciklama', 'description', 'desc', 'detay', 'not', 'aciklamatr'],
  desc_en: ['aciklamaen', 'descriptionen', 'descen'],
  fotograflar: ['fotografurlleri', 'fotograflar', 'fotograf', 'foto', 'resim', 'resimler', 'images', 'image', 'photos', 'photo', 'url', 'urller'],
};
function headerToField(h) {
  const n = normHeader(h);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) if (aliases.includes(n)) return field;
  return null;
}

// Değer dönüştürücüler
function vStr(v) { const s = String(v ?? '').trim(); return s || null; }
function vNum(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const n = Number(s); return Number.isFinite(n) ? n : null;
}
function vTip(v) { const s = asciiLower(v); if (s.includes('satil') || s.includes('sale')) return 'satilik'; if (s.includes('kira') || s.includes('rent')) return 'kiralik'; return 'kiralik'; }
function vCur(v) { const s = String(v ?? '').toUpperCase(); if (s.includes('EUR') || s.includes('€')) return 'EUR'; if (s.includes('USD') || s.includes('$')) return 'USD'; if (s.includes('TRY') || s.includes('TL') || s.includes('₺')) return 'TRY'; if (s.includes('GBP') || s.includes('£')) return 'GBP'; return 'GBP'; }
function vEsya(v) { if (v == null || v === '') return null; const s = asciiLower(v); if (s.includes('esyasiz') || s.includes('hayir') || s === 'no' || s === 'false' || s.includes('yok')) return false; if (s.includes('esyali') || s.includes('evet') || s === 'yes' || s === 'true' || s.includes('var') || s.includes('mobilya')) return true; return null; }
function vList(v) { if (v == null || v === '') return []; return String(v).split(/[,;\n]/).map((x) => x.trim()).filter(Boolean); }
function vPhotos(v) { return vList(v).filter((u) => /^https?:\/\//i.test(u)); }
function sigOf(o) { return asciiLower(`${o.baslik || ''}|${o.bolge || ''}|${o.oda_sayisi || ''}`); }

function colWidths() { return XLS_HEADERS.map((h) => ({ wch: h === "Fotoğraf URL'leri" || h === 'Açıklama' ? 40 : (h.startsWith('id') ? 24 : 18) })); }

// Şablon indir (yeni daireler için — id boş bırakılır)
$('#dlTemplateBtn').addEventListener('click', () => {
  if (!window.XLSX) { toast('Excel aracı yüklenemedi, sayfayı yenileyin', 'err'); return; }
  const example = ['', 'Denize sıfır 2+1 lüks daire', 'Kiralık', 'Four Season 1', 'A', '12', 'Daire', 'Girne', '2+1', 750, 'GBP', 95, 1, '3', 'Eşyalı', 'Havuz, Otopark, Asansör', 'Geniş balkonlu, deniz manzaralı.', ''];
  const ws = XLSX.utils.aoa_to_sheet([XLS_HEADERS, example]);
  ws['!cols'] = colWidths();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daireler');
  XLSX.writeFile(wb, 'selected-global-daire-sablonu.xlsx');
});

// Dışa aktar — tüm daireleri Excel olarak indir (id dahil → düzenleyip geri yükleyince güncellenir)
$('#exportBtn')?.addEventListener('click', () => {
  if (!window.XLSX) { toast('Excel aracı yüklenemedi, sayfayı yenileyin', 'err'); return; }
  if (!props.length) { toast('Aktarılacak daire yok', 'err'); return; }
  const ws = XLSX.utils.aoa_to_sheet([XLS_HEADERS, ...props.map(propToRow)]);
  ws['!cols'] = colWidths();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daireler');
  XLSX.writeFile(wb, `selected-global-daireler-${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast(`${props.length} daire dışa aktarıldı`, 'ok');
});

// Yükleyici olayları
const xlsUploader = $('#xlsUploader');
const xlsInput = $('#xlsInput');
xlsUploader.addEventListener('click', () => xlsInput.click());
xlsUploader.addEventListener('dragover', (e) => { e.preventDefault(); xlsUploader.classList.add('drag'); });
xlsUploader.addEventListener('dragleave', () => xlsUploader.classList.remove('drag'));
xlsUploader.addEventListener('drop', (e) => { e.preventDefault(); xlsUploader.classList.remove('drag'); if (e.dataTransfer.files[0]) importXlsx(e.dataTransfer.files[0]); });
xlsInput.addEventListener('change', () => { if (xlsInput.files[0]) importXlsx(xlsInput.files[0]); xlsInput.value = ''; });

async function importXlsx(file) {
  if (!window.XLSX) { toast('Excel aracı yüklenemedi, sayfayı yenileyin', 'err'); return; }
  const result = $('#importResult');
  result.innerHTML = `<div class="import-summary">İşleniyor…</div>`;
  let rows;
  try {
    const name = (file.name || '').toLowerCase();
    let wb;
    if (name.endsWith('.csv')) {
      wb = XLSX.read(await file.text(), { type: 'string' });
    } else {
      const data = new Uint8Array(await file.arrayBuffer());
      try {
        wb = XLSX.read(data, { type: 'array' });
      } catch (inner) {
        // Yedek: bazı dosyalar binary string olarak daha iyi okunur
        let bin = ''; for (let i = 0; i < data.length; i++) bin += String.fromCharCode(data[i]);
        wb = XLSX.read(bin, { type: 'binary' });
      }
    }
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  } catch (e) {
    console.error('Excel okuma hatası:', e);
    const kb = Math.round((file.size || 0) / 1024);
    const isEncrypted = /encrypt/i.test(e.message || '');
    result.innerHTML = `<div class="import-summary">
      <span style="color:var(--danger)">Bu Excel dosyası okunamadı.</span> (${esc(file.name || '')}, ${kb} KB)<br>
      ${isEncrypted
        ? `<span style="font-size:.88rem">Dosyanız <strong>şifreli/korumalı</strong> kaydedilmiş (Excel for Mac bunu bazen otomatik yapar).</span><br>
           <strong style="font-size:.9rem;color:var(--ok)">✅ Kesin çözüm — CSV olarak kaydedin:</strong>
           <span style="font-size:.85rem">Excel'de <em>Dosya → Farklı Kaydet</em> → biçim <strong>“CSV UTF-8 (Virgülle ayrılmış)”</strong> → kaydet → o <strong>.csv</strong> dosyasını buraya yükleyin. Tüm bilgiler aynı şekilde aktarılır.</span>`
        : `<span class="text-muted" style="font-size:.82rem">Teknik sebep: ${esc(e.message || String(e))}</span><br>
           <strong style="font-size:.85rem">Çözüm:</strong> <span style="font-size:.85rem">İndirdiğiniz şablonu kullanın ya da dosyayı <strong>.csv</strong> olarak kaydedip yükleyin.</span>`}
    </div>`;
    return;
  }
  if (!rows || rows.length < 2) { result.innerHTML = `<div class="import-summary">Dosyada veri satırı bulunamadı. Şablonu kullanın.</div>`; return; }

  // Başlık satırı -> sütun eşlemesi
  const headerRow = rows[0];
  const colMap = headerRow.map(headerToField); // index -> field|null
  if (!colMap.includes('baslik')) {
    result.innerHTML = `<div class="import-summary"><span style="color:var(--danger)">Sütun başlıkları tanınmadı.</span> Lütfen indirdiğiniz <strong>şablonu</strong> kullanın (başlık satırını silmeyin).</div>`;
    return;
  }

  // Sadece Excel'de bulunan sütunlar güncellenir (Excel'de olmayan alan silinmez)
  const presentFields = new Set(colMap.filter(Boolean));
  const existingIds = new Set(props.map((p) => p.id));
  const sigKeys = new Set(props.map(sigOf)); // id'siz yeni satırlarda mükerrer önleme
  const seen = new Set();

  const toInsert = [];   // yeni daireler
  const toUpdate = [];   // mevcut daireler { id, upd }
  let skipped = 0;
  const errors = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((c) => String(c).trim() === '')) continue; // boş satır
    const raw = {};
    colMap.forEach((field, idx) => { if (field) raw[field] = r[idx]; });

    const full = {
      baslik: vStr(raw.baslik), title_en: vStr(raw.title_en), tip: vTip(raw.tip), proje: vStr(raw.proje),
      blok: vStr(raw.blok), daire_no: vStr(raw.daire_no), konut_tipi: vStr(raw.konut_tipi), bolge: vStr(raw.bolge),
      oda_sayisi: vStr(raw.oda_sayisi), fiyat: vNum(raw.fiyat), para_birimi: vCur(raw.para_birimi),
      metrekare: vNum(raw.metrekare), banyo_sayisi: vNum(raw.banyo_sayisi), kat: vStr(raw.kat),
      esyali: vEsya(raw.esyali), ozellikler: vList(raw.ozellikler), aciklama: vStr(raw.aciklama),
      desc_en: vStr(raw.desc_en), fotograflar: vPhotos(raw.fotograflar),
    };

    const id = vStr(raw.id);
    if (id && existingIds.has(id)) {
      // GÜNCELLE — sadece Excel'de bulunan sütunları değiştir
      const upd = {};
      Object.keys(full).forEach((f) => { if (presentFields.has(f)) upd[f] = full[f]; });
      if (Object.keys(upd).length) toUpdate.push({ id, upd });
      continue;
    }
    // YENİ daire — başlık zorunlu, mükerrer atla
    if (!full.baslik) { errors.push(`${i + 1}. satır: Başlık boş, atlandı`); continue; }
    const sig = sigOf(full);
    if (sigKeys.has(sig) || seen.has(sig)) { skipped++; continue; }
    seen.add(sig);
    toInsert.push({ ...full, kapak_index: 0 });
  }

  if (!toInsert.length && !toUpdate.length) {
    result.innerHTML = `<div class="import-summary"><span class="warn">Değişiklik yok.</span> ${skipped} kayıt zaten mevcuttu (atlandı).${errors.length ? `<ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}</div>`;
    return;
  }

  result.innerHTML = `<div class="import-summary">İşleniyor… (${toUpdate.length} güncelleme, ${toInsert.length} yeni)</div>`;

  let updOk = 0; const updErrs = [];
  for (const u of toUpdate) {
    const { error } = await supabase.from('properties').update(u.upd).eq('id', u.id);
    if (error) updErrs.push(error.message); else updOk++;
  }
  let insOk = 0; let insErr = null;
  if (toInsert.length) {
    const { error } = await supabase.from('properties').insert(toInsert);
    if (error) insErr = error.message; else insOk = toInsert.length;
  }

  if (insErr && !insOk && !updOk) {
    result.innerHTML = `<div class="import-summary"><span style="color:var(--danger)">Hata: ${esc(insErr)}</span></div>`;
    return;
  }
  const bits = [];
  if (updOk) bits.push(`${updOk} daire güncellendi`);
  if (insOk) bits.push(`${insOk} yeni daire eklendi`);
  if (skipped) bits.push(`${skipped} zaten vardı (atlandı)`);
  const errNote = (updErrs.length || insErr) ? `<br><span style="color:var(--danger);font-size:.85rem">Bazı satırlar hata verdi: ${esc((insErr || updErrs[0]) || '')}</span>` : '';
  result.innerHTML = `<div class="import-summary"><span class="big">✓ ${bits.join(', ')}.</span>${errNote}${errors.length ? `<ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}</div>`;
  toast(bits.join(', ') || 'Tamamlandı', 'ok');
  loadProps();
}

init();
