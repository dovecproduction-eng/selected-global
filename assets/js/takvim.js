// Selected Global — İçerik Takvimi
import { initAuth, supabase, toast, classify, FMT, ST, fmtTime, fmtDay, fmtFull, dayKey } from './planner-common.js?v=122';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WD = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

let posts = [];
let viewMonth = startOfMonth(new Date());
let curView = 'month';

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function chipLabel(p, kind) {
  if (kind === 'egitici') return 'Eğitici seri';
  if (kind === 'story') return 'Story';
  const first = (p.caption || '').split('\n')[0].trim();
  return first || 'Daire';
}

async function loadPosts() {
  const { data, error } = await supabase.from('scheduled_posts').select('*').order('publish_at', { ascending: true });
  if (error) { toast('Takvim yüklenemedi: ' + error.message, 'err'); return; }
  posts = data || [];
}

/* ---------- ÜST İSTATİSTİK ---------- */
function renderStats() {
  const now = Date.now();
  const upcoming = posts.filter((p) => p.status === 'pending' && new Date(p.publish_at).getTime() > now);
  const cnt = { daire: 0, egitici: 0, story: 0 };
  posts.forEach((p) => { cnt[classify(p)]++; });
  const next = upcoming[0];
  const tiles = [
    ['Toplam plan', posts.length, 'gönderi zamanlı'],
    ['Sıradaki', next ? fmtTime(next.publish_at) : '—', next ? fmtDay(next.publish_at) : 'plan yok'],
    ['🏠 Daire', cnt.daire, 'carousel'],
    ['📚 Eğitici', cnt.egitici, 'carousel'],
    ['⚡ Story', cnt.story, 'story'],
  ];
  $('#plStats').innerHTML = tiles.map(([k, v, s]) =>
    `<div class="pl-stat"><span class="pl-stat-n">${esc(String(v))}</span><span class="pl-stat-k">${esc(k)}</span><span class="pl-stat-s">${esc(s)}</span></div>`).join('');
}

function renderLegend() {
  $('#plLegend').innerHTML = Object.entries(FMT).map(([, f]) =>
    `<span class="pl-lg"><span class="pl-lg-dot" style="background:${f.color}"></span>${f.icon} ${f.label}</span>`).join('');
}

/* ---------- AY GÖRÜNÜMÜ ---------- */
function renderMonth() {
  $('#plMonthLabel').textContent = `${MONTHS[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
  $('#plWeekHead').innerHTML = WD.map((d) => `<span>${d}</span>`).join('');

  // KKTC gününe göre grupla
  const byDay = {};
  posts.forEach((p) => { (byDay[dayKey(p.publish_at)] = byDay[dayKey(p.publish_at)] || []).push(p); });

  const first = new Date(viewMonth);
  const lead = (first.getDay() + 6) % 7;              // Pazartesi başlangıç
  const startCell = new Date(first); startCell.setDate(1 - lead);
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' });

  let html = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(startCell); d.setDate(startCell.getDate() + i);
    const key = d.toLocaleDateString('en-CA');
    const inMonth = d.getMonth() === viewMonth.getMonth();
    const items = (byDay[key] || []).slice().sort((a, b) => a.publish_at.localeCompare(b.publish_at));
    const isToday = key === todayKey;
    const chips = items.map((p) => {
      const kind = classify(p); const f = FMT[kind];
      return `<button class="pl-chip" style="--c:${f.color};--cs:${f.soft}" data-id="${esc(p.id)}" title="${esc(fmtFull(p.publish_at))}">
        <b>${esc(fmtTime(p.publish_at))}</b><span class="pl-chip-ic">${f.icon}</span><span class="pl-chip-tx">${esc(chipLabel(p, kind))}</span></button>`;
    }).join('');
    html += `<div class="pl-cell${inMonth ? '' : ' out'}${isToday ? ' today' : ''}">
      <div class="pl-cell-d"><span>${d.getDate()}</span>${items.length ? `<em>${items.length}</em>` : ''}</div>
      <div class="pl-cell-body">${chips}</div></div>`;
  }
  $('#plGrid').innerHTML = html;
}

/* ---------- LİSTE (AJANDA) ---------- */
function renderList() {
  const now = Date.now();
  const list = posts.slice().sort((a, b) => a.publish_at.localeCompare(b.publish_at));
  if (!list.length) { $('#plAgenda').innerHTML = '<div class="pl-empty">Henüz plan yok. <a href="otomasyon.html">Otomasyon</a> ile oluştur.</div>'; return; }
  const byDay = {};
  list.forEach((p) => { (byDay[dayKey(p.publish_at)] = byDay[dayKey(p.publish_at)] || []).push(p); });
  $('#plAgenda').innerHTML = Object.keys(byDay).sort().map((key) => {
    const items = byDay[key];
    const past = new Date(items[0].publish_at).getTime() < now;
    return `<div class="pl-agrp${past ? ' past' : ''}">
      <div class="pl-agrp-d">${esc(fmtDay(items[0].publish_at))}<span>${items.length} gönderi</span></div>
      <div class="pl-agrp-items">${items.map((p) => {
        const kind = classify(p); const f = FMT[kind]; const st = ST[p.status] || ST.pending;
        const thumb = (p.images && p.images[0]) || '';
        return `<button class="pl-arow" data-id="${esc(p.id)}" style="--c:${f.color}">
          <span class="pl-arow-th"${thumb ? ` style="background-image:url('${esc(thumb)}')"` : ''}></span>
          <span class="pl-arow-time">${esc(fmtTime(p.publish_at))}</span>
          <span class="pl-arow-tag" style="background:${f.soft};color:${f.color}">${f.icon} ${f.label}</span>
          <span class="pl-arow-tx">${esc(chipLabel(p, kind))}</span>
          <span class="pl-badge ${st.cls}">${st.label}</span></button>`;
      }).join('')}</div></div>`;
  }).join('');
}

/* ---------- DETAY DRAWER ---------- */
function openDrawer(id) {
  const p = posts.find((x) => x.id === id); if (!p) return;
  const kind = classify(p); const f = FMT[kind]; const st = ST[p.status] || ST.pending;
  const imgs = p.images || [];
  const localVal = toLocalInput(p.publish_at);
  $('#plDrawerTitle').innerHTML = `<span class="pl-dtag" style="background:${f.soft};color:${f.color}">${f.icon} ${f.label}</span>`;
  $('#plDrawerBody').innerHTML = `
    <div class="pl-preview">${imgs[0] ? `<img src="${esc(imgs[0])}" alt="önizleme" />` : '<div class="pl-noimg">görsel yok</div>'}
      ${imgs.length > 1 ? `<span class="pl-preview-n">1 / ${imgs.length}</span>` : ''}</div>
    ${imgs.length > 1 ? `<div class="pl-thumbs">${imgs.map((u) => `<span style="background-image:url('${esc(u)}')"></span>`).join('')}</div>` : ''}
    <dl class="pl-meta">
      <div><dt>Yayın</dt><dd>${esc(fmtFull(p.publish_at))} <span class="text-muted">(KKTC)</span></dd></div>
      <div><dt>Durum</dt><dd><span class="pl-badge ${st.cls}">${st.label}</span>${p.result ? ` <span class="text-muted">— ${esc(String(p.result).slice(0, 120))}</span>` : ''}</dd></div>
      <div><dt>Biçim</dt><dd>${p.format === 'story' ? 'Story' : `Carousel · ${imgs.length} görsel`}</dd></div>
    </dl>
    ${p.caption ? `<div class="pl-capbox"><label>Caption</label><p>${esc(p.caption)}</p></div>` : ''}
    <div class="pl-resched">
      <label for="plReDate">Yeniden zamanla</label>
      <div class="pl-resched-row">
        <input type="datetime-local" id="plReDate" value="${esc(localVal)}" />
        <button class="btn btn-primary btn-sm" id="plReSave">Kaydet</button>
      </div>
    </div>
    <button class="btn btn-danger-o btn-block" id="plDelete">🗑 Planı sil</button>`;

  $('#plDelete').onclick = async () => {
    if (!confirm('Bu zamanlanmış gönderi silinsin mi? (Yayınlanmadan iptal edilir)')) return;
    const { error } = await supabase.from('scheduled_posts').delete().eq('id', p.id);
    if (error) { toast('Silinemedi: ' + error.message, 'err'); return; }
    toast('Plan silindi', 'ok'); closeDrawer(); await refresh();
  };
  $('#plReSave').onclick = async () => {
    const v = $('#plReDate').value; if (!v) { toast('Tarih seç', 'err'); return; }
    const iso = new Date(v).toISOString();
    const { error } = await supabase.from('scheduled_posts').update({ publish_at: iso }).eq('id', p.id);
    if (error) { toast('Güncellenemedi: ' + error.message, 'err'); return; }
    toast('Yeniden zamanlandı', 'ok'); closeDrawer(); await refresh();
  };
  $('#plDrawer').classList.add('open');
}
function closeDrawer() { $('#plDrawer').classList.remove('open'); }
// UTC ISO → tarayıcı yerel datetime-local değeri
function toLocalInput(iso) {
  const d = new Date(iso); const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ---------- AKIŞ ---------- */
function renderAll() { renderStats(); renderLegend(); if (curView === 'month') renderMonth(); else renderList(); }
async function refresh() { await loadPosts(); renderAll(); }

function setView(v) {
  curView = v;
  document.querySelectorAll('#plViewTabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  $('#plMonthView').classList.toggle('hidden', v !== 'month');
  $('#plListView').classList.toggle('hidden', v !== 'list');
  renderAll();
}

function wire() {
  $('#plPrev').onclick = () => { viewMonth.setMonth(viewMonth.getMonth() - 1); renderMonth(); };
  $('#plNext').onclick = () => { viewMonth.setMonth(viewMonth.getMonth() + 1); renderMonth(); };
  $('#plToday').onclick = () => { viewMonth = startOfMonth(new Date()); renderMonth(); };
  document.querySelectorAll('#plViewTabs button').forEach((b) => b.onclick = () => setView(b.dataset.view));
  $('#plGrid').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) openDrawer(b.dataset.id); });
  $('#plAgenda').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) openDrawer(b.dataset.id); });
  $('#plDrawerClose').onclick = closeDrawer;
  $('#plDrawer').addEventListener('click', (e) => { if (e.target === $('#plDrawer')) closeDrawer(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
}

initAuth(async () => {
  wire();
  // İlk plana denk gelen aya git
  await loadPosts();
  if (posts.length) viewMonth = startOfMonth(new Date(posts[0].publish_at));
  renderAll();
});
