// Selected Global — ortak yardımcılar (ikonlar, formatlama, header, toast, dil)
import { CURRENCY, BRAND, ALL_LISTINGS_URL, REGION_GROUPS } from './config.js';
import { getLang, setLang, t, applyI18n } from './i18n.js';

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
  if (p == null || p === '') return t('not_specified');
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
export function coverUrl(row) {
  const arr = row.fotograflar || [];
  if (!arr.length) return null;
  const i = Math.min(row.kapak_index || 0, arr.length - 1);
  return arr[i];
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
      ${cover ? `<img src="${esc(cover)}" alt="${esc(pickTitle(row))}" loading="lazy" />` : `<span class="ph">${ICON.camera}</span>`}
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

// ---------- ZIP indirme (JSZip global) ----------
export async function downloadPhotosZip(urls, zipName, onProgress) {
  if (!window.JSZip) { toast('İndirme aracı yüklenemedi', 'err'); return; }
  if (!urls || !urls.length) { toast('İndirilecek fotoğraf yok', 'err'); return; }
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
  if (!window.JSZip) { toast('İndirme aracı yüklenemedi', 'err'); return; }
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

export { getLang, setLang, t, applyI18n };
