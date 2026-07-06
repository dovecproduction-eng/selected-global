// Selected Global — ortak yardımcılar (ikonlar, formatlama, header, toast, dil)
import { CURRENCY, BRAND, ALL_LISTINGS_URL, REGION_GROUPS } from './config.js?v=48';
import { getLang, setLang, t, applyI18n } from './i18n.js?v=48';

// ---------- Bölge yardımcıları (ilçe + alt bölge) ----------
const AREA_TO_DISTRICT = {};
for (const [d, list] of Object.entries(REGION_GROUPS)) for (const a of list) AREA_TO_DISTRICT[a.trim().toLocaleLowerCase('tr')] = d;

export function regionDistrict(bolge) {
  if (!bolge) return null;
  return AREA_TO_DISTRICT[bolge.trim().toLocaleLowerCase('tr')] || null;
}
// "Long Beach" -> "İskele, Long Beach"; "İskele" -> "İskele"; "İskele Merkez" -> "İskele Merkez"
export function regionDisplay(bolge) {
  if (!bolge) return '';
  const b = bolge.trim();
  const d = regionDistrict(b);
  if (!d) return b;
  const bl = b.toLocaleLowerCase('tr'), dl = d.toLocaleLowerCase('tr');
  if (bl === dl || bl.startsWith(dl)) return b;
  return `${d}, ${b}`;
}

// ---------- İkonlar (inline SVG) ----------
export const ICON = {
  bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 17v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4"/><path d="M2 17v3M22 17v3"/><path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M8 9h3M13 9h3"/></svg>',
  area: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5"/></svg>',
  bath: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2"/><path d="M2 12h20v3a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><path d="M6 19l-1 2M19 19l1 2"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  stairs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4v-4h4v-4h4V8h4"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  spinner: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 2a10 10 0 0 1 10 10" opacity=".9"/><path d="M22 12a10 10 0 0 1-10 10" opacity=".25"/></svg>',
};

// ---------- Formatlama ----------
export function fmtPrice(p, cur, tip) {
  // Fiyat girilmemişse "Belirtilmemiş" yerine, tıklayınca iletişim bölümüne kaydıran metin
  if (p == null || p === '') {
    const txt = getLang() === 'tr' ? 'Fiyat için arayınız' : 'Call for price';
    return `<span class="call-price" role="button" tabindex="0" title="${txt}">${txt}</span>`;
  }
  const sym = CURRENCY[cur] || '';
  const n = Number(p).toLocaleString(getLang() === 'tr' ? 'tr-TR' : 'en-GB');
  const suffix = tip === 'kiralik' ? `<small> ${t('per_month')}</small>` : '';
  return `${sym}${n}${suffix}`;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// Dile göre başlık / açıklama (boşsa diğer dile düşer)
export function pickTitle(row) {
  const lang = getLang();
  if (lang === 'en') return row.title_en || row.baslik || '';
  return row.baslik || row.title_en || '';
}
export function pickDesc(row) {
  const lang = getLang();
  if (lang === 'en') return row.desc_en || row.aciklama || '';
  return row.aciklama || row.desc_en || '';
}
// Otomatik gelen "proje ortak alan" fotoğrafı mı? (_ortak/ yolunda saklanır)
export function isCommonPhoto(url) { return !!url && url.includes('/_ortak/'); }

// Kapak = SADECE dairenin kendi (yüklediği) fotoğrafı. Sadece otomatik ortak foto varsa kapak yok.
export function coverUrl(row) {
  const arr = row.fotograflar || [];
  if (!arr.length) return null;
  const own = arr.filter((u) => !isCommonPhoto(u));
  if (!own.length) return null; // kendi fotoğrafı yok → "Görsel eklenmedi"
  const i = Math.min(row.kapak_index || 0, arr.length - 1);
  const chosen = arr[i];
  return isCommonPhoto(chosen) ? own[0] : chosen;
}
export function slugify(s) {
  return String(s || 'daire')
    .toLowerCase()
    .replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'daire';
}

// ---------- Yazı-logo (logo görseli yoksa otomatik yazıya düşer) ----------
export function logoMark(onDark = false) {
  const src = onDark ? BRAND.logoLight : BRAND.logoDark;
  return `<span class="logo-mark">
    <img class="logo-img" src="${src}" alt="Selected Global"
         onerror="this.style.display='none';this.nextElementSibling.style.display='inline-block';" />
    <span class="logo-word" style="display:none;color:${onDark ? '#fff' : 'var(--navy)'}">SELECTED<i>·</i>GLOBAL</span>
  </span>`;
}

// ---------- Markalı kapak: foto + gradyenli alt geçiş (logo ortada, bilgiler iki yanda) ----------
export function brandedCover(row) {
  const cover = coverUrl(row);
  const isSale = row.tip === 'satilik';
  // Sağ bilgi: daire tipi · eşya durumu
  const right = [];
  if (row.oda_sayisi) right.push(esc(row.oda_sayisi));
  if (row.esyali != null) right.push(`<span class="furn">${row.esyali ? t('sp_furnished') : t('sp_unfurnished')}</span>`);
  const rightHtml = right.join('<span class="sep">·</span>');
  // Sol bilgi: konum (ilçe + alt bölge)
  const leftHtml = row.bolge ? `<span class="loc">${ICON.pin}${esc(regionDisplay(row.bolge))}</span>` : '';
  return `
  <figure class="cover-figure" style="margin:0">
    <div class="cover-photo">
      <span class="type-tag ${isSale ? 'sale' : ''}">${isSale ? t('badge_sale') : t('badge_rent')}</span>
      ${row.proje ? `<span class="proje-tag">${esc(row.proje)}</span>` : ''}
      ${cover ? `<img src="${esc(cover)}" alt="${esc(pickTitle(row))}" loading="lazy" />` : `<span class="ph ph-empty">${ICON.camera}<span>${getLang() === 'tr' ? 'Görsel eklenmedi' : 'No image added'}</span></span>`}
      <div class="cover-overlay">
        <div class="ov-logo">${logoMark(true)}</div>
        ${(leftHtml || rightHtml) ? `<div class="ov-info${(leftHtml && rightHtml) ? '' : ' single'}">${leftHtml}${rightHtml ? `<span class="info">${rightHtml}</span>` : ''}</div>` : ''}
      </div>
    </div>
  </figure>`;
}

// ---------- Header (müşteri tarafı) ----------
// Marka, Selected Global ana sitesine gider (yeni sekme). Yönetim linki yok.
export function renderHeader() {
  const lang = getLang();
  return `
  <header class="site-header">
    <div class="container header-inner">
      <a href="${ALL_LISTINGS_URL}" target="_blank" rel="noopener" class="brand" aria-label="Selected Global">
        ${logoMark(false)}
      </a>
      <div class="header-actions">
        <div class="lang-switch" id="langSwitch">
          <button data-lang="tr" class="${lang==='tr'?'active':''}">TR</button>
          <button data-lang="en" class="${lang==='en'?'active':''}">EN</button>
        </div>
      </div>
    </div>
  </header>`;
}

export function renderFooter() {
  return `
  <footer class="site-footer">
    <div class="container footer-inner">
      <div>
        <a href="${ALL_LISTINGS_URL}" target="_blank" rel="noopener" class="brand">${logoMark(false)}</a>
        <p class="text-muted" style="margin:8px 0 0;font-size:.85rem" data-i18n="footer_tagline">Kuzey Kıbrıs’ta güvenilir gayrimenkul.</p>
      </div>
      <div class="footer-contact">
        <a href="tel:${BRAND.phoneRaw}">${BRAND.phone}</a>
        <a href="mailto:${BRAND.email}">${BRAND.email}</a>
      </div>
    </div>
  </footer>`;
}

// "Fiyat için arayınız"a tıklayınca iletişim bölümüne kaydır (getTarget: o bölümü döndüren fn)
export function wireCallPrice(getTarget) {
  const go = (el) => {
    const target = getTarget && getTarget(el);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('contact-flash');
    setTimeout(() => target.classList.remove('contact-flash'), 1600);
  };
  document.addEventListener('click', (e) => {
    const el = e.target.closest('.call-price'); if (!el) return;
    e.preventDefault(); go(el);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('call-price')) { e.preventDefault(); go(e.target); }
  });
}

// Dil değiştiriciyi bağlar; değişince callback çağırır
export function wireLangSwitch(onChange) {
  const sw = document.getElementById('langSwitch');
  if (!sw) return;
  sw.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-lang]');
    if (!btn) return;
    setLang(btn.dataset.lang);
    sw.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
    applyI18n(document);
    if (onChange) onChange();
  });
}

// ---------- Toast ----------
export function toast(msg, type = '') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = (type === 'ok' ? ICON.check : type === 'err' ? ICON.x : '') + `<span>${esc(msg)}</span>`;
  el.querySelector('svg')?.style.setProperty('width', '18px');
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = '.3s'; setTimeout(() => el.remove(), 320); }, 2600);
}

// ---------- Tam ekran galeri (lightbox) ----------
// photos: url dizisi, startIndex: açılışta gösterilecek foto. Ok tuşları, ←/→ butonları,
// dokunmatik kaydırma, ESC ve dışına tıkla ile kapanma destekler.
export function openLightbox(photos, startIndex = 0) {
  photos = (photos || []).filter(Boolean);
  if (!photos.length) return;
  let idx = Math.max(0, Math.min(startIndex, photos.length - 1));
  const single = photos.length < 2;

  const chevL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
  const chevR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';

  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.innerHTML = `
    <button class="lb-close" type="button" aria-label="Kapat">${ICON.x}</button>
    ${single ? '' : `<button class="lb-nav lb-prev" type="button" aria-label="Önceki">${chevL}</button>`}
    <div class="lb-stage"><img class="lb-img" src="" alt="" draggable="false" /></div>
    ${single ? '' : `<button class="lb-nav lb-next" type="button" aria-label="Sonraki">${chevR}</button>`}
    ${single ? '' : '<div class="lb-counter"></div>'}`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => overlay.classList.add('open'));

  const imgEl = overlay.querySelector('.lb-img');
  const counter = overlay.querySelector('.lb-counter');

  function preload(i) { const im = new Image(); im.src = photos[(i + photos.length) % photos.length]; }
  function show(i) {
    idx = (i + photos.length) % photos.length;
    imgEl.src = photos[idx];
    if (counter) counter.textContent = `${idx + 1} / ${photos.length}`;
    if (!single) { preload(idx + 1); preload(idx - 1); } // komşuları önceden yükle
  }
  const next = () => show(idx + 1);
  const prev = () => show(idx - 1);
  function close() {
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 200);
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
  }

  overlay.querySelector('.lb-close').addEventListener('click', close);
  overlay.querySelector('.lb-next')?.addEventListener('click', (e) => { e.stopPropagation(); next(); });
  overlay.querySelector('.lb-prev')?.addEventListener('click', (e) => { e.stopPropagation(); prev(); });
  // Fotoğrafın dışına (boş alana) tıklayınca kapan
  overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.classList.contains('lb-stage')) close(); });
  document.addEventListener('keydown', onKey);

  // Dokunmatik kaydırma
  let sx = 0, sy = 0;
  overlay.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  overlay.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? next() : prev(); }
  });

  show(idx);
}

// ---------- ZIP indirme (JSZip global) ----------
// JSZip'i sadece gerektiğinde (indirme anında) yükle — sayfa açılışını yavaşlatmasın
export function ensureJSZip() {
  if (window.JSZip) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function downloadPhotosZip(urls, zipName, onProgress) {
  if (!urls || !urls.length) { toast('İndirilecek fotoğraf yok', 'err'); return; }
  try { await ensureJSZip(); } catch (e) { toast('İndirme aracı yüklenemedi', 'err'); return; }
  const zip = new window.JSZip();
  let done = 0;
  for (let i = 0; i < urls.length; i++) {
    try {
      const res = await fetch(urls[i]);
      const blob = await res.blob();
      const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      zip.file(`${zipName}-${String(i + 1).padStart(2, '0')}.${ext}`, blob);
    } catch (e) { /* tek foto başarısızsa diğerleriyle devam */ }
    done++;
    if (onProgress) onProgress(done, urls.length);
  }
  const content = await zip.generateAsync({ type: 'blob' });
  triggerDownload(content, `${zipName}.zip`);
}

function triggerDownload(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// Bir görseli (blob üzerinden, taint olmadan) yükle
function loadImage(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { resolve({ img, obj }); };
      img.onerror = (e) => { URL.revokeObjectURL(obj); reject(e); };
      img.src = obj;
    } catch (e) { reject(e); }
  });
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Markalı kapağı (foto + gradyen + logo + bilgiler) gerçek bir görsele çizip blob döndürür
export async function renderCoverImage(row) {
  const cover = coverUrl(row);
  if (!cover) return null;
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Kapak fotoğrafı (cover-fit)
  let photoObj;
  try {
    const { img, obj } = await loadImage(cover); photoObj = obj;
    const s = Math.max(W / img.width, H / img.height);
    const dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } catch (e) { ctx.fillStyle = '#0A2540'; ctx.fillRect(0, 0, W, H); }

  // Alt gradyen
  const g = ctx.createLinearGradient(0, H * 0.42, 0, H);
  g.addColorStop(0, 'rgba(10,37,64,0)');
  g.addColorStop(0.5, 'rgba(10,37,64,0.55)');
  g.addColorStop(1, 'rgba(10,37,64,0.97)');
  ctx.fillStyle = g; ctx.fillRect(0, H * 0.42, W, H * 0.58);

  try { await document.fonts.ready; } catch (e) {}

  // Tip rozeti (sol üst)
  const isSale = row.tip === 'satilik';
  const tag = isSale ? 'SATILIK' : 'KİRALIK';
  ctx.font = '800 30px Manrope, system-ui, sans-serif';
  const tw = ctx.measureText(tag).width;
  const padX = 24, tagH = 60, tagX = 48, tagY = 48;
  roundRect(ctx, tagX, tagY, tw + padX * 2, tagH, 30);
  ctx.fillStyle = isSale ? '#B8924A' : '#ffffff'; ctx.fill();
  ctx.fillStyle = isSale ? '#ffffff' : '#0A2540';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText(tag, tagX + padX, tagY + tagH / 2 + 2);

  // Logo (ortada, alt bölümde)
  try {
    const { img: logo, obj } = await loadImage(BRAND.logoLight);
    const lw = 320, lh = lw * (logo.height / logo.width || 0.166);
    ctx.drawImage(logo, (W - lw) / 2, H - 250, lw, lh);
    URL.revokeObjectURL(obj);
  } catch (e) {
    ctx.font = '600 54px Georgia, serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('SELECTED · GLOBAL', W / 2, H - 210);
  }

  // Bilgiler: konum (sol, altın), oda+eşya (sağ, beyaz)
  ctx.textBaseline = 'alphabetic';
  const baseY = H - 95;
  if (row.bolge) {
    ctx.font = '800 32px Manrope, system-ui, sans-serif';
    ctx.fillStyle = '#D9B26A'; ctx.textAlign = 'left';
    ctx.fillText(regionDisplay(row.bolge).toLocaleUpperCase('tr'), 60, baseY);
  }
  const right = [];
  if (row.oda_sayisi) right.push(row.oda_sayisi);
  if (row.esyali != null) right.push(row.esyali ? 'Eşyalı' : 'Eşyasız');
  if (right.length) {
    ctx.font = '600 32px Manrope, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'right';
    ctx.fillText(right.join('  ·  '), W - 60, baseY);
  }
  ctx.textAlign = 'left';

  if (photoObj) setTimeout(() => URL.revokeObjectURL(photoObj), 1000);
  return await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
}

// Daire(ler)in fotoğraflarını + markalı kapağı ZIP olarak indir
export async function downloadPropertyPhotos(rows, zipName, onProgress) {
  try { await ensureJSZip(); } catch (e) { toast('İndirme aracı yüklenemedi', 'err'); return; }
  rows = (Array.isArray(rows) ? rows : [rows]).filter(Boolean);
  const zip = new window.JSZip();
  const total = rows.reduce((n, r) => n + 1 + ((r.fotograflar || []).length), 0);
  let done = 0;
  for (const row of rows) {
    const base = slugify(`${row.bolge || ''}-${pickTitle(row)}`) || 'daire';
    const folder = rows.length > 1 ? zip.folder(base) : zip;
    // Markalı kapak (ilk dosya)
    try {
      const coverBlob = await renderCoverImage(row);
      if (coverBlob) folder.file('00-kapak.jpg', coverBlob);
    } catch (e) { /* kapak üretilemezse ham fotoğraflarla devam */ }
    done++; if (onProgress) onProgress(done, total);
    // Ham fotoğraflar
    const photos = row.fotograflar || [];
    for (let i = 0; i < photos.length; i++) {
      try {
        const res = await fetch(photos[i]); const blob = await res.blob();
        const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
        folder.file(`${String(i + 1).padStart(2, '0')}.${ext}`, blob);
      } catch (e) {}
      done++; if (onProgress) onProgress(done, total);
    }
  }
  const content = await zip.generateAsync({ type: 'blob' });
  triggerDownload(content, `${zipName}.zip`);
}

// ---------- Instagram Reels videosu (9:16, markalı, sessiz — müzik IG'de eklenir) ----------
// Kurumsal akış: hook (fiyat+konum) → fotoğraflar (Ken Burns + geçiş) → özellikler kartı → iletişim kartı
export async function makeReel(row, opts = {}, onProgress) {
  const W = 1080, H = 1920, FPS = 30;
  const navy = '#0A2540', gold = '#C9A24B', goldL = '#D9B26A';
  const isSale = row.tip === 'satilik';
  const region = regionDisplay(row.bolge) || '';
  const regionUp = region.toLocaleUpperCase('tr');
  try { await document.fonts.load("700 60px 'Dancing Script'"); } catch (e) {}
  try { await document.fonts.ready; } catch (e) {}

  let logo = null; try { logo = (await loadImage(BRAND.logoLight)).img; } catch (e) {}
  const urls = (row.fotograflar || []).slice(0, 8);
  const imgs = [];
  for (const u of urls) { try { const { img } = await loadImage(u); imgs.push(img); } catch (e) {} }
  if (!imgs.length) throw new Error('Fotoğraf yok');

  const contact = opts.contact || { name: BRAND.name, phone: BRAND.phone };
  const priceText = () => { if (row.fiyat == null || row.fiyat === '') return 'Fiyat için arayınız'; const sym = CURRENCY[row.para_birimi] || ''; return `${sym}${Number(row.fiyat).toLocaleString('tr-TR')}${row.tip === 'kiralik' ? ' /ay' : ''}`; };

  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const fitFont = (text, weight, maxSize, maxW, fam = 'Manrope, sans-serif') => {
    let s = maxSize; do { ctx.font = `${weight} ${s}px ${fam}`; if (ctx.measureText(text).width <= maxW) break; s -= 4; } while (s > 22); return s;
  };
  const drawCover = (img, zoom, panx) => {
    const s = Math.max(W / img.width, H / img.height) * zoom;
    const dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, (W - dw) / 2 + panx * W, (H - dh) / 2, dw, dh);
  };
  const botGrad = (from) => { const g = ctx.createLinearGradient(0, H * from, 0, H); g.addColorStop(0, 'rgba(10,37,64,0)'); g.addColorStop(.55, 'rgba(10,37,64,.6)'); g.addColorStop(1, 'rgba(10,37,64,.97)'); ctx.fillStyle = g; ctx.fillRect(0, H * from, W, H * (1 - from)); };
  const topGrad = (to) => { const g = ctx.createLinearGradient(0, 0, 0, H * to); g.addColorStop(0, 'rgba(10,37,64,.8)'); g.addColorStop(1, 'rgba(10,37,64,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * to); };
  const wrapLines = (text, font, maxW, maxLines) => {
    ctx.font = font; const words = String(text).split(/\s+/); let line = ''; const lines = [];
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; if (lines.length >= maxLines) break; } else line = t; }
    if (line && lines.length < maxLines) lines.push(line);
    return lines;
  };
  const drawLogo = (cx, top, w) => { if (!logo) return; const h = w * (logo.height / logo.width || 0.166); ctx.drawImage(logo, cx - w / 2, top, w, h); };

  function drawSpecs() {
    ctx.fillStyle = navy; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(201,162,75,.5)'; ctx.lineWidth = 2; ctx.strokeRect(46, 60, W - 92, H - 120);
    drawLogo(W / 2, 140, 360);
    ctx.textAlign = 'center'; ctx.font = '800 42px Manrope, sans-serif'; ctx.fillStyle = goldL; ctx.fillText('DAİRE ÖZELLİKLERİ', W / 2, 400);
    const rows = [['Bölge', region], ['Proje', row.proje], ['Konut Tipi', row.konut_tipi], ['Oda Sayısı', row.oda_sayisi], ['Alan', row.metrekare ? `${row.metrekare} m²` : null], ['Banyo', row.banyo_sayisi != null ? String(row.banyo_sayisi) : null], ['Kat', row.kat], ['Eşya', row.esyali == null ? null : (row.esyali ? 'Eşyalı' : 'Eşyasız')]].filter(([, v]) => v != null && v !== '').slice(0, 7);
    let y = 520; const x0 = 100, x1 = W - 100;
    rows.forEach(([k, v]) => {
      ctx.textAlign = 'left'; ctx.font = '600 36px Manrope, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillText(k, x0, y);
      ctx.textAlign = 'right'; ctx.font = '700 40px Manrope, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(String(v), x1, y);
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y + 28); ctx.lineTo(x1, y + 28); ctx.stroke();
      y += 92;
    });
    ctx.textAlign = 'center'; ctx.font = '800 36px Manrope, sans-serif'; ctx.fillStyle = goldL; ctx.fillText(isSale ? 'SATIŞ FİYATI' : 'AYLIK KİRA', W / 2, y + 50);
    const pf = fitFont(priceText(), '800', 88, W - 160); ctx.font = `800 ${pf}px Manrope, sans-serif`; ctx.fillStyle = '#fff'; ctx.fillText(priceText(), W / 2, y + 145);
  }
  function drawOutro() {
    ctx.fillStyle = navy; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(201,162,75,.5)'; ctx.lineWidth = 2; ctx.strokeRect(46, 60, W - 92, H - 120);
    drawLogo(W / 2, H / 2 - 380, 540);
    ctx.textAlign = 'center';
    ctx.font = '800 40px Manrope, sans-serif'; ctx.fillStyle = goldL; ctx.fillText('BİLGİ VE RANDEVU İÇİN', W / 2, H / 2 - 30);
    const nf = fitFont(contact.name || BRAND.name, '700', 58, W - 200, 'Fraunces, Georgia, serif'); ctx.font = `700 ${nf}px Fraunces, Georgia, serif`; ctx.fillStyle = '#fff'; ctx.fillText(contact.name || BRAND.name, W / 2, H / 2 + 70);
    ctx.font = '800 78px Manrope, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(contact.phone || BRAND.phone, W / 2, H / 2 + 180);
    ctx.font = '600 36px Manrope, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText(BRAND.site.replace(/^https?:\/\//, ''), W / 2, H / 2 + 260);
    ctx.font = '500 30px Manrope, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillText('Kuzey Kıbrıs’ta güvenilir gayrimenkul', W / 2, H - 120);
  }
  function drawScene(sc, p) {
    ctx.fillStyle = navy; ctx.fillRect(0, 0, W, H);
    if (sc.img) drawCover(sc.img, 1.02 + 0.08 * p, (sc.pan || 0) * p);
    if (sc.type === 'hero') {
      topGrad(0.34); botGrad(0.40);
      // Satılık/Kiralık — daha büyük
      ctx.font = '800 40px Manrope, sans-serif'; const tag = isSale ? 'SATILIK' : 'KİRALIK'; const tw = ctx.measureText(tag).width;
      roundRect(ctx, 54, 74, tw + 72, 78, 39); ctx.fillStyle = isSale ? gold : '#fff'; ctx.fill();
      ctx.fillStyle = isSale ? '#fff' : navy; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(tag, 90, 114); ctx.textBaseline = 'alphabetic';
      // İlan açıklaması — üstte ortada, el yazısı (script)
      const acik = (row.aciklama || '').trim();
      if (acik) {
        const a = Math.max(0, Math.min(1, (p * sc.dur) / 0.6)); ctx.globalAlpha = a;
        ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 14;
        const font = "700 60px 'Dancing Script', cursive"; const lines = wrapLines(acik, font, W - 150, 3);
        let ty = 200; ctx.font = font; lines.forEach((l) => { ctx.fillText(l, W / 2, ty); ty += 74; });
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, (p * sc.dur) / 0.5));
      let y = H * 0.60;
      if (regionUp) { ctx.font = '800 40px Manrope, sans-serif'; ctx.fillStyle = goldL; ctx.textAlign = 'left'; ctx.fillText(regionUp, 60, y); }
      y += 96; const pf = fitFont(priceText(), '800', 94, W - 120); ctx.font = `800 ${pf}px Manrope, sans-serif`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(priceText(), 60, y);
      const meta = [row.oda_sayisi, row.metrekare ? `${row.metrekare} m²` : null, row.konut_tipi].filter(Boolean).join('   ·   ');
      if (meta) { y += 58; ctx.font = '600 38px Manrope, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillText(meta, 60, y); }
      ctx.globalAlpha = 1;
    } else if (sc.type === 'photo') {
      botGrad(0.58);
      // Logo ortada — daha büyük
      drawLogo(W / 2, H - 360, 480);
      // Proje adı sabit ortada (logonun altında)
      if (row.proje) { ctx.font = `800 ${fitFont(row.proje.toLocaleUpperCase('tr'), '800', 46, W - 160)}px Manrope, sans-serif`; ctx.fillStyle = goldL; ctx.textAlign = 'center'; ctx.fillText(row.proje.toLocaleUpperCase('tr'), W / 2, H - 210); }
      // Altta: solda lokasyon, sağda oda · m²
      const infoY = H - 120;
      if (regionUp) { ctx.font = `700 ${fitFont(regionUp, '700', 34, W / 2 - 90)}px Manrope, sans-serif`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(regionUp, 70, infoY); }
      const right = [row.oda_sayisi, row.metrekare ? `${row.metrekare} m²` : null].filter(Boolean).join('   ·   ');
      if (right) { ctx.font = `700 ${fitFont(right, '700', 34, W / 2 - 90)}px Manrope, sans-serif`; ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(right, W - 70, infoY); }
    } else if (sc.type === 'specs') drawSpecs();
    else if (sc.type === 'outro') drawOutro();
  }

  const scenes = [{ type: 'hero', img: imgs[0], dur: 3.2, pan: 0 }];
  for (let i = 1; i < imgs.length; i++) scenes.push({ type: 'photo', img: imgs[i], idx: i, dur: 2.3, pan: (i % 2 ? 0.03 : -0.03) });
  scenes.push({ type: 'specs', dur: 3.4 });
  scenes.push({ type: 'outro', dur: 3.6 });
  const total = scenes.reduce((s, x) => s + x.dur, 0);
  const TR = 0.45;

  const mimeTypes = ['video/mp4;codecs=h264', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mimeType = (window.MediaRecorder ? mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) : '') || '';
  if (!window.MediaRecorder) throw new Error('Bu tarayıcı video kaydını desteklemiyor');
  const stream = canvas.captureStream(FPS);
  const rec = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 9000000 } : { videoBitsPerSecond: 9000000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

  return await new Promise((resolve, reject) => {
    let start = 0, raf = 0;
    rec.onstop = () => resolve({ blob: new Blob(chunks, { type: mimeType || 'video/webm' }), ext: mimeType.includes('mp4') ? 'mp4' : 'webm' });
    rec.onerror = (e) => reject(e.error || new Error('Kayıt hatası'));
    function frame(now) {
      if (!start) start = now;
      const t = (now - start) / 1000;
      if (onProgress) onProgress(Math.min(1, t / total));
      if (t >= total) { cancelAnimationFrame(raf); if (rec.state !== 'inactive') rec.stop(); return; }
      let acc = 0, i = 0;
      for (; i < scenes.length; i++) { if (t < acc + scenes[i].dur) break; acc += scenes[i].dur; }
      if (i >= scenes.length) i = scenes.length - 1;
      const local = t - acc;
      drawScene(scenes[i], Math.min(1, local / scenes[i].dur));
      if (scenes[i + 1] && local > scenes[i].dur - TR) {
        ctx.globalAlpha = Math.max(0, Math.min(1, (local - (scenes[i].dur - TR)) / TR));
        drawScene(scenes[i + 1], 0);
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    }
    try { rec.start(); } catch (e) { reject(e); return; }
    raf = requestAnimationFrame(frame);
  });
}

// Reels videosunu üret + indir
export async function downloadReel(row, opts = {}, onProgress) {
  const { blob, ext } = await makeReel(row, opts, onProgress);
  triggerDownload(blob, `${opts.fileName || 'selected-global-reels'}.${ext}`);
  return ext;
}

export { getLang, setLang, t, applyI18n };
