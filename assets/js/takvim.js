// Selected Global — Takvim (sade, sadece ay görünümü)
import { initAuth, supabase, toast, classify, FMT, fmtTime, fmtDay, fmtFull, dayKey, esc, openPostDrawer, wirePostDrawer } from './planner-common.js?v=132';

const $ = (s) => document.querySelector(s);
const WD = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

let posts = [];
let viewMonth = startOfMonth(new Date());
let byDay = {};
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function labelOf(p, kind) { if (kind === 'egitici') return 'Eğitici seri'; if (kind === 'story') return 'Story'; return (p.caption || '').split('\n')[0].trim() || 'Daire'; }

async function load() {
  const { data, error } = await supabase.from('scheduled_posts').select('*').order('publish_at', { ascending: true });
  if (error) { toast('Takvim yüklenemedi: ' + error.message, 'err'); return; }
  posts = data || [];
  byDay = {}; posts.forEach((p) => { (byDay[dayKey(p.publish_at)] = byDay[dayKey(p.publish_at)] || []).push(p); });
}

function renderLegend() {
  $('#plLegend').innerHTML = Object.entries(FMT).map(([, f]) => `<span class="pl-lg"><span class="pl-lg-dot" style="background:${f.color}"></span>${f.icon} ${f.label}</span>`).join('');
}

function renderMonth() {
  $('#plMonthLabel').textContent = `${MONTHS[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
  $('#plWeekHead').innerHTML = WD.map((d) => `<span>${d}</span>`).join('');
  const first = new Date(viewMonth);
  const lead = (first.getDay() + 6) % 7;
  const startCell = new Date(first); startCell.setDate(1 - lead);
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' });
  let html = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(startCell); d.setDate(startCell.getDate() + i);
    const key = d.toLocaleDateString('en-CA');
    const inMonth = d.getMonth() === viewMonth.getMonth();
    const items = (byDay[key] || []).slice().sort((a, b) => a.publish_at.localeCompare(b.publish_at));
    const isToday = key === todayKey;
    const isPast = key < todayKey;   // geçmiş gün → üzerine büyük X
    // Özet: türe göre renkli noktalar (en çok 6) + sayı
    const dots = items.slice(0, 6).map((p) => `<span class="pl-dot" style="background:${FMT[classify(p)].color}"></span>`).join('');
    const more = items.length > 6 ? `<span class="pl-dot-more">+${items.length - 6}</span>` : '';
    const summary = items.length
      ? `<div class="pl-cell-sum"><div class="pl-dots">${dots}${more}</div><span class="pl-cnt">${items.length} gönderi</span></div>`
      : '';
    const xmark = (isPast && inMonth) ? '<span class="pl-x" aria-hidden="true">✕</span>' : '';
    html += `<button class="pl-cell${inMonth ? '' : ' out'}${isToday ? ' today' : ''}${isPast ? ' past' : ''}${items.length ? ' has' : ''}"${items.length ? ` data-day="${key}"` : ' disabled'}>
      <span class="pl-cell-d">${d.getDate()}</span>${summary}${xmark}</button>`;
  }
  $('#plGrid').innerHTML = html;
}

// Gün detayı — o günün gönderilerini drawer'da listele
function openDay(key) {
  const items = (byDay[key] || []).slice().sort((a, b) => a.publish_at.localeCompare(b.publish_at));
  if (!items.length) return;
  // Gün özeti: kaç carousel · kaç görsel (toplam foto) · kaç hikaye
  const carousels = items.filter((p) => p.format === 'carousel');
  const stories = items.filter((p) => p.format === 'story');
  const feed = items.filter((p) => p.format !== 'story');
  const totalImgs = feed.reduce((n, p) => n + ((p.images || []).length), 0);
  const summary = `<div class="pl-day-sum">
    <span class="pl-day-sm"><b>${carousels.length}</b> carousel</span>
    <span class="pl-day-sm"><b>${totalImgs}</b> görsel</span>
    <span class="pl-day-sm"><b>${stories.length}</b> hikaye</span>
  </div>`;
  $('#plDrawerTitle').innerHTML = `<span class="pl-day-title">${esc(fmtDay(items[0].publish_at))}</span>`;
  $('#plDrawerBody').innerHTML = summary + `<div class="pl-day-list">${items.map((p) => {
    const kind = classify(p); const f = FMT[kind]; const thumb = (p.images && p.images[0]) || '';
    return `<button class="pl-day-row" data-id="${esc(p.id)}">
      <span class="pl-day-th"${thumb ? ` style="background-image:url('${esc(thumb)}')"` : ''}></span>
      <span class="pl-day-mid"><span class="pl-day-time">${esc(fmtTime(p.publish_at))}</span><span class="pl-day-tx">${esc(labelOf(p, kind))}</span></span>
      <span class="pl-arow-tag" style="background:${f.soft};color:${f.color}">${f.icon} ${f.label}</span></button>`;
  }).join('')}</div>`;
  $('#plDrawerBody').querySelectorAll('[data-id]').forEach((b) => b.onclick = () => { const p = items.find((x) => x.id === b.dataset.id); if (p) openPostDrawer(p, refresh); });
  $('#plDrawer').classList.add('open');
}

async function refresh() { await load(); renderMonth(); }

initAuth(async () => {
  wirePostDrawer();
  renderLegend();
  $('#plPrev').onclick = () => { viewMonth.setMonth(viewMonth.getMonth() - 1); renderMonth(); };
  $('#plNext').onclick = () => { viewMonth.setMonth(viewMonth.getMonth() + 1); renderMonth(); };
  $('#plToday').onclick = () => { viewMonth = startOfMonth(new Date()); renderMonth(); };
  $('#plGrid').addEventListener('click', (e) => { const c = e.target.closest('[data-day]'); if (c) openDay(c.dataset.day); });
  await load();
  if (posts.length) viewMonth = startOfMonth(new Date(posts.find((p) => new Date(p.publish_at) >= new Date()) ? posts.find((p) => new Date(p.publish_at) >= new Date()).publish_at : posts[0].publish_at));
  renderMonth();
});
