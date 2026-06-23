// Selected Global — Portföy linki sayfası (müşteriye gönderilen seçki)
import { supabase, ALL_LISTINGS_URL } from './config.js';
import { t, applyI18n, getLang } from './i18n.js';
import {
  ICON, fmtPrice, esc, pickTitle, slugify, brandedCover,
  renderHeader, renderFooter, wireLangSwitch, toast, downloadPropertyPhotos,
} from './ui.js';

document.getElementById('header').innerHTML = renderHeader();
document.getElementById('footer').innerHTML = renderFooter();

// Admin önizlemesi ise lead yazısının soluna "geri" butonu koy (müşteri linkinde görünmez)
if (new URLSearchParams(location.search).has('admin')) {
  const lead = document.getElementById('pLead');
  const wrap = document.createElement('div');
  wrap.className = 'lead-with-back';
  const back = document.createElement('a');
  back.className = 'lead-back-btn';
  back.href = 'admin.html#ports';
  back.title = 'Gönderilen portföylere dön';
  back.setAttribute('aria-label', 'Geri');
  back.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>';
  lead.parentNode.insertBefore(wrap, lead);
  wrap.appendChild(back);
  wrap.appendChild(lead);
}

const kod = new URLSearchParams(location.search).get('kod');
let portfolio = null;
let items = [];

function card(row, i) {
  const photos = (row.fotograflar || []).length;
  const title = pickTitle(row);
  return `
  <div class="pcard reveal" style="animation-delay:${Math.min(i*0.05,0.4)}s">
    <a href="daire.html?id=${row.id}" style="display:block">${brandedCover(row)}</a>
    <div class="pcard-body">
      ${title ? `<h3 class="pcard-title">${esc(title)}</h3>` : ''}
      <div class="pcard-row">
        <span class="price">${fmtPrice(row.fiyat, row.para_birimi, row.tip)}</span>
        ${row.metrekare ? `<span class="text-muted" style="font-weight:600;font-size:.88rem">${esc(row.metrekare)} m²</span>` : ''}
      </div>
      <div style="display:flex;gap:8px">
        <a class="btn btn-ghost btn-sm" href="daire.html?id=${row.id}" style="flex:1">${ICON.camera}<span data-i18n="view_photos">${t('view_photos')}</span></a>
        ${photos ? `<button class="btn btn-primary btn-sm" data-dl="${row.id}" title="${t('download_photos')}">${ICON.download}</button>` : ''}
      </div>
    </div>
  </div>`;
}

function render() {
  document.getElementById('pTitle').textContent =
    (portfolio && portfolio.baslik) || t('portfolio_default_title');
  const grid = document.getElementById('grid');
  if (!items.length) {
    grid.innerHTML = `<div class="state" style="grid-column:1/-1"><h3>${t('portfolio_empty')}</h3></div>`;
    document.getElementById('dlAllBtn').classList.add('hidden');
    return;
  }
  grid.innerHTML = items.map((r, i) => card(r, i)).join('');

  // Tek tek indirme (markalı kapak dahil)
  grid.querySelectorAll('button[data-dl]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = items.find((x) => x.id === btn.dataset.dl);
      await runDownload(btn, [row], slugify(`${row.bolge||''}-${pickTitle(row)}`));
    });
  });

  // Tümünü indir (her dairenin kapağı + fotoğrafları)
  const hasPhotos = items.some((r) => (r.fotograflar || []).length);
  const dlAll = document.getElementById('dlAllBtn');
  if (hasPhotos) {
    dlAll.classList.remove('hidden');
    dlAll.innerHTML = `${ICON.download}<span data-i18n="download_all">${t('download_all')}</span>`;
    dlAll.onclick = async () => {
      const name = slugify((portfolio && portfolio.baslik) || 'selected-global-portfoy');
      await runDownload(dlAll, items, name);
    };
  } else {
    dlAll.classList.add('hidden');
  }
}

async function runDownload(btn, rows, name) {
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spin" style="display:inline-flex">${ICON.spinner}</span><span>${t('preparing')}</span>`;
  await downloadPropertyPhotos(rows, name, (d, total) => {
    btn.querySelector('span:last-child').textContent = `${t('preparing')} ${d}/${total}`;
  });
  btn.disabled = false; btn.innerHTML = orig;
  toast(getLang()==='tr'?'Fotoğraflar indirildi':'Photos downloaded', 'ok');
}

async function load() {
  if (!kod) { fail(); return; }
  const { data: p, error } = await supabase.from('portfolios').select('*').eq('kod', kod).single();
  if (error || !p) { fail(); return; }
  portfolio = p;
  const ids = p.property_ids || [];
  if (ids.length) {
    const { data: props } = await supabase.from('properties').select('*').in('id', ids);
    // portföydeki sırayı koru
    items = ids.map((id) => (props || []).find((x) => x.id === id)).filter(Boolean);
  }
  if (p.baslik) document.title = `${p.baslik} — Selected Global`;
  render();
}

function fail() {
  document.getElementById('pTitle').textContent = t('portfolio_empty');
  document.getElementById('pLead').classList.add('hidden');
  document.getElementById('grid').innerHTML =
    `<div class="state" style="grid-column:1/-1"><a class="btn btn-ghost" href="index.html">← ${t('back_to_listings')}</a></div>`;
}

document.getElementById('allListingsBtn').href = ALL_LISTINGS_URL;
wireLangSwitch(() => render());
applyI18n(document);
load();
