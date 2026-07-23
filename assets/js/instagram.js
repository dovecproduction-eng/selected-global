// Selected Global — Instagram hazırlık sayfası (Phase 1: elle paylaşım yardımcısı)
import { supabase, CURRENCY, creatorContact, nameFromEmail, STORAGE_BUCKET } from './config.js?v=89';
import {
  esc, pickTitle, regionDisplay, slugify, toast, coverUrl,
  downloadPropertyPhotos, downloadReel, makeReel, renderCoverImage, renderFooter,
} from './ui.js?v=89';

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
  checkConnection();
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
let igFormat = 'carousel';
function formatCap() { return igFormat === 'post' ? 1 : igFormat === 'carousel' ? 10 : 20; }
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
  igSelected = new Set();     // başlangıçta hiçbir foto seçili değil (hata olmasın)
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
  igSelected = new Set();     // başlangıçta hiçbir görsel seçili değil
  if (src !== 'free') { curId = ''; renderPropGrid(); }
  $('#igCaption').value = '';
  setFormat(igFormat);   // reels alanının görünürlüğü kaynağa bağlı
  renderPhotos(); updateCapCount(); updatePreview();
}
// Serbest görseli SEÇİLEN ORANA sığdır (contain: tüm görsel görünür, oran bozulmaz) + alt gradyen + logo
let _logo = null;
const fitCache = {};   // "rawUrl|aspect" -> markalı objectURL (formata göre)
function _loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
async function brandFitted(rawUrl, aspect) {
  const key = rawUrl + '|' + aspect;
  if (fitCache[key]) return fitCache[key];
  if (!_logo) { try { _logo = await _loadImg('assets/img/logo-white.svg'); } catch (_) { _logo = null; } }
  const [W, H] = aspect === 'tall' ? [1080, 1920] : [1080, 1350];   // Story/Reels 9:16, Gönderi/Carousel 4:5
  const img = await _loadImg(rawUrl);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0A2540'; ctx.fillRect(0, 0, W, H);       // lacivert zemin (sığdırma boşlukları)
  const s = Math.min(W / img.width, H / img.height);          // contain
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  const gh = Math.round(H * 0.28);
  const g = ctx.createLinearGradient(0, H - gh, 0, H);
  g.addColorStop(0, 'rgba(10,37,64,0)'); g.addColorStop(1, 'rgba(10,37,64,0.92)');
  ctx.fillStyle = g; ctx.fillRect(0, H - gh, W, gh);
  if (_logo) {
    const ratio = (_logo.width ? _logo.height / _logo.width : 0.24) || 0.24;
    const lw = Math.min(W * 0.46, 520); const lh = lw * ratio;
    ctx.drawImage(_logo, (W - lw) / 2, H - lh - Math.round(H * 0.05), lw, lh);
  }
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
  const url = URL.createObjectURL(blob); fitCache[key] = url; return url;
}
async function addFreeFiles(files) {
  const imgs = [...files].filter((f) => f.type && f.type.startsWith('image/'));
  if (!imgs.length) return;
  for (const f of imgs) {
    const raw = URL.createObjectURL(f);
    freePhotos.push({ url: raw, file: f });   // ham url'yi tut; seçimi kullanıcı yapar (otomatik seçilmez)
  }
  renderPhotos(); updatePreview();
  toast(`${imgs.length} görsel eklendi — aşağıdan seç`, 'ok');
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
  if (igSelected.has(u)) igSelected.delete(u);
  else if (igFormat === 'post') igSelected = new Set([u]);   // Tek Gönderi = yalnız 1 foto
  else {
    if (igSelected.size >= formatCap()) { toast(`Bu formatta en fazla ${formatCap()} görsel`, 'err'); return; }
    igSelected.add(u);
  }
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
    const raw = orderedSel()[0] || (freePhotos[0] && freePhotos[0].url) || null;
    if (raw) {
      if (igFormat === 'reels') { bg = raw; overlay = '<span class="ig-play">▶</span>'; }   // reels ham görsel (video kendi logosunu ekler)
      else { bg = await brandFitted(raw, FMT_META[igFormat].aspect); overlay = igSelected.size > 1 ? `<span class="ig-count">1/${igSelected.size}</span>` : ''; }
    }
  }
  if (bg) {
    media.style.backgroundImage = `url("${bg}")`;
    media.style.backgroundSize = 'cover';   // sığdırılmış görsel zaten tam oranında → çerçeveyi doldurur
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
      // Her görseli seçilen orana sığdır + gradyen/logo bas, sonra indir
      const aspect = FMT_META[igFormat].aspect;
      const fitted = [];
      for (const u of urls) fitted.push(await brandFitted(u, aspect));
      const name = 'selected-global-gonderi-' + new Date().toISOString().slice(0, 10);
      await downloadPropertyPhotos([{ fotograflar: fitted, baslik: 'gonderi', bolge: '' }], name, (d, t) => { btn.textContent = `Hazırlanıyor… ${d}/${t}`; }, null, { noCover: true });
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
      // urls zaten ham görseller; reels kendi logo/gradyenini ekler (çift logo olmaz)
      const row = { fotograflar: urls, kapak_index: 0, tip: null, fiyat: null, para_birimi: 'GBP', proje: null, bolge: null, ozellikler: [], aciklama: null };
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
  const cap = formatCap();
  if (igSelected.size > cap) igSelected = new Set([...igSelected].slice(0, cap));   // yeni format sınırına indir
  const isReels = fmt === 'reels';
  const daireReels = isReels && igSource === 'daire';
  $('#igPhotosField').classList.toggle('hidden', daireReels);  // daire reels'te tüm fotoğraflar kullanılır → ızgara gizli
  $('#igReelsField').classList.toggle('hidden', !daireReels);  // "otomatik video" notu sadece daire reels'te
  $('#igReel').classList.toggle('hidden', !isReels);
  $('#igDownload').classList.toggle('hidden', isReels);
  $('#igPhotoHint').textContent = isReels ? '' : `— ${FMT_META[fmt].hint}`;
  $('#igFmtLabel').textContent = FMT_META[fmt].label;
  renderPhotos(); updatePreview();
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

/* ---------- BACKEND (Composio) — bağlantı, yayınlama, analiz ---------- */
const IG_API = '/api/ig';
let igConnected = false, igUsername = '';

async function checkConnection() {
  try {
    const r = await fetch(`${IG_API}?action=userinfo`);
    const j = await r.json().catch(() => ({}));
    if (r.ok && j && j.data && j.data.username) {
      igConnected = true; igUsername = j.data.username;
      $('#igStatus').textContent = `● Bağlı: @${igUsername}`;
      $('#igStatus').className = 'ig-badge on';
      $('#igPublish').classList.remove('hidden');
      const cx = document.querySelector('.ig-connect-txt strong');
      if (cx) cx.textContent = `Instagram bağlı: @${igUsername} — buradan doğrudan paylaşabilirsin.`;
    } else {
      igConnected = false;
      $('#igStatus').textContent = '● Bağlı değil';
      $('#igStatus').className = 'ig-badge off';
    }
  } catch (_) { igConnected = false; }
  loadInsights();
}

// Supabase public bucket'a yükle → herkese açık URL (Instagram medyayı URL'den çeker)
async function uploadPublic(blob, ext) {
  const path = `_ig/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { contentType: blob.type || (ext === 'mp4' ? 'video/mp4' : 'image/jpeg') });
  if (error) throw new Error('Yükleme hatası: ' + error.message);
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
async function urlToJpegBlob(url) {
  const bmp = await createImageBitmap(await (await fetch(url)).blob());
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0);
  return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
}

// Yayınlanacak görselleri hazırla → herkese açık URL dizisi
async function prepareImages(setMsg) {
  const urls = [];
  if (igSource === 'daire') {
    const p = currentProp();
    setMsg('Kapak hazırlanıyor…');
    const cover = await renderCoverImage(p);                 // markalı kapak = 1. slayt
    if (cover) urls.push(await uploadPublic(cover, 'jpg'));
    if (igFormat === 'carousel') {
      const sel = orderedSel();
      for (let i = 0; i < sel.length && urls.length < 10; i++) {
        setMsg(`Görsel ${urls.length} yükleniyor…`);
        urls.push(await uploadPublic(await urlToJpegBlob(sel[i]), 'jpg'));
      }
    }
  } else {
    const sel = orderedSel(); const aspect = FMT_META[igFormat].aspect;
    const max = igFormat === 'carousel' ? 10 : 1;
    for (let i = 0; i < sel.length && urls.length < max; i++) {
      setMsg(`Görsel ${i + 1} hazırlanıyor…`);
      const fitted = await brandFitted(sel[i], aspect);
      urls.push(await uploadPublic(await (await fetch(fitted)).blob(), 'jpg'));
    }
  }
  return urls;
}

async function publishNow() {
  if (!igConnected) { toast('Instagram bağlı değil', 'err'); return; }
  const msgEl = $('#igPublishMsg'); const setMsg = (t) => { msgEl.textContent = t; };
  if (igSource === 'daire' && !currentProp()) { toast('Önce daire seç', 'err'); return; }
  if (igSource === 'free' && !igSelected.size) { toast('Önce görsel yükle', 'err'); return; }
  if (!confirm(`Bu gönderi @${igUsername} hesabında YAYINLANACAK. Onaylıyor musun?`)) return;
  const btn = $('#igPublish'); const orig = btn.innerHTML; btn.disabled = true; btn.textContent = 'Yayınlanıyor…';
  const caption = $('#igCaption').value || '';
  try {
    let body;
    if (igFormat === 'reels') {
      const p = igSource === 'daire' ? currentProp()
        : { fotograflar: orderedSel(), kapak_index: 0, tip: null, fiyat: null, para_birimi: 'GBP', proje: null, bolge: null, ozellikler: [], aciklama: null };
      const opts = igSource === 'daire' ? { contact: creatorContact(p.ekleyen) }
        : { plain: true, title: caption.split('\n')[0] || '', contact: creatorContact(nameFromEmail(myEmail)) };
      const { blob, ext } = await makeReel(p, opts, (pr) => setMsg(`Video üretiliyor… %${Math.round(pr * 100)}`));
      if (ext !== 'mp4') { setMsg('⚠ Reels doğrudan paylaşım için MP4 gerekir — lütfen Safari kullan (Chrome WebM üretir). Videoyu indirip elle de paylaşabilirsin.'); btn.disabled = false; btn.innerHTML = orig; return; }
      setMsg('Video yükleniyor…');
      body = { format: 'reels', videoUrl: await uploadPublic(blob, 'mp4'), caption };
    } else {
      const images = await prepareImages(setMsg);
      if (!images.length) { toast('Görsel yok', 'err'); btn.disabled = false; btn.innerHTML = orig; return; }
      body = { format: igFormat, images, caption };
    }
    setMsg('Instagram\'a gönderiliyor…');
    const r = await fetch(`${IG_API}?action=publish`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) {
      setMsg('✓ Yayınlandı! Instagram profilinde görebilirsin.');
      toast('Instagram\'da yayınlandı 🎉', 'ok');
      logAct('media_create', igSource === 'daire' ? (pickTitle(currentProp()) || 'daire') : 'Serbest gönderi', `Instagram'da yayınlandı (${igFormat})`);
      setTimeout(loadInsights, 5000);
    } else { setMsg('✕ ' + (j.error || 'Yayınlanamadı')); toast('Yayınlanamadı', 'err'); }
  } catch (e) { console.error(e); setMsg('✕ ' + (e.message || e)); toast('Hata: ' + (e.message || e), 'err'); }
  btn.disabled = false; btn.innerHTML = orig;
}

/* ---------- ANALİZ ---------- */
let lastInsights = null;
async function loadInsights() {
  const box = $('#igInsights'); if (!box) return;
  box.innerHTML = '<p class="text-muted" style="padding:10px">Yükleniyor…</p>';
  try {
    const r = await fetch(`${IG_API}?action=insights`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { box.innerHTML = `<p class="text-muted" style="padding:10px">Analiz alınamadı: ${esc(j.error || '')}<br><small>Backend anahtarı (COMPOSIO_API_KEY) Vercel'de tanımlı mı?</small></p>`; return; }
    lastInsights = j; renderInsights(j);
  } catch (e) { box.innerHTML = '<p class="text-muted" style="padding:10px">Analiz alınamadı (backend hazır değil olabilir).</p>'; }
}
function renderInsights(j) {
  const ins = j.insights || {}, info = j.userinfo || {};
  const vals = (m) => { const a = ins[m]; if (!Array.isArray(a) || !a[0]) return []; const it = a[0]; if (it.total_value && it.total_value.value != null) return [{ value: it.total_value.value }]; return it.values || []; };
  const sum = (m) => vals(m).reduce((s, v) => s + (Number(v.value) || 0), 0);
  const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');
  const tile = (val, label) => `<div class="ig-itile"><div class="iv">${esc(fmt(val))}</div><div class="il">${esc(label)}</div></div>`;
  const tiles = [
    tile(info.followers_count, 'Takipçi'), tile(info.media_count, 'Gönderi'),
    tile(sum('reach'), 'Erişim (30g)'), tile(sum('views') || sum('impressions'), 'Görüntülenme'),
    tile(sum('profile_views'), 'Profil ziyareti'), tile(sum('accounts_engaged'), 'Etkileşen hesap'),
    tile(sum('total_interactions'), 'Toplam etkileşim'), tile(sum('website_clicks'), 'Web tıklaması'),
  ].join('');

  // En iyi saatler (online_followers) — saat→takipçi
  let hoursHtml = '';
  const ofv = vals('online_followers');
  const hourMap = (ofv[0] && typeof ofv[0].value === 'object') ? ofv[0].value : null;
  if (hourMap) {
    const arr = Array.from({ length: 24 }, (_, h) => Number(hourMap[h] || hourMap[String(h)] || 0));
    const mx = Math.max(1, ...arr);
    hoursHtml = `<div class="ig-card"><h4>En aktif saatler (takipçiler online)</h4><div class="ig-hours">${arr.map((n, h) => `<span class="ig-hbar" title="${h}:00 — ${n}"><span style="height:${Math.round(n / mx * 100)}%"></span><em>${h}</em></span>`).join('')}</div></div>`;
  }

  // Son gönderiler
  const media = (j.media && (j.media.data || j.media)) || [];
  let mediaHtml = '';
  if (Array.isArray(media) && media.length) {
    mediaHtml = `<div class="ig-card"><h4>Son gönderiler</h4><div class="ig-media">${media.slice(0, 12).map((m) => {
      const thumb = m.thumbnail_url || m.media_url || '';
      return `<a class="ig-mtile" href="${esc(m.permalink || '#')}" target="_blank" rel="noopener">${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy" />` : '<span class="ig-mph">📷</span>'}<span class="ig-mstat">❤ ${fmt(m.like_count)} · 💬 ${fmt(m.comments_count)}</span></a>`;
    }).join('')}</div></div>`;
  }

  // ---- Detaylı yorum / öne çıkanlar (otomatik) ----
  const L = [];
  L.push(`Hesapta <b>${fmt(info.followers_count)}</b> takipçi ve <b>${fmt(info.media_count)}</b> gönderi var.`);
  const reach = sum('reach'), views = sum('views') || sum('impressions'), pv = sum('profile_views');
  if (reach || views) L.push(`Son 30 günde toplam erişim <b>${fmt(reach)}</b>, görüntülenme <b>${fmt(views)}</b>${pv ? `, profil ziyareti <b>${fmt(pv)}</b>` : ''}.`);
  const inter = sum('total_interactions'), eng = sum('accounts_engaged');
  if (inter || eng) L.push(`<b>${fmt(eng)}</b> hesapla etkileşildi, toplam <b>${fmt(inter)}</b> etkileşim (beğeni/yorum/kaydetme/paylaşma) alındı.`);
  const fc = vals('follower_count');
  if (fc.length >= 2) { const d = Number(fc[fc.length - 1].value) - Number(fc[0].value); L.push(`Bu dönemde takipçi değişimi: <b>${d >= 0 ? '+' : ''}${fmt(d)}</b>.`); }
  if (hourMap) {
    const arr = Array.from({ length: 24 }, (_, h) => Number(hourMap[h] || hourMap[String(h)] || 0));
    const best = arr.indexOf(Math.max(...arr));
    if (Math.max(...arr) > 0) L.push(`Takipçilerin en çok <b>${best}:00–${(best + 2) % 24}:00</b> arası online — paylaşım için en iyi zaman bu.`);
  }
  if (Array.isArray(media) && media.length) {
    const top = [...media].sort((a, b) => ((Number(b.like_count) || 0) + (Number(b.comments_count) || 0)) - ((Number(a.like_count) || 0) + (Number(a.comments_count) || 0)))[0];
    if (top && (top.like_count || top.comments_count)) L.push(`En çok etkileşim alan gönderin: <a href="${esc(top.permalink || '#')}" target="_blank" rel="noopener">bu gönderi</a> — ❤ ${fmt(top.like_count)} · 💬 ${fmt(top.comments_count)}.`);
    const er = info.followers_count ? ((media.reduce((s, m) => s + (Number(m.like_count) || 0) + (Number(m.comments_count) || 0), 0) / media.length) / info.followers_count * 100) : 0;
    if (er) L.push(`Ortalama etkileşim oranı ~<b>%${er.toFixed(1)}</b> (gönderi başına etkileşim / takipçi).`);
  }
  const empty = !info.media_count && !reach;
  if (empty) L.push('Hesap yeni; paylaşım yaptıkça ve takipçi geldikçe buraya otomatik yorumlar ve trendler gelecek. (Bazı metrikler ~100 takipçiden sonra Instagram tarafından açılır.)');
  const analysisHtml = `<div class="ig-card ig-analysis"><h4>📈 Detaylı analiz & yorum</h4><ul>${L.map((t) => `<li>${t}</li>`).join('')}</ul>
    <div class="ig-analysis-foot"><span class="text-muted">Son güncelleme: ${esc((j.fetched_at || '').replace('T', ' ').slice(0, 16))}</span> · <a href="javascript:void(0)" data-copyraw class="link-quiet">ham veriyi kopyala (AI için)</a></div></div>`;

  $('#igInsights').innerHTML = `<div class="ig-insight-tiles">${tiles}</div>` + hoursHtml + mediaHtml + analysisHtml;
}

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
  if (igSelected.size) igSelected = new Set();
  else igSelected = new Set(photos.slice(0, formatCap()));   // format sınırı kadar seç
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

$('#igPublish').addEventListener('click', publishNow);
$('#igInsRefresh').addEventListener('click', loadInsights);
$('#igInsights').addEventListener('click', async (e) => {
  if (!e.target.closest('[data-copyraw]')) return;
  if (!lastInsights) return;
  const txt = JSON.stringify(lastInsights, null, 2);
  try { await navigator.clipboard.writeText(txt); toast('Ham veri kopyalandı', 'ok'); } catch { prompt('Ham veri:', txt); }
});

setFormat('carousel');
init();
