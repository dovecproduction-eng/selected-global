// Selected Global — Otomasyon (kampanya oluşturucu)
import { initAuth, supabase, toast, currentEmail } from './planner-common.js?v=139';
import { SUPABASE_URL, CURRENCY, STORAGE_BUCKET } from './config.js?v=139';
import { renderCoverImage } from './ui.js?v=139';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const AUTO = `${SUPABASE_URL}/storage/v1/object/public/property-images/_ig/auto`;
const SYM = CURRENCY;
const isCommon = (u) => u.includes('/_ortak/');

/* ---------- markalama (kapak KARTI + 4:5 foto slaytları) ---------- */
let _logo = null; const _fitCache = {};
function _loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
async function brandFitted(rawUrl) {   // foto → 4:5 + altta ortada logo (feed)
  if (_fitCache[rawUrl]) return _fitCache[rawUrl];
  if (!_logo) { try { _logo = await _loadImg('assets/img/logo-white.svg'); } catch (_) { _logo = null; } }
  const W = 1080, H = 1350; const img = await _loadImg(rawUrl);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
  ctx.fillStyle = '#0A2540'; ctx.fillRect(0, 0, W, H);
  const s = Math.max(W / img.width, H / img.height); const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  if (_logo) {
    const ratio = (_logo.width ? _logo.height / _logo.width : 0.24) || 0.24;
    const lw = Math.min(W * 0.44, 500); const lh = lw * ratio; const gh = Math.round(H * 0.22);
    const g = ctx.createLinearGradient(0, H - gh, 0, H); g.addColorStop(0, 'rgba(10,37,64,0)'); g.addColorStop(1, 'rgba(10,37,64,0.6)');
    ctx.fillStyle = g; ctx.fillRect(0, H - gh, W, gh);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 24; ctx.drawImage(_logo, (W - lw) / 2, H - lh - Math.round(H * 0.05), lw, lh); ctx.restore();
  }
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92)); const url = URL.createObjectURL(blob); _fitCache[rawUrl] = url; return url;
}
async function uploadPublic(blob, ext) {
  const path = `_ig/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg' });
  if (error) throw new Error('Yükleme hatası: ' + error.message);
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
// Kapak KARTINDAN sonraki foto slaytları: kapak fotoğrafı + kendi fotoğraflar + en son 2 _ortak (max 9)
function buildPhotoSlides(p) {
  const all = (p.fotograflar || []).filter(Boolean); if (!all.length) return [];
  const ki = Math.min(Math.max(p.kapak_index || 0, 0), all.length - 1); const cover = all[ki];
  const own = all.filter((u) => !isCommon(u)); const auto = all.filter((u) => isCommon(u));
  const tail = [...new Set(auto.slice(-2))].filter((u) => u && u !== cover);
  let body = [...new Set([cover, ...own.filter((u) => u !== cover)])].filter((u) => u && !tail.includes(u));
  body = body.slice(0, Math.max(0, 9 - tail.length));
  return [...body, ...tail].slice(0, 9);
}
async function brandDaire(p) {   // → [kart, ...4:5 foto] (en fazla 10)
  const imgs = [];
  let card = null; try { card = await renderCoverImage(p); } catch (_) {}
  if (card) imgs.push(await uploadPublic(card, 'jpg'));
  const photos = buildPhotoSlides(p);
  for (const u of photos) { if (imgs.length >= 10) break; const f = await brandFitted(u); imgs.push(await uploadPublic(await (await fetch(f)).blob(), 'jpg')); }
  return imgs;
}

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
async function loadDaireler() {
  const { data, error } = await supabase.from('properties').select('id,baslik,tip,bolge,fiyat,para_birimi,kapak_index,fotograflar,oda_sayisi,esyali,konut_tipi,created_at').order('created_at', { ascending: false });
  if (error) { toast('Daireler yüklenemedi', 'err'); return; }
  dairePosts = (data || []).map((p) => {
    const photos = buildPhotoSlides(p);        // önizleme için ham foto listesi; asıl markalama oluşturma anında
    if (!photos.length) return null;
    const title = (p.baslik || 'Selected Global').split('\n')[0];
    const fiyat = p.fiyat ? ` · ${(SYM[p.para_birimi] || '')}${Number(p.fiyat).toLocaleString('tr-TR')}` : '';
    return { p, photos, title, bolge: p.bolge || 'Kuzey Kıbrıs', fiyat };
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
  const enStory = $('#auEnStory') ? $('#auEnStory').checked : false;
  const enGap = Math.max(1, +($('#auEnStoryGap') && $('#auEnStoryGap').value) || 5);
  const rows = []; let daire = 0, edu = 0, story = 0;

  if (useDaire) {
    dairePosts.forEach((dp, k) => {
      const day = Math.floor(k / perDay), slot = k % perDay;
      const time = daireTimes[slot] || daireTimes[0];
      const cap = DCAPS[k % DCAPS.length].replace('{TITLE}', dp.title).replace('{BOLGE}', dp.bolge).replace('{FIYAT}', dp.fiyat) + DTAGS;
      // images: önizlemede ham foto (kind=🏠 için); oluşturma anında markalanır (_prop)
      rows.push({ format: 'carousel', images: dp.photos, video_url: null, caption: cap, publish_at: iso(addDays(start, day), time), status: 'pending', created_by: currentEmail(), _prop: dp.p });
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
      if (eduStory) { const st = []; for (let s = 1; s <= 7; s++) st.push(`${AUTO}/${C}_story_${s}.webp`); rows.push({ format: 'story', images: st, video_url: null, caption: '', publish_at: iso(addDays(start, day), eduTime, 12), status: 'pending', created_by: currentEmail() }); story += 7; }
      if (enStory) { const en = []; for (let s = 1; s <= 7; s++) en.push(`${AUTO}/${C}_en_story_${s}.webp`); rows.push({ format: 'story', images: en, video_url: null, caption: '', publish_at: iso(addDays(start, day + enGap), eduTime, 12), status: 'pending', created_by: currentEmail() }); story += 7; }
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
    // 1) Daire gönderilerini markala (kapak KARTI + 4:5 foto slaytları). Silmeden ÖNCE yap ki hata olursa mevcut plan durmasın.
    const daireRows = rows.filter((r) => r._prop);
    let bi = 0;
    for (const r of rows) {
      if (!r._prop) continue;
      bi++; btn.innerHTML = `Görseller hazırlanıyor… (${bi}/${daireRows.length})`;
      try { const imgs = await brandDaire(r._prop); if (imgs.length) r.images = imgs; } catch (e) { console.error('markalama hatası', e); }
    }
    rows.forEach((r) => { delete r._prop; });   // DB'de olmayan alanı temizle
    btn.innerHTML = 'Kaydediliyor…';
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
  // varsayılan başlangıç: BUGÜN
  const t = new Date(); const p = (x) => String(x).padStart(2, '0');
  $('#auStart').value = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
  renderDaireTimes();
  await loadDaireler();
  ['auUseDaire', 'auUseEdu', 'auDairePerDay', 'auEduEvery', 'auEduTime', 'auEduStory', 'auEnStory', 'auEnStoryGap', 'auStart', 'auClear'].forEach((id) =>
    $('#' + id).addEventListener('input', () => { if (id === 'auDairePerDay') renderDaireTimes(); if (id === 'auUseDaire' || id === 'auUseEdu') toggleSourceFields(); renderPreview(); }));
  $('#auGenerate').addEventListener('click', generate);
  toggleSourceFields(); renderPreview();
});
