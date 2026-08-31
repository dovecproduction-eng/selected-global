// Selected Global — Otomasyon (kampanya oluşturucu)
import { initAuth, supabase, toast, currentEmail } from './planner-common.js?v=128';
import { SUPABASE_URL, CURRENCY } from './config.js?v=128';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const AUTO = `${SUPABASE_URL}/storage/v1/object/public/property-images/_ig/auto`;
const SYM = CURRENCY;
const isCommon = (u) => u.includes('/_ortak/');

const DCAPS = [
  "{TITLE}\n\n📍 {BOLGE}{FIYAT}\nDetaylı bilgi ve tüm fotoğraflar için DM 📩",
  "{TITLE}\n\n📍 {BOLGE}{FIYAT}\nYerinde görmek ve bilgi için bize yazın 📩",
  "{TITLE}\n\n📍 {BOLGE}{FIYAT}\nSana özel sunum için DM 📩",
];
const DTAGS = "\n\n#selectedglobal #kuzeykıbrıs #kktc #northcyprus #cyprusrealestate #kıbrısemlak #satılıkdaire #gayrimenkul";
const ECAPS = [
  "Kuzey Kıbrıs'ta akıllı yatırımın adresi: Selected Global. Kaydır ➡️\n\nDetaylı bilgi ve portföy için DM 📩",
  "Akdeniz'in yükselen yıldızı Kuzey Kıbrıs'ta fırsatları kaçırma. Kaydır ➡️\n\nSana özel portföy için DM 📩",
  "Doğru yatırım, doğru rehber. Selected Global ile Kuzey Kıbrıs. Kaydır ➡️\n\nBilgi için DM 📩",
  "Hayalindeki ev ya da kârlı yatırım — Kuzey Kıbrıs'ta seni bekliyor. Kaydır ➡️\n\nDetaylar için DM 📩",
  "Selected Global ayrıcalığıyla Kuzey Kıbrıs gayrimenkulü. Kaydır ➡️\n\nÜcretsiz danışmanlık için DM 📩",
];
const ETAGS = "\n\n#selectedglobal #kuzeykıbrıs #kktc #northcyprus #cyprusrealestate #kıbrısemlak #yatırım #investment #gayrimenkul";
const DEFAULT_TIMES = ['13:00', '19:00', '16:00', '11:00', '21:00', '12:30'];

let dairePosts = [];        // { images, caption }
let daireTimes = ['13:00', '19:00'];

/* ---------- veri ---------- */
function daireImages(p) {
  const arr = p.fotograflar || []; const own = arr.filter((u) => !isCommon(u));
  const ki = Math.min(p.kapak_index || 0, arr.length - 1);
  const cover = own.length ? (isCommon(arr[ki]) ? own[0] : arr[ki]) : arr[0];
  const seen = new Set(); const out = [];
  for (const u of [cover, ...own, ...arr]) { if (u && !seen.has(u)) { seen.add(u); out.push(u); } if (out.length >= 10) break; }
  return out;
}
async function loadDaireler() {
  const { data, error } = await supabase.from('properties').select('id,baslik,tip,bolge,fiyat,para_birimi,kapak_index,fotograflar,created_at').order('created_at', { ascending: false });
  if (error) { toast('Daireler yüklenemedi', 'err'); return; }
  dairePosts = (data || []).map((p) => {
    const imgs = daireImages(p);
    if (imgs.length < 2) return null;
    const title = (p.baslik || 'Selected Global').split('\n')[0];
    const fiyat = p.fiyat ? ` · ${(SYM[p.para_birimi] || '')}${Number(p.fiyat).toLocaleString('tr-TR')}` : '';
    return { images: imgs, title, bolge: p.bolge || 'Kuzey Kıbrıs', fiyat };
  }).filter(Boolean);
  $('#auDaireCount').textContent = dairePosts.length;
}

/* ---------- plan hesabı ---------- */
function addDays(dstr, n) { const d = new Date(dstr + 'T00:00:00'); d.setDate(d.getDate() + n); const p = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function iso(dstr, time, addMin = 0) { const d = new Date(`${dstr}T${time}:00`); if (addMin) d.setMinutes(d.getMinutes() + addMin); return d.toISOString(); }

function computePlan() {
  const start = $('#auStart').value; if (!start) return { rows: [], daire: 0, edu: 0, story: 0 };
  const useDaire = $('#auUseDaire').checked, useEdu = $('#auUseEdu').checked;
  const perDay = Math.max(1, +$('#auDairePerDay').value || 2);
  const every = Math.max(1, +$('#auEduEvery').value || 3);
  const eduTime = $('#auEduTime').value || '10:00';
  const eduStory = $('#auEduStory').checked;
  const rows = []; let daire = 0, edu = 0, story = 0;

  if (useDaire) {
    dairePosts.forEach((dp, k) => {
      const day = Math.floor(k / perDay), slot = k % perDay;
      const time = daireTimes[slot] || daireTimes[0];
      const cap = DCAPS[k % DCAPS.length].replace('{TITLE}', dp.title).replace('{BOLGE}', dp.bolge).replace('{FIYAT}', dp.fiyat) + DTAGS;
      rows.push({ format: 'carousel', images: dp.images, video_url: null, caption: cap, publish_at: iso(addDays(start, day), time), status: 'pending', created_by: currentEmail() });
      daire++;
    });
  }
  if (useEdu) {
    for (let e = 0; e < 20; e++) {
      const C = 'C' + String(e + 1).padStart(2, '0');
      const feed = []; for (let s = 1; s <= 7; s++) feed.push(`${AUTO}/${C}_feed_${s}.jpg`);
      const day = e * every;
      rows.push({ format: 'carousel', images: feed, video_url: null, caption: ECAPS[e % ECAPS.length] + ETAGS, publish_at: iso(addDays(start, day), eduTime), status: 'pending', created_by: currentEmail() });
      edu++;
      if (eduStory) { rows.push({ format: 'story', images: [`${AUTO}/${C}_story_1.jpg`], video_url: null, caption: '', publish_at: iso(addDays(start, day), eduTime, 12), status: 'pending', created_by: currentEmail() }); story++; }
    }
  }
  rows.sort((a, b) => a.publish_at.localeCompare(b.publish_at));
  return { rows, daire, edu, story };
}

/* ---------- önizleme ---------- */
const fmtD = (iso) => new Date(iso).toLocaleDateString('tr-TR', { timeZone: 'Europe/Nicosia', day: 'numeric', month: 'long' });
const fmtT = (iso) => new Date(iso).toLocaleTimeString('tr-TR', { timeZone: 'Europe/Nicosia', hour: '2-digit', minute: '2-digit' });
const dayK = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' });

function renderPreview() {
  const { rows, daire, edu, story } = computePlan();
  $('#auSum').innerHTML = [
    ['🏠', daire, 'daire'], ['📚', edu, 'eğitici'], ['⚡', story, 'story'],
  ].map(([i, n, l]) => `<div class="au-sum-cell"><span class="au-sum-n">${n}</span><span class="au-sum-l">${i} ${l}</span></div>`).join('')
    + `<div class="au-sum-cell total"><span class="au-sum-n">${rows.length}</span><span class="au-sum-l">toplam</span></div>`;
  if (!rows.length) { $('#auRange').textContent = 'Kaynak/başlangıç seç.'; $('#auMini').innerHTML = ''; return; }
  $('#auRange').innerHTML = `<b>${fmtD(rows[0].publish_at)}</b> → <b>${fmtD(rows[rows.length - 1].publish_at)}</b>`;
  // ilk 4 gün
  const byDay = {}; rows.forEach((r) => { (byDay[dayK(r.publish_at)] = byDay[dayK(r.publish_at)] || []).push(r); });
  const days = Object.keys(byDay).sort().slice(0, 4);
  $('#auMini').innerHTML = days.map((k) => {
    const items = byDay[k].sort((a, b) => a.publish_at.localeCompare(b.publish_at));
    return `<div class="au-mini-day"><span class="au-mini-date">${fmtD(items[0].publish_at)}</span>${items.map((r) => {
      const kind = r.format === 'story' ? '⚡' : (r.images[0].includes('/_ig/auto/') ? '📚' : '🏠');
      return `<span class="au-mini-chip">${fmtT(r.publish_at)} ${kind}</span>`;
    }).join('')}</div>`;
  }).join('');
}

/* ---------- saat girişleri ---------- */
function renderDaireTimes() {
  const per = Math.max(1, +$('#auDairePerDay').value || 2);
  while (daireTimes.length < per) daireTimes.push(DEFAULT_TIMES[daireTimes.length] || '15:00');
  daireTimes = daireTimes.slice(0, per);
  $('#auDaireTimes').innerHTML = daireTimes.map((t, i) => `<input type="time" data-ti="${i}" value="${t}" />`).join('');
  $('#auDaireTimes').querySelectorAll('input').forEach((inp) => inp.oninput = () => { daireTimes[+inp.dataset.ti] = inp.value; renderPreview(); });
}

/* ---------- oluştur ---------- */
async function generate() {
  const { rows } = computePlan();
  if (!rows.length) { toast('Önce kaynak ve başlangıç seç', 'err'); return; }
  const clear = $('#auClear').checked;
  if (!confirm(`${rows.length} gönderi zamanlanacak${clear ? ' (mevcut plan silinerek)' : ''}.\nHiçbiri hemen yayınlanmaz. Onaylıyor musun?`)) return;
  const btn = $('#auGenerate'); const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = 'Oluşturuluyor…';
  try {
    if (clear) {
      const { error: de } = await supabase.from('scheduled_posts').delete().eq('status', 'pending');
      if (de) throw de;
    }
    // parça parça ekle (büyük insert'i böl)
    for (let i = 0; i < rows.length; i += 40) {
      const { error } = await supabase.from('scheduled_posts').insert(rows.slice(i, i + 40));
      if (error) throw error;
    }
    $('#auResult').classList.remove('hidden');
    $('#auResult').innerHTML = `<div class="au-ok">✓ <b>${rows.length} gönderi</b> zamanlandı.<br><span>İlk yayın ${fmtD(rows[0].publish_at)} ${fmtT(rows[0].publish_at)} — son ${fmtD(rows[rows.length - 1].publish_at)}.</span><a class="btn btn-primary btn-block" href="takvim.html" style="margin-top:14px">🗓️ Takvimde Gör</a></div>`;
    toast('Plan oluşturuldu 🎉', 'ok');
  } catch (e) { toast('Hata: ' + (e.message || e), 'err'); }
  btn.disabled = false; btn.innerHTML = orig;
}

/* ---------- akış ---------- */
function toggleSourceFields() {
  const d = $('#auUseDaire').checked, e = $('#auUseEdu').checked;
  document.querySelectorAll('[data-for="daire"]').forEach((x) => x.classList.toggle('off', !d));
  document.querySelectorAll('[data-for="edu"]').forEach((x) => x.classList.toggle('off', !e));
}

initAuth(async () => {
  // varsayılan başlangıç: yarın
  const t = new Date(); t.setDate(t.getDate() + 1); const p = (x) => String(x).padStart(2, '0');
  $('#auStart').value = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
  renderDaireTimes();
  await loadDaireler();
  ['auUseDaire', 'auUseEdu', 'auDairePerDay', 'auEduEvery', 'auEduTime', 'auEduStory', 'auStart', 'auClear'].forEach((id) =>
    $('#' + id).addEventListener('input', () => { if (id === 'auDairePerDay') renderDaireTimes(); if (id === 'auUseDaire' || id === 'auUseEdu') toggleSourceFields(); renderPreview(); }));
  $('#auGenerate').addEventListener('click', generate);
  toggleSourceFields(); renderPreview();
});
