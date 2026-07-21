// Selected Global — Instagram hazırlık sayfası (Phase 1: elle paylaşım yardımcısı)
import { supabase, CURRENCY, CREATORS, creatorContact, nameFromEmail, SUPER_ADMIN_EMAIL } from './config.js?v=82';
import {
  esc, pickTitle, regionDisplay, slugify, toast,
  downloadPropertyPhotos, downloadReel, renderFooter,
} from './ui.js?v=82';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

/* ---------- AUTH ---------- */
let myEmail = '';
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) { myEmail = session.user?.email || ''; showApp(); } else showLogin();
}
function showLogin() { $('#loginScreen').classList.remove('hidden'); $('#app').classList.add('hidden'); }
function showApp() {
  $('#loginScreen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#userName').textContent = nameFromEmail(myEmail) || '';
  $('#footer').innerHTML = renderFooter();
  loadProps();
}
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#loginBtn'); btn.disabled = true; btn.textContent = 'Giriş yapılıyor…';
  $('#loginErr').textContent = '';
  const { data, error } = await supabase.auth.signInWithPassword({ email: $('#loginEmail').value.trim(), password: $('#loginPass').value });
  btn.disabled = false; btn.textContent = 'Giriş yap';
  if (error) { $('#loginErr').textContent = 'Giriş başarısız: e-posta veya şifre hatalı.'; return; }
  myEmail = data.user?.email || ''; showApp();
});
$('#logoutBtn').addEventListener('click', async () => { await supabase.auth.signOut(); showLogin(); });

// Aktivite kaydı (varsa) — başarısız olsa da işlemi bozmaz
async function logAct(action, entity_ref, detail) {
  try {
    await supabase.from('activity_log').insert({
      actor_email: myEmail || null, actor_name: nameFromEmail(myEmail) || null,
      action, entity_type: 'property', entity_ref: entity_ref ? String(entity_ref).slice(0, 200) : null,
      detail: detail ? String(detail).slice(0, 500) : null,
    });
  } catch (_) { /* sessiz */ }
}

/* ---------- VERİ ---------- */
let props = [];
let curId = '';
let igFormat = 'story';
let igSelected = new Set();   // seçili fotoğraf url'leri (sıra korunur)

async function loadProps() {
  const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
  if (error) { toast('Daireler yüklenemedi', 'err'); return; }
  props = data || [];
  fillPropOptions('');
}
function currentProp() { return props.find((p) => p.id === curId) || null; }
// Dairenin kapak fotoğrafı (kapak_index)
function coverOf(p) { const ph = p?.fotograflar || []; if (!ph.length) return null; return ph[Math.min(p.kapak_index || 0, ph.length - 1)]; }
// Seçili fotoğraflar — KAPAK her zaman ilk sırada (gönderi/carousel'de 1. slayt olur)
function orderedSel() {
  const cov = coverOf(currentProp());
  const arr = [...igSelected];
  return (cov && igSelected.has(cov)) ? [cov, ...arr.filter((u) => u !== cov)] : arr;
}

function propLabel(p) {
  const bits = [pickTitle(p) || 'Başlıksız'];
  const r = regionDisplay(p.bolge); if (r) bits.push(r);
  if (p.proje) bits.push(p.proje);
  const n = (p.fotograflar || []).length;
  return `${bits.join(' · ')}  (${n} foto)`;
}
function fillPropOptions(q) {
  const sel = $('#igProp');
  const ql = (q || '').toLocaleLowerCase('tr').trim();
  const list = props.filter((p) => {
    if (!ql) return true;
    const hay = `${pickTitle(p) || ''} ${regionDisplay(p.bolge) || ''} ${p.proje || ''} ${p.oda_sayisi || ''}`.toLocaleLowerCase('tr');
    return hay.includes(ql);
  });
  sel.innerHTML = list.map((p) => `<option value="${esc(p.id)}"${p.id === curId ? ' selected' : ''}>${esc(propLabel(p))}</option>`).join('')
    || '<option disabled>Sonuç yok</option>';
}

/* ---------- FORMAT ---------- */
const FMT_META = {
  story:    { label: 'Story · 9:16',        aspect: 'tall', hint: 'her fotoğraf ayrı story karesi olur' },
  carousel: { label: 'Carousel · 4:5',      aspect: 'feed', hint: '2–10 fotoğraf, seçtiğin sırayla' },
  post:     { label: 'Tek Gönderi · 4:5',   aspect: 'feed', hint: '1 fotoğraf (ilk seçili kapak olur)' },
  reels:    { label: 'Reels · 9:16 video',  aspect: 'tall', hint: 'fotoğraflardan otomatik video' },
};
function setFormat(fmt) {
  igFormat = fmt;
  $$('#igFormat button').forEach((b) => b.classList.toggle('active', b.dataset.fmt === fmt));
  const isReels = fmt === 'reels';
  $('#igPhotosField').classList.toggle('hidden', isReels);
  $('#igReelsField').classList.toggle('hidden', !isReels);
  $('#igReel').classList.toggle('hidden', !isReels);
  $('#igDownload').classList.toggle('hidden', isReels);
  $('#igPhotoHint').textContent = isReels ? '' : `— ${FMT_META[fmt].hint}`;
  $('#igFmtLabel').textContent = FMT_META[fmt].label;
  updatePreview();
}

/* ---------- FOTOĞRAFLAR ---------- */
function onPropChange(id) {
  curId = id;
  const p = currentProp();
  igSelected = new Set((p?.fotograflar || []));   // varsayılan: hepsi seçili
  renderPhotos();
  $('#igCaption').value = p ? buildCaption(p) : '';
  updateCapCount();
  updatePreview();
}
function renderPhotos() {
  const grid = $('#igPhotos');
  const p = currentProp();
  if (!p) { grid.innerHTML = '<p class="text-muted" style="grid-column:1/-1">Önce daire seç.</p>'; return; }
  const photos = p.fotograflar || [];
  if (!photos.length) { grid.innerHTML = '<p class="text-muted" style="grid-column:1/-1">Bu dairede fotoğraf yok.</p>'; return; }
  const order = orderedSel();
  grid.innerHTML = photos.map((u) => {
    const on = igSelected.has(u);
    const num = on ? order.indexOf(u) + 1 : '';
    return `<button type="button" class="ig-ph${on ? ' on' : ''}" data-u="${esc(u)}"><img src="${esc(u)}" alt="" loading="lazy" />${on ? `<span class="ig-ph-num">${num}</span>` : ''}</button>`;
  }).join('');
}
function togglePhoto(u) {
  if (igSelected.has(u)) igSelected.delete(u); else igSelected.add(u);
  renderPhotos(); updatePreview();
}

/* ---------- CAPTION ---------- */
function priceStr(p) {
  if (p.fiyat == null) return 'Fiyat için DM / arayın';
  return `${CURRENCY[p.para_birimi] || ''}${Number(p.fiyat).toLocaleString('tr-TR')}`;
}
function tagize(s) { return '#' + String(s).replace(/\s+/g, '').replace(/[^0-9A-Za-zğüşıöçĞÜŞİÖÇ]/g, ''); }
function hashtags(p) {
  const t = new Set(['#selectedglobal', '#kuzeykıbrıs', '#kktc', '#northcyprus', '#cyprusrealestate', '#kıbrısemlak']);
  t.add(p.tip === 'satilik' ? '#satılıkdaire' : '#kiralıkdaire');
  const r = regionDisplay(p.bolge); if (r) t.add(tagize(r));
  if (p.proje) t.add(tagize(p.proje));
  if (p.konut_tipi) t.add(tagize(p.konut_tipi));
  return [...t].join(' ');
}
function buildCaption(p) {
  const L = [];
  const title = pickTitle(p); if (title) L.push(title);
  const l2 = [];
  if (p.oda_sayisi) l2.push(p.oda_sayisi);
  if (p.konut_tipi) l2.push(p.konut_tipi);
  if (p.metrekare) l2.push(`${p.metrekare} m²`);
  if (l2.length) L.push('🏠 ' + l2.join(' · '));
  const r = regionDisplay(p.bolge);
  if (r) L.push('📍 ' + r + (p.proje ? ` — ${p.proje}` : ''));
  L.push('💰 ' + priceStr(p));
  if (p.esyali != null) L.push(p.esyali ? '🛋️ Eşyalı' : '🪑 Eşyasız');
  if (Array.isArray(p.ozellikler) && p.ozellikler.length) L.push('✨ ' + p.ozellikler.join(' · '));
  if (p.aciklama) { L.push(''); L.push(p.aciklama); }
  const c = creatorContact(p.ekleyen);
  L.push(''); L.push(`📞 ${c.name} — ${c.phone}`);
  L.push(''); L.push(hashtags(p));
  return L.join('\n');
}
function updateCapCount() { $('#igCapCount').textContent = ($('#igCaption').value || '').length; }

/* ---------- ÖNİZLEME ---------- */
function updatePreview() {
  const media = $('#igPhoneMedia');
  const p = currentProp();
  media.className = 'ig-phone-media ' + (FMT_META[igFormat].aspect === 'tall' ? 'tall' : 'feed');
  const first = igFormat === 'reels' ? coverOf(p) : orderedSel()[0];
  if (first) {
    media.style.backgroundImage = `url("${first}")`;
    media.innerHTML = igFormat === 'reels' ? '<span class="ig-play">▶</span>' : (igSelected.size > 1 ? `<span class="ig-count">1/${igSelected.size}</span>` : '');
  } else {
    media.style.backgroundImage = '';
    media.innerHTML = '<span class="ig-ph-empty">Fotoğraf seç</span>';
  }
  const cap = ($('#igCaption').value || '').split('\n')[0] || '';
  $('#igPhoneCap').textContent = cap;
}

/* ---------- AKSİYONLAR ---------- */
async function doDownload() {
  const p = currentProp();
  if (!p) { toast('Önce daire seç', 'err'); return; }
  const urls = orderedSel();   // kapak ilk sırada
  if (!urls.length) { toast('En az bir fotoğraf seç', 'err'); return; }
  const btn = $('#igDownload'); const orig = btn.innerHTML; btn.disabled = true;
  btn.textContent = 'Hazırlanıyor…';
  try {
    const name = slugify(`${regionDisplay(p.bolge) || ''}-${pickTitle(p) || 'daire'}`) + '-instagram';
    await downloadPropertyPhotos([{ ...p, fotograflar: urls }], name, (d, total) => { btn.textContent = `Hazırlanıyor… ${d}/${total}`; });
    logAct('photo_download', pickTitle(p) || 'daire', `Instagram ${igFormat} · ${urls.length} foto`);
    toast(`${urls.length} fotoğraf indirildi (JPEG)`, 'ok');
  } catch (e) { console.error(e); toast('İndirme hatası', 'err'); }
  btn.disabled = false; btn.innerHTML = orig;
}
async function doReel() {
  const p = currentProp();
  if (!p) { toast('Önce daire seç', 'err'); return; }
  if (!(p.fotograflar || []).length) { toast('Bu dairede fotoğraf yok', 'err'); return; }
  const btn = $('#igReel'); const orig = btn.innerHTML; btn.disabled = true;
  btn.innerHTML = 'Video hazırlanıyor… %0';
  try {
    const contact = creatorContact(p.ekleyen);
    const ext = await downloadReel(p, { contact, fileName: slugify(`${regionDisplay(p.bolge) || ''}-${pickTitle(p) || 'daire'}`) + '-reels' },
      (pr) => { btn.innerHTML = `Video hazırlanıyor… %${Math.round(pr * 100)}`; });
    logAct('media_create', pickTitle(p) || 'daire', 'Instagram Reels videosu');
    toast(ext === 'mp4' ? 'Reels videosu indirildi (MP4)' : 'Video indirildi (WebM — Instagram için Safari önerilir)', 'ok');
  } catch (e) { console.error(e); toast('Video oluşturulamadı: ' + (e.message || e), 'err'); }
  btn.disabled = false; btn.innerHTML = orig;
}
async function copyCaption() {
  const txt = $('#igCaption').value || '';
  if (!txt.trim()) { toast('Caption boş', 'err'); return; }
  try { await navigator.clipboard.writeText(txt); toast('Caption kopyalandı', 'ok'); }
  catch { prompt('Caption\'ı kopyalayın:', txt); }
}

/* ---------- YOL HARİTASI MODALI ---------- */
const ROADMAP_HTML = `
  <p>Instagram <strong>İşletme hesabını</strong> bağlayınca bu sayfadan doğrudan paylaşım yapılır ve analizler dolar. Adımlar:</p>
  <ol class="ig-road">
    <li><strong>IG İşletme hesabı → Facebook Sayfası:</strong> Instagram uygulaması → Ayarlar → Hesap → bir Facebook Sayfasına bağla (yoksa boş bir sayfa aç).</li>
    <li><strong>Meta Business Suite:</strong> business.facebook.com'da işletme portföyünü oluştur.</li>
    <li><strong>Geliştirici uygulaması:</strong> developers.facebook.com → "Uygulama oluştur" → tür <em>Business</em>.</li>
    <li><strong>Ürünler:</strong> uygulamaya <em>Instagram Graph API</em> + <em>Facebook Login</em> ekle.</li>
    <li><strong>İzinler:</strong> instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement, instagram_manage_insights.</li>
    <li><strong>Hızlı yol:</strong> Uygulamayı <em>geliştirme modunda</em> tutup kendi hesabını test kullanıcısı ekle → Meta'nın uzun incelemesine girmeden kendi hesabına paylaşırsın.</li>
    <li><strong>Token:</strong> uzun ömürlü erişim tokeni üret (60 gün, yenilenebilir) → bana güvenli şekilde ilet.</li>
    <li><strong>Bağlantı (bende):</strong> siteye küçük bir sunucu ucu eklerim (token gizli kalır). Fotoğraflar zaten herkese açık URL — paylaşım: media → media_publish. Carousel/Story/Reels desteklenir.</li>
    <li><strong>Analiz:</strong> insights uçlarıyla erişim, gösterim, profil ziyareti, kaydetme, demografi, en iyi saat çekilir.</li>
  </ol>
  <p class="text-muted" style="font-size:.86rem">Adım 1–7'yi sen başlat; her ekranı tarif ederim. Token gelince gerisini ben kurarım.</p>`;
function openModal(sel) { $(sel).classList.add('open'); }
function closeModal(el) { el.classList.remove('open'); }

/* ---------- OLAYLAR ---------- */
$('#igSearch').addEventListener('input', (e) => fillPropOptions(e.target.value));
$('#igProp').addEventListener('change', (e) => onPropChange(e.target.value));
$('#igFormat').addEventListener('click', (e) => { const b = e.target.closest('button[data-fmt]'); if (b) setFormat(b.dataset.fmt); });
$('#igPhotos').addEventListener('click', (e) => { const b = e.target.closest('.ig-ph[data-u]'); if (b) togglePhoto(b.dataset.u); });
$('#igSelectAll').addEventListener('click', () => {
  const p = currentProp(); if (!p) return;
  const photos = p.fotograflar || [];
  if (igSelected.size === photos.length) igSelected = new Set(); else igSelected = new Set(photos);
  renderPhotos(); updatePreview();
});
$('#igAutoCap').addEventListener('click', () => { const p = currentProp(); if (p) { $('#igCaption').value = buildCaption(p); updateCapCount(); updatePreview(); } });
$('#igCaption').addEventListener('input', () => { updateCapCount(); updatePreview(); });
$('#igDownload').addEventListener('click', doDownload);
$('#igReel').addEventListener('click', doReel);
$('#igCopyCap').addEventListener('click', copyCaption);
$('#roadmapBtn').addEventListener('click', () => { $('#roadmapBody').innerHTML = ROADMAP_HTML; openModal('#roadmapModal'); });
document.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(e.target.closest('.modal-overlay')); });
document.addEventListener('click', (e) => { if (e.target.classList?.contains('modal-overlay')) closeModal(e.target); });

setFormat('story');
init();
