// Selected Global — Instagram hazırlık sayfası (Phase 1: elle paylaşım yardımcısı)
import { supabase, CURRENCY, creatorContact, nameFromEmail } from './config.js?v=86';
import {
  esc, pickTitle, regionDisplay, slugify, toast, coverUrl,
  downloadPropertyPhotos, downloadReel, renderCoverImage, renderFooter,
} from './ui.js?v=86';

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

async function logAct(action, entity_ref, detail) {
  try {
    await supabase.from('activity_log').insert({
      actor_email: myEmail || null, actor_name: nameFromEmail(myEmail) || null,
      action, entity_type: 'property', entity_ref: entity_ref ? String(entity_ref).slice(0, 200) : null,
      detail: detail ? String(detail).slice(0, 500) : null,
    });
  } catch (_) { /* sessiz */ }
}

/* ---------- DURUM ---------- */
let props = [];
let curId = '';
let igFormat = 'story';
let igSource = 'daire';       // 'daire' | 'free'
let igPropView = 'gallery';   // daire seçici görünümü: 'gallery' | 'list'
let igSelected = new Set();   // seçili görsel url'leri (sıra korunur)
let freePhotos = [];          // serbest mod: [{url(objectURL), file}]
const coverCache = {};        // property.id -> markalı kapak objectURL

async function loadProps() {
  const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
  if (error) { toast('Daireler yüklenemedi', 'err'); return; }
  props = data || [];
  renderPropGrid();
}
function currentProp() { return props.find((p) => p.id === curId) || null; }

// Geçerli görsel listesi (daire → dairenin fotoğrafları; serbest → yüklenenler)
function photoList() { return igSource === 'free' ? freePhotos.map((f) => f.url) : (currentProp()?.fotograflar || []); }
function coverOf(p) { const ph = p?.fotograflar || []; if (!ph.length) return null; return ph[Math.min(p.kapak_index || 0, ph.length - 1)]; }
// Seçili görseller — daire modunda KAPAK ilk sırada; serbest modda yükleme/seçim sırası
function orderedSel() {
  const arr = [...igSelected];
  if (igSource === 'free') return arr;
  const cov = coverOf(currentProp());
  return (cov && igSelected.has(cov)) ? [cov, ...arr.filter((u) => u !== cov)] : arr;
}

/* ---------- DAİRE SEÇİMİ (görselli galeri/liste) ---------- */
function propThumb(p) { return coverUrl(p) || (p.fotograflar || [])[0] || ''; }
function propPrice(p) { return p.fiyat != null ? `${CURRENCY[p.para_birimi] || ''}${Number(p.fiyat).toLocaleString('tr-TR')}` : 'Fiyat için ara'; }
function renderPropGrid() {
  const box = $('#igPropGrid'); if (!box) return;
  const ql = ($('#igSearch').value || '').toLocaleLowerCase('tr').trim();
  const list = props.filter((p) => {
    if (!ql) return true;
    const hay = `${pickTitle(p) || ''} ${regionDisplay(p.bolge) || ''} ${p.proje || ''} ${p.oda_sayisi || ''}`.toLocaleLowerCase('tr');
    return hay.includes(ql);
  });
  box.className = 'ig-prop-grid ' + igPropView;
  if (!list.length) { box.innerHTML = '<p class="text-muted" style="padding:10px;grid-column:1/-1">Sonuç yok.</p>'; return; }
  box.innerHTML = list.map((p) => {
    const thumb = propThumb(p); const on = p.id === curId; const n = (p.fotograflar || []).length;
    const meta = [regionDisplay(p.bolge), p.proje].filter(Boolean).join(' · ');
    return `<button type="button" class="ig-pcard${on ? ' on' : ''}" data-id="${esc(p.id)}">
      <span class="ig-pcard-img"${thumb ? ` style="background-image:url('${esc(thumb)}')"` : ''}>${thumb ? '' : '📷'}${n ? `<span class="ig-pcard-n">📷 ${n}</span>` : ''}${on ? '<span class="ig-pcard-check">✓</span>' : ''}</span>
      <span class="ig-pcard-body"><span class="t">${esc(pickTitle(p) || 'Başlıksız')}</span><span class="m">${esc(meta || '—')}</span><span class="p">${esc(propPrice(p))}</span></span>
    </button>`;
  }).join('');
}
function onPropChange(id) {
  curId = id;
  const p = currentProp();
  igSelected = new Set((p?.fotograflar || []));
  renderPropGrid();          // seçili kartı vurgula
  renderPhotos();
  $('#igCaption').value = p ? buildCaption(p) : '';
  updateCapCount(); updatePreview();
}

/* ---------- KAYNAK (daire / serbest) ---------- */
function setSource(src) {
  igSource = src;
  $$('#igSource button').forEach((b) => b.classList.toggle('active', b.dataset.src === src));
  $('#igDaireField').classList.toggle('hidden', src !== 'daire');
  $('#igFreeField').classList.toggle('hidden', src !== 'free');
  $('#igAutoCap').style.display = src === 'daire' ? '' : 'none';
  if (src === 'free') {
    igSelected = new Set(freePhotos.map((f) => f.url));   // yüklüyse hepsi seçili
  } else {
    igSelected = new Set(); curId = ''; renderPropGrid();
  }
  $('#igCaption').value = '';
  setFormat(igFormat);   // reels alanının görünürlüğü kaynağa bağlı
  renderPhotos(); updateCapCount(); updatePreview();
}
// Serbest görseli markala: alt gradyen + Selected Global logosu (görsele gömülür)
let _logo = null;
function _loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
async function brandFreeImage(file) {
  if (!_logo) { try { _logo = await _loadImg('assets/img/logo-white.svg'); } catch (_) { _logo = null; } }
  const bmp = await createImageBitmap(file);
  const W = bmp.width, H = bmp.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.drawImage(bmp, 0, 0, W, H);
  const gh = Math.round(H * 0.34);
  const g = ctx.createLinearGradient(0, H - gh, 0, H);
  g.addColorStop(0, 'rgba(10,37,64,0)'); g.addColorStop(1, 'rgba(10,37,64,0.85)');
  ctx.fillStyle = g; ctx.fillRect(0, H - gh, W, gh);
  if (_logo) {
    const ratio = (_logo.width ? _logo.height / _logo.width : 0.24) || 0.24;
    const lw = Math.min(W * 0.46, W - 40); const lh = lw * ratio;
    ctx.drawImage(_logo, (W - lw) / 2, H - lh - Math.round(H * 0.05), lw, lh);
  }
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
  return URL.createObjectURL(blob);
}
async function addFreeFiles(files) {
  const imgs = [...files].filter((f) => f.type && f.type.startsWith('image/'));
  if (!imgs.length) return;
  toast('Görseller hazırlanıyor…');
  for (const f of imgs) {
    const raw = URL.createObjectURL(f);
    let branded = raw;
    try { branded = await brandFreeImage(f); } catch (_) { /* markalanamazsa ham hali */ }
    freePhotos.push({ url: branded, raw, file: f }); igSelected.add(branded);
    renderPhotos(); updatePreview();
  }
  toast(`${imgs.length} görsel eklendi (gradyen + logo)`, 'ok');
}

/* ---------- GÖRSEL IZGARASI ---------- */
function renderPhotos() {
  const grid = $('#igPhotos');
  const photos = photoList();
  if (igSource === 'daire' && !currentProp()) { grid.innerHTML = '<p class="text-muted" style="grid-column:1/-1">Önce daire seç.</p>'; return; }
  if (!photos.length) { grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1">${igSource === 'free' ? 'Yukarıdan görsel yükle.' : 'Bu dairede fotoğraf yok.'}</p>`; return; }
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
async function brandedCover(p) {
  if (!p) return null;
  if (coverCache[p.id]) return coverCache[p.id];
  try { const blob = await renderCoverImage(p); if (blob) { const u = URL.createObjectURL(blob); coverCache[p.id] = u; return u; } } catch (_) {}
  return null;
}
async function updatePreview() {
  const media = $('#igPhoneMedia');
  media.className = 'ig-phone-media ' + (FMT_META[igFormat].aspect === 'tall' ? 'tall' : 'feed');
  let bg = null, overlay = '';
  if (igSource === 'daire') {
    const p = currentProp();
    if (p) {
      if (igFormat === 'reels') { bg = coverOf(p); overlay = '<span class="ig-play">▶</span>'; }
      else { bg = (await brandedCover(p)) || coverOf(p); overlay = igSelected.size > 1 ? `<span class="ig-count">1/${igSelected.size}</span>` : ''; }
    }
  } else {
    bg = orderedSel()[0] || (freePhotos[0] && freePhotos[0].url) || null;
    overlay = igFormat === 'reels' ? '<span class="ig-play">▶</span>' : (igSelected.size > 1 ? `<span class="ig-count">1/${igSelected.size}</span>` : '');
  }
  if (bg) {
    media.style.backgroundImage = `url("${bg}")`;
    media.style.backgroundSize = igSource === 'free' ? 'contain' : 'cover';  // serbest: logolu görsel tam görünsün
    media.style.backgroundColor = '#0A2540';
    media.innerHTML = overlay;
  } else { media.style.backgroundImage = ''; media.innerHTML = '<span class="ig-ph-empty">Görsel seç</span>'; }
  $('#igPhoneCap').textContent = ($('#igCaption').value || '').split('\n')[0] || '';
}

/* ---------- AKSİYONLAR ---------- */
async function doDownload() {
  const urls = orderedSel();
  if (!urls.length) { toast('En az bir görsel seç', 'err'); return; }
  const btn = $('#igDownload'); const orig = btn.innerHTML; btn.disabled = true; btn.textContent = 'Hazırlanıyor…';
  try {
    if (igSource === 'daire') {
      const p = currentProp(); if (!p) { toast('Önce daire seç', 'err'); btn.disabled = false; btn.innerHTML = orig; return; }
      const name = slugify(`${regionDisplay(p.bolge) || ''}-${pickTitle(p) || 'daire'}`) + '-instagram';
      await downloadPropertyPhotos([{ ...p, fotograflar: urls }], name, (d, t) => { btn.textContent = `Hazırlanıyor… ${d}/${t}`; });
      logAct('photo_download', pickTitle(p) || 'daire', `Instagram ${igFormat} · ${urls.length} görsel`);
    } else {
      const name = 'selected-global-gonderi-' + new Date().toISOString().slice(0, 10);
      await downloadPropertyPhotos([{ fotograflar: urls, baslik: 'gonderi', bolge: '' }], name, (d, t) => { btn.textContent = `Hazırlanıyor… ${d}/${t}`; }, null, { noCover: true });
      logAct('photo_download', 'Serbest gönderi', `Instagram ${igFormat} · ${urls.length} görsel`);
    }
    toast(`${urls.length} görsel indirildi (JPEG)`, 'ok');
  } catch (e) { console.error(e); toast('İndirme hatası', 'err'); }
  btn.disabled = false; btn.innerHTML = orig;
}
async function doReel() {
  const btn = $('#igReel'); const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = 'Reels hazırlanıyor… %0';
  const prog = (pr) => { btn.innerHTML = `Reels hazırlanıyor… %${Math.round(pr * 100)}`; };
  try {
    let ext;
    if (igSource === 'daire') {
      const p = currentProp();
      if (!p || !(p.fotograflar || []).length) { toast('Fotoğraflı bir daire seç', 'err'); btn.disabled = false; btn.innerHTML = orig; return; }
      const contact = creatorContact(p.ekleyen);
      ext = await downloadReel(p, { contact, fileName: slugify(`${regionDisplay(p.bolge) || ''}-${pickTitle(p) || 'daire'}`) + '-reels' }, prog);
      logAct('media_create', pickTitle(p) || 'daire', 'Instagram Reels');
    } else {
      const urls = orderedSel();
      if (!urls.length) { toast('Önce görsel yükle', 'err'); btn.disabled = false; btn.innerHTML = orig; return; }
      const contact = creatorContact(nameFromEmail(myEmail));
      const title = ($('#igCaption').value || '').split('\n').find((l) => l.trim()) || '';
      // Reels kendi logosunu ekler → ham (markasız) görseli kullan, çift logo olmasın
      const rawUrls = urls.map((u) => (freePhotos.find((f) => f.url === u)?.raw) || u);
      const row = { fotograflar: rawUrls, kapak_index: 0, tip: null, fiyat: null, para_birimi: 'GBP', proje: null, bolge: null, ozellikler: [], aciklama: null };
      ext = await downloadReel(row, { plain: true, title, contact, fileName: 'selected-global-reels' }, prog);
      logAct('media_create', 'Serbest gönderi', 'Instagram Reels (serbest)');
    }
    toast(ext === 'mp4' ? 'Reels videosu indirildi (MP4)' : 'Reels indirildi (WebM — Instagram için Safari önerilir)', 'ok');
  } catch (e) { console.error(e); toast('Video oluşturulamadı: ' + (e.message || e), 'err'); }
  btn.disabled = false; btn.innerHTML = orig;
}
async function copyCaption() {
  const txt = $('#igCaption').value || '';
  if (!txt.trim()) { toast('Caption boş', 'err'); return; }
  try { await navigator.clipboard.writeText(txt); toast('Caption kopyalandı', 'ok'); }
  catch { prompt('Caption\'ı kopyalayın:', txt); }
}

/* ---------- FORMAT ---------- */
const FMT_META = {
  story:    { label: 'Story · 9:16',        aspect: 'tall', hint: 'her görsel ayrı story karesi olur' },
  carousel: { label: 'Carousel · 4:5',      aspect: 'feed', hint: '2–10 görsel, seçtiğin sırayla' },
  post:     { label: 'Tek Gönderi · 4:5',   aspect: 'feed', hint: '1 görsel (ilk seçili kapak olur)' },
  reels:    { label: 'Reels · 9:16 video',  aspect: 'tall', hint: 'görsellerden otomatik video' },
};
function setFormat(fmt) {
  igFormat = fmt;
  $$('#igFormat button').forEach((b) => b.classList.toggle('active', b.dataset.fmt === fmt));
  const isReels = fmt === 'reels';
  const daireReels = isReels && igSource === 'daire';
  $('#igPhotosField').classList.toggle('hidden', daireReels);  // daire reels'te tüm fotoğraflar kullanılır → ızgara gizli
  $('#igReelsField').classList.toggle('hidden', !daireReels);  // "otomatik video" notu sadece daire reels'te
  $('#igReel').classList.toggle('hidden', !isReels);
  $('#igDownload').classList.toggle('hidden', isReels);
  $('#igPhotoHint').textContent = isReels ? '' : `— ${FMT_META[fmt].hint}`;
  $('#igFmtLabel').textContent = FMT_META[fmt].label;
  updatePreview();
}

/* ---------- YOL HARİTASI ---------- */
const ROADMAP_HTML = `
  <p>Instagram <strong>İşletme hesabını</strong> bağlayınca bu sayfadan doğrudan paylaşım yapılır ve analizler dolar. Adımlar:</p>
  <ol class="ig-road">
    <li><strong>IG İşletme hesabı → Facebook Sayfası:</strong> Instagram → Ayarlar → Hesap → bir Facebook Sayfasına bağla.</li>
    <li><strong>Meta Business Suite:</strong> business.facebook.com'da işletme portföyünü oluştur.</li>
    <li><strong>Geliştirici uygulaması:</strong> developers.facebook.com → "Uygulama oluştur" → tür Business.</li>
    <li><strong>Ürünler:</strong> Instagram Graph API + Facebook Login ekle.</li>
    <li><strong>İzinler:</strong> instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement, instagram_manage_insights.</li>
    <li><strong>Hızlı yol:</strong> uygulamayı geliştirme modunda tut + kendi hesabını test kullanıcısı ekle → uzun onay gerekmez.</li>
    <li><strong>Token:</strong> uzun ömürlü erişim tokeni üret → bana güvenli şekilde ilet.</li>
    <li><strong>Bağlantı (bende):</strong> siteye küçük bir sunucu ucu eklerim; media → media_publish (carousel/story/reels destekli).</li>
    <li><strong>Analiz:</strong> insights uçlarıyla erişim, gösterim, profil ziyareti, demografi, en iyi saat.</li>
  </ol>
  <p class="text-muted" style="font-size:.86rem">Adım 1–7'yi sen başlat; her ekranı tarif ederim. Token gelince gerisini ben kurarım.</p>`;
function openModal(sel) { $(sel).classList.add('open'); }
function closeModal(el) { el.classList.remove('open'); }

/* ---------- OLAYLAR ---------- */
$('#igSource').addEventListener('click', (e) => { const b = e.target.closest('button[data-src]'); if (b) setSource(b.dataset.src); });
$('#igSearch').addEventListener('input', renderPropGrid);
$('#igPropGrid').addEventListener('click', (e) => { const b = e.target.closest('.ig-pcard[data-id]'); if (b) onPropChange(b.dataset.id); });
$('#igPropView').addEventListener('click', (e) => { const b = e.target.closest('button[data-pview]'); if (b) { igPropView = b.dataset.pview; $$('#igPropView button').forEach((x) => x.classList.toggle('active', x === b)); renderPropGrid(); } });
$('#igUpload').addEventListener('click', () => $('#igFreeInput').click());
$('#igFreeInput').addEventListener('change', (e) => { addFreeFiles([...e.target.files]); e.target.value = ''; });
$('#igUpload').addEventListener('dragover', (e) => { e.preventDefault(); $('#igUpload').classList.add('drag'); });
$('#igUpload').addEventListener('dragleave', () => $('#igUpload').classList.remove('drag'));
$('#igUpload').addEventListener('drop', (e) => { e.preventDefault(); $('#igUpload').classList.remove('drag'); addFreeFiles([...(e.dataTransfer?.files || [])]); });
$('#igFormat').addEventListener('click', (e) => { const b = e.target.closest('button[data-fmt]'); if (b) setFormat(b.dataset.fmt); });
$('#igPhotos').addEventListener('click', (e) => { const b = e.target.closest('.ig-ph[data-u]'); if (b) togglePhoto(b.dataset.u); });
$('#igSelectAll').addEventListener('click', () => {
  const photos = photoList(); if (!photos.length) return;
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
document.addEventListener('click', (e) => { if (e.target.classList && e.target.classList.contains('modal-overlay')) closeModal(e.target); });

setFormat('story');
init();
