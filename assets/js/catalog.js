// Selected Global — Tüm daireler (herkese açık vitrin)
import { supabase, REGION_GROUPS, PUBLIC_PROPERTY_COLS } from './config.js?v=98';
import { t, applyI18n, getLang } from './i18n.js?v=98';
import {
  ICON, fmtPrice, esc, pickTitle, brandedCover, regionDistrict, regionDisplay,
  renderHeader, renderFooter, wireLangSwitch, toast,
} from './ui.js?v=98';

const state = { all: [], type: 'all', region: '', proje: '', room: '' };

document.getElementById('header').innerHTML = renderHeader();
document.getElementById('footer').innerHTML = renderFooter();

// "Fiyat için arayınız" → o dairenin detay sayfasına git (iletişim orada)
document.addEventListener('click', (e) => {
  const el = e.target.closest('.call-price'); if (!el) return;
  const link = el.closest('.pcard')?.querySelector('a[href^="daire"]');
  if (link) location.href = link.getAttribute('href');
});

function skeletons(n = 6) {
  return Array.from({ length: n }).map(() => `
    <div class="sk-card">
      <div class="sk-media skeleton"></div>
      <div class="sk-line skeleton" style="width:45%"></div>
      <div class="sk-line skeleton" style="width:75%"></div>
    </div>`).join('');
}

function card(row, i) {
  const title = pickTitle(row);
  return `
  <div class="pcard reveal" style="animation-delay:${Math.min(i * 0.05, 0.4)}s">
    <a href="daire?id=${row.id}" style="display:block">${brandedCover(row)}</a>
    <div class="pcard-body">
      ${title ? `<h3 class="pcard-title">${esc(title)}</h3>` : ''}
      <div class="pcard-row">
        <span class="price">${fmtPrice(row.fiyat, row.para_birimi, row.tip)}</span>
        ${row.metrekare ? `<span class="text-muted" style="font-weight:600;font-size:.88rem">${esc(row.metrekare)} m²</span>` : ''}
      </div>
      <a class="btn btn-ghost btn-sm btn-block" href="daire?id=${row.id}">${ICON.camera}<span>${getLang() === 'tr' ? 'Detay & fotoğraflar' : 'Details & photos'}</span></a>
    </div>
  </div>`;
}

const rkey = (s) => (s || '').trim().toLocaleLowerCase('tr');

function applyFilters() {
  let list = state.all.slice();
  if (state.type !== 'all') list = list.filter((r) => r.tip === state.type);
  if (state.region) list = list.filter((r) => rkey(r.bolge) === rkey(state.region));
  if (state.proje) list = list.filter((r) => rkey(r.proje) === rkey(state.proje));
  if (state.room) list = list.filter((r) => (r.oda_sayisi || '') === state.room);
  return list;
}

function render() {
  const grid = document.getElementById('grid');
  const list = applyFilters();
  document.getElementById('resCount').textContent = list.length;
  if (!list.length) {
    grid.innerHTML = `<div class="state" style="grid-column:1/-1"><h3>${t('empty_title')}</h3><p>${t('empty_text')}</p></div>`;
    return;
  }
  grid.innerHTML = list.map((r, i) => card(r, i)).join('');
}

function fillRegionOptions() {
  const sel = document.getElementById('regionSel'); const cur = sel.value;
  const seen = new Set(); const used = [];
  state.all.map((r) => (r.bolge || '').trim()).filter(Boolean).forEach((r) => { const k = rkey(r); if (!seen.has(k)) { seen.add(k); used.push(r); } });
  // ilçeye göre grupla
  const grp = {}; const other = [];
  used.forEach((r) => { const d = regionDistrict(r); if (d) (grp[d] = grp[d] || []).push(r); else other.push(r); });
  let html = `<option value="">${t('f_region')}</option>`;
  Object.keys(REGION_GROUPS).forEach((d) => {
    const a = grp[d]; if (!a || !a.length) return;
    const order = REGION_GROUPS[d]; a.sort((x, y) => order.indexOf(x) - order.indexOf(y));
    html += `<optgroup label="${esc(d)}">` + a.map((r) => `<option value="${esc(r)}">${esc(regionDisplay(r))}</option>`).join('') + `</optgroup>`;
  });
  if (other.length) html += `<optgroup label="Diğer">` + other.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join('') + `</optgroup>`;
  sel.innerHTML = html; sel.value = cur;
}

function fillProjeOptions() {
  const projeler = [...new Set(state.all.map((r) => (r.proje || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'tr'));
  const sel = document.getElementById('projeSel'); const cur = sel.value;
  sel.innerHTML = `<option value="">Tüm Projeler</option>` + projeler.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
  sel.value = cur;
}

function fillRoomOptions() {
  const rooms = [...new Set(state.all.map((r) => r.oda_sayisi).filter(Boolean))].sort();
  const sel = document.getElementById('roomSel'); const cur = sel.value;
  sel.innerHTML = `<option value="">${t('f_rooms')}</option>` + rooms.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join('');
  sel.value = cur;
}

async function load() {
  document.getElementById('grid').innerHTML = skeletons();
  const { data, error } = await supabase.from('properties').select(PUBLIC_PROPERTY_COLS).order('created_at', { ascending: false });
  if (error) {
    document.getElementById('grid').innerHTML = `<div class="state" style="grid-column:1/-1"><h3>Bağlantı hatası</h3><p>Daireler yüklenemedi.</p></div>`;
    toast('Daireler yüklenemedi', 'err'); return;
  }
  state.all = data || [];
  fillRegionOptions(); fillProjeOptions(); fillRoomOptions(); render();
}

document.getElementById('typeSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-type]'); if (!b) return;
  state.type = b.dataset.type;
  document.querySelectorAll('#typeSeg button').forEach((x) => x.classList.toggle('active', x === b));
  render();
});
document.getElementById('regionSel').addEventListener('change', (e) => { state.region = e.target.value; render(); });
document.getElementById('projeSel').addEventListener('change', (e) => { state.proje = e.target.value; render(); });
document.getElementById('roomSel').addEventListener('change', (e) => { state.room = e.target.value; render(); });

wireLangSwitch(() => { fillRegionOptions(); fillProjeOptions(); fillRoomOptions(); render(); });
applyI18n(document);
load();
