// Selected Global — Gönderiler (liste/ajanda)
import { initAuth, supabase, toast, classify, FMT, ST, fmtTime, fmtDay, dayKey, esc, openPostDrawer, wirePostDrawer } from './planner-common.js?v=142';

const $ = (s) => document.querySelector(s);
let posts = [];
let filter = 'all';
let showPast = false;

function chipLabel(p, kind) {
  if (kind === 'egitici') return 'Eğitici seri';
  if (kind === 'story') return 'Story';
  return (p.caption || '').split('\n')[0].trim() || 'Daire';
}

async function load() {
  const { data, error } = await supabase.from('scheduled_posts').select('*').order('publish_at', { ascending: true });
  if (error) { toast('Yüklenemedi: ' + error.message, 'err'); return; }
  posts = data || [];
}

function counts() {
  const c = { all: 0, daire: 0, egitici: 0, story: 0 };
  const now = Date.now();
  posts.forEach((p) => { if (!showPast && new Date(p.publish_at).getTime() < now) return; c.all++; c[classify(p)]++; });
  $('#gdcAll').textContent = c.all; $('#gdcDaire').textContent = c.daire; $('#gdcEgitici').textContent = c.egitici; $('#gdcStory').textContent = c.story;
}

function render() {
  counts();
  const now = Date.now();
  let list = posts.filter((p) => (showPast || new Date(p.publish_at).getTime() >= now) && (filter === 'all' || classify(p) === filter));
  if (!list.length) { $('#plAgenda').innerHTML = '<div class="pl-empty">Bu filtrede gönderi yok. <a href="otomasyon.html">Otomasyon</a> ile plan oluştur.</div>'; return; }
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
        return `<button class="pl-arow" data-id="${esc(p.id)}">
          <span class="pl-arow-th"${thumb ? ` style="background-image:url('${esc(thumb)}')"` : ''}></span>
          <span class="pl-arow-time">${esc(fmtTime(p.publish_at))}</span>
          <span class="pl-arow-tag" style="background:${f.soft};color:${f.color}">${f.icon} ${f.label}</span>
          <span class="pl-arow-tx">${esc(chipLabel(p, kind))}</span>
          <span class="pl-badge ${st.cls}">${st.label}</span></button>`;
      }).join('')}</div></div>`;
  }).join('');
}

async function refresh() { await load(); render(); }

initAuth(async () => {
  wirePostDrawer();
  $('#gdFilters').addEventListener('click', (e) => { const b = e.target.closest('button[data-f]'); if (!b) return; filter = b.dataset.f; document.querySelectorAll('#gdFilters button').forEach((x) => x.classList.toggle('active', x === b)); render(); });
  $('#gdPast').addEventListener('change', (e) => { showPast = e.target.checked; render(); });
  $('#plAgenda').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) { const p = posts.find((x) => x.id === b.dataset.id); if (p) openPostDrawer(p, refresh); } });
  await refresh();
});
