// Selected Global — Portföy linki sayfası (müşteriye gönderilen seçki)
import { supabase, ALL_LISTINGS_URL, creatorContact } from './config.js?v=2';
import { t, applyI18n, getLang } from './i18n.js?v=2';
import {
  ICON, fmtPrice, esc, pickTitle, slugify, brandedCover,
  renderHeader, renderFooter, wireLangSwitch, toast, downloadPropertyPhotos,
} from './ui.js?v=2';

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
let contact = null;

function card(row, i) {
  const photos = (row.fotograflar || []).length;
  const title = pickTitle(row);
  const tel = contact ? `&tel=${contact.phoneRaw}` : '';
  return `
  <div class="pcard reveal" style="animation-delay:${Math.min(i*0.05,0.4)}s">
    <a href="daire.html?id=${row.id}${tel}" style="display:block">${brandedCover(row)}</a>
    <div class="pcard-body">
      ${title ? `<h3 class="pcard-title">${esc(title)}</h3>` : ''}
      <div class="pcard-row">
        <span class="price">${fmtPrice(row.fiyat, row.para_birimi, row.tip)}</span>
        ${row.metrekare ? `<span class="text-muted" style="font-weight:600;font-size:.88rem">${esc(row.metrekare)} m²</span>` : ''}
      </div>
      <div style="display:flex;gap:8px">
        <a class="btn btn-ghost btn-sm" href="daire.html?id=${row.id}${tel}" style="flex:1">${ICON.camera}<span data-i18n="view_photos">${t('view_photos')}</span></a>
        ${photos ? `<button class="btn btn-primary btn-sm" data-dl="${row.id}" title="${t('download_photos')}">${ICON.download}</button>` : ''}
      </div>
    </div>
  </div>`;
}

function render() {
  document.getElementById('pTitle').textContent =
    (portfolio && portfolio.baslik) || t('portfolio_default_title');
  // Hazırlayan satırı
  if (portfolio && portfolio.olusturan) {
    let cr = document.getElementById('pCreator');
    if (!cr) {
      cr = document.createElement('p'); cr.id = 'pCreator';
      cr.style.cssText = 'color:var(--gold);font-size:.82rem;margin:8px 0 0;font-weight:700;letter-spacing:.04em';
      const lead = document.getElementById('pLead');
      lead.parentNode.insertBefore(cr, lead.nextSibling);
    }
    cr.textContent = (getLang() === 'tr' ? 'Hazırlayan: ' : 'Prepared by: ') + portfolio.olusturan;
  }
  const grid = document.getElementById('grid');
  if (!items.length) {
    grid.innerHTML = `<div class="state" style="grid-column:1/-1"><h3>${t('portfolio_empty')}</h3></div>`;
    document.getElementById('dlAllBtn').classList.add('hidden');
    return;
  }
  grid.innerHTML = items.map((r, i) => card(r, i)).join('');

  // İletişim kartı (portföyü oluşturana göre WhatsApp + Ara)
  if (contact) {
    let c = document.getElementById('pContact');
    if (!c) { c = document.createElement('div'); c.id = 'pContact'; c.className = 'container portfolio-contact'; grid.after(c); }
    const waText = encodeURIComponent(getLang() === 'tr' ? 'Merhaba, gönderdiğiniz portföydeki daireler hakkında bilgi almak istiyorum.' : 'Hello, I would like information about the properties in the portfolio you sent.');
    c.innerHTML = `
      <div class="contact-card">
        <div class="ci-text">
          <span class="ci-label">${getLang() === 'tr' ? 'Bilgi ve randevu için' : 'For info & viewings'}</span>
          <span class="ci-name">${esc(contact.name)}</span>
          <span class="ci-phone">${esc(contact.phone)}</span>
        </div>
        <div class="ci-btns">
          <a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/${contact.phoneRaw}?text=${waText}">${ICON.wa}<span>WhatsApp</span></a>
          <a class="btn btn-primary" href="tel:+${contact.phoneRaw}">${ICON.phone}<span>${getLang() === 'tr' ? 'Ara' : 'Call'}</span></a>
        </div>
      </div>`;
  }

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
  contact = creatorContact(p.olusturan);
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

document.getElementById('allListingsBtn').href = 'daireler.html';
wireLangSwitch(() => render());
applyI18n(document);
load();
