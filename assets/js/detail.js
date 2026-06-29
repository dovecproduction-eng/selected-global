// Selected Global — Daire detay sayfası
import { supabase, BRAND, CURRENCY, creatorContact } from './config.js?v=22';
import { t, applyI18n, getLang } from './i18n.js?v=22';
import {
  ICON, fmtPrice, esc, pickTitle, pickDesc, slugify, regionDisplay,
  renderHeader, renderFooter, wireLangSwitch, toast, downloadPropertyPhotos, openLightbox,
} from './ui.js?v=22';

document.getElementById('header').innerHTML = renderHeader();
document.getElementById('footer').innerHTML = renderFooter();

const id = new URLSearchParams(location.search).get('id');
const telParam = new URLSearchParams(location.search).get('tel');
// İletişim numarası: önce dairenin ekleyeni, yoksa portföy oluşturanı (tel), yoksa genel
let contactRaw = telParam || BRAND.phoneRaw;
let row = null;
let activePhoto = 0;

function specRows() {
  const r = row;
  const rows = [
    [t('sp_type'), r.tip === 'satilik' ? t('badge_sale') : t('badge_rent')],
    [getLang() === 'tr' ? 'Proje' : 'Project', r.proje],
    [t('sp_konut'), r.konut_tipi],
    [t('sp_region'), regionDisplay(r.bolge)],
    [t('sp_rooms'), r.oda_sayisi],
    [t('sp_area'), r.metrekare ? `${r.metrekare} m²` : null],
    [t('sp_bath'), r.banyo_sayisi],
    [t('sp_floor'), r.kat],
    [r.esyali != null ? (getLang()==='tr'?'Eşya durumu':'Furnishing') : null,
     r.esyali != null ? (r.esyali ? t('sp_furnished') : t('sp_unfurnished')) : null],
  ];
  return rows
    .filter(([k]) => k)
    .map(([k, v]) => `<div class="row"><span class="k">${esc(k)}</span><span class="v">${v ? esc(v) : t('not_specified')}</span></div>`)
    .join('');
}

function gallery() {
  const photos = row.fotograflar || [];
  if (!photos.length) {
    return `<div class="main-img" style="display:grid;place-items:center;color:#B6C2D0">${ICON.camera}</div>`;
  }
  return `
    <div class="main-img zoomable" id="mainImgWrap"><img id="mainImg" src="${esc(photos[activePhoto])}" alt="${esc(pickTitle(row))}" /><span class="zoom-hint">${ICON.camera}</span></div>
    ${photos.length > 1 ? `<div class="thumbs" id="thumbs">
      ${photos.map((p, i) => `<img src="${esc(p)}" class="${i===activePhoto?'active':''}" data-i="${i}" alt="" />`).join('')}
    </div>` : ''}`;
}

function render() {
  const photos = row.fotograflar || [];
  const features = row.ozellikler || [];
  const desc = pickDesc(row);
  document.getElementById('detail').innerHTML = `
    <div class="breadcrumb">
      <a class="link-quiet" href="javascript:history.back()">← <span data-i18n="back_to_listings">${t('back_to_listings')}</span></a>
    </div>
    <div class="detail-grid">
      <div class="gallery">${gallery()}</div>
      <div class="detail-panel">
        ${row.bolge ? `<div class="detail-region">${esc(regionDisplay(row.bolge))}</div>` : ''}
        <h1 class="detail-title">${esc(pickTitle(row) || t('not_specified'))}</h1>
        <div class="detail-price">${fmtPrice(row.fiyat, row.para_birimi, row.tip)}</div>
        <div class="spec-table">${specRows()}</div>
        ${features.length ? `<div class="feature-chips">${features.map((f)=>`<span class="chip">${esc(f)}</span>`).join('')}</div>` : ''}
        ${desc ? `<h4 style="font-size:1.05rem;margin-bottom:6px" data-i18n="description">${t('description')}</h4><p class="detail-desc">${esc(desc)}</p>` : ''}
        <div class="detail-cta">
          ${photos.length ? `<button class="btn btn-primary btn-block" id="dlBtn">${ICON.download}<span data-i18n="download_photos">${t('download_photos')}</span></button>` : ''}
          <div class="contact-row">
            <a class="btn btn-ghost" href="tel:+${contactRaw}">${ICON.phone}<span data-i18n="call_now">${t('call_now')}</span></a>
            <a class="btn btn-gold" target="_blank" href="https://wa.me/${contactRaw}?text=${encodeURIComponent((getLang()==='tr'?'Merhaba, şu ilanla ilgileniyorum: ':'Hello, I am interested in: ') + pickTitle(row))}">${ICON.wa}<span>WhatsApp</span></a>
          </div>
        </div>
      </div>
    </div>`;

  // Galeri thumb tıklama
  const thumbs = document.getElementById('thumbs');
  if (thumbs) {
    thumbs.addEventListener('click', (e) => {
      const im = e.target.closest('img[data-i]'); if (!im) return;
      activePhoto = Number(im.dataset.i);
      document.getElementById('mainImg').src = (row.fotograflar || [])[activePhoto];
      thumbs.querySelectorAll('img').forEach((x) => x.classList.toggle('active', x === im));
    });
  }

  // Ana görsele tıkla → tam ekran galeri (ok tuşları/butonları ile gezin)
  const mainWrap = document.getElementById('mainImgWrap');
  if (mainWrap && (row.fotograflar || []).length) {
    mainWrap.addEventListener('click', () => openLightbox(row.fotograflar, activePhoto));
  }

  // İndirme
  const dl = document.getElementById('dlBtn');
  if (dl) {
    dl.addEventListener('click', async () => {
      const orig = dl.innerHTML;
      dl.disabled = true;
      dl.innerHTML = `<span class="spin" style="display:inline-flex">${ICON.spinner}</span><span>${t('preparing')}</span>`;
      const name = slugify(`${row.bolge || ''}-${pickTitle(row)}`);
      await downloadPropertyPhotos([row], name, (d, total) => {
        dl.querySelector('span:last-child').textContent = `${t('preparing')} ${d}/${total}`;
      });
      dl.disabled = false; dl.innerHTML = orig;
      toast(getLang()==='tr'?'Fotoğraflar indirildi':'Photos downloaded', 'ok');
    });
  }
}

async function load() {
  if (!id) { notFound(); return; }
  const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();
  if (error || !data) { notFound(); return; }
  row = data;
  if (row.ekleyen) contactRaw = creatorContact(row.ekleyen).phoneRaw;
  document.title = `${pickTitle(row)} — Selected Global`;
  render();
}

function notFound() {
  document.getElementById('detail').innerHTML =
    `<div class="state"><h3>${t('detail_not_found')}</h3><a class="link-quiet" href="index.html">← ${t('back_to_listings')}</a></div>`;
}

wireLangSwitch(() => { if (row) render(); });
applyI18n(document);
load();
