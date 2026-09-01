// Selected Global — Takvim (sade, sadece ay görünümü)
import { initAuth, supabase, toast, classify, FMT, fmtTime, fmtDay, fmtFull, dayKey, esc, openPostDrawer, wirePostDrawer, currentEmail } from './planner-common.js?v=141';
import { renderCoverImage, pickTitle, regionDisplay } from './ui.js?v=141';
import { STORAGE_BUCKET, CURRENCY, SUPABASE_URL } from './config.js?v=141';

const $ = (s) => document.querySelector(s);
const AUTO = `${SUPABASE_URL}/storage/v1/object/public/property-images/_ig/auto`;

/* ---------- daire markalama (kapak KARTI + 4:5 foto — otomasyon ile aynı) ---------- */
const isCommon = (u) => String(u || '').includes('/_ortak/');
let _logo = null; const _fitCache = {};
function _loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
async function brandFitted(rawUrl) {
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
function buildPhotoSlides(p) {
  const all = (p.fotograflar || []).filter(Boolean); if (!all.length) return [];
  const ki = Math.min(Math.max(p.kapak_index || 0, 0), all.length - 1); const cover = all[ki];
  const own = all.filter((u) => !isCommon(u)); const auto = all.filter((u) => isCommon(u));
  const tail = [...new Set(auto.slice(-2))].filter((u) => u && u !== cover);
  let body = [...new Set([cover, ...own.filter((u) => u !== cover)])].filter((u) => u && !tail.includes(u));
  body = body.slice(0, Math.max(0, 9 - tail.length));
  return [...body, ...tail].slice(0, 9);
}
async function brandDaire(p) {
  const imgs = [];
  let card = null; try { card = await renderCoverImage(p); } catch (_) {}
  if (card) imgs.push(await uploadPublic(card, 'jpg'));
  const photos = buildPhotoSlides(p);
  for (const u of photos) { if (imgs.length >= 10) break; const f = await brandFitted(u); imgs.push(await uploadPublic(await (await fetch(f)).blob(), 'jpg')); }
  return imgs;
}
function daireCaption(p) {
  const fiyat = p.fiyat ? ` · ${(CURRENCY[p.para_birimi] || '')}${Number(p.fiyat).toLocaleString('tr-TR')}` : '';
  const title = (p.baslik || 'Selected Global').split('\n')[0];
  return `${title}\n\n📍 ${regionDisplay(p.bolge) || p.bolge || 'Kuzey Kıbrıs'}${fiyat}\nDetaylı bilgi ve tüm fotoğraflar için DM 📩\n\n#selectedglobal #kuzeykıbrıs #kktc #northcyprus #cyprusrealestate #kıbrısemlak #gayrimenkul`;
}

let daireList = [];   // hızlı ekleme için daireler
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
    // gönderi varsa → detay; boş & gelecek gün → hızlı ekle; geçmiş/ay dışı → pasif
    const act = items.length ? ` data-day="${key}"` : ((inMonth && !isPast) ? ` data-add="${key}"` : ' disabled');
    const plus = (!items.length && inMonth && !isPast) ? '<span class="pl-cell-plus">＋</span>' : '';
    html += `<button class="pl-cell${inMonth ? '' : ' out'}${isToday ? ' today' : ''}${isPast ? ' past' : ''}${items.length ? ' has' : ''}"${act}>
      <span class="pl-cell-d">${d.getDate()}</span>${summary}${plus}${xmark}</button>`;
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
  $('#plDrawerBody').innerHTML = summary + quickAddHtml(key) + `<div class="pl-day-list">${items.map((p) => {
    const kind = classify(p); const f = FMT[kind]; const thumb = (p.images && p.images[0]) || '';
    return `<button class="pl-day-row" data-id="${esc(p.id)}">
      <span class="pl-day-th"${thumb ? ` style="background-image:url('${esc(thumb)}')"` : ''}></span>
      <span class="pl-day-mid"><span class="pl-day-time">${esc(fmtTime(p.publish_at))}</span><span class="pl-day-tx">${esc(labelOf(p, kind))}</span></span>
      <span class="pl-arow-tag" style="background:${f.soft};color:${f.color}">${f.icon} ${f.label}</span></button>`;
  }).join('')}</div>`;
  wireQuickAdd(key);
  $('#plDrawerBody').querySelectorAll('[data-id]').forEach((b) => b.onclick = () => { const p = items.find((x) => x.id === b.dataset.id); if (p) openPostDrawer(p, refresh); });
  $('#plDrawer').classList.add('open');
}

// Boş güne de ekleyebilmek için: içinde gönderi olmayan günü aç (sadece hızlı-ekle paneli)
function openEmptyDay(key) {
  $('#plDrawerTitle').innerHTML = `<span class="pl-day-title">${esc(fmtDay(key + 'T12:00'))}</span>`;
  $('#plDrawerBody').innerHTML = `<p class="pl-day-empty">Bu güne planlı gönderi yok.</p>` + quickAddHtml(key);
  wireQuickAdd(key);
  $('#plDrawer').classList.add('open');
}

/* ---------- HIZLI EKLE (takvim içinde, siteye gitmeden) ---------- */
function quickAddHtml(key) {
  const daireOpts = daireList.map((p) => `<option value="${esc(p.id)}">${esc((p.baslik || 'Daire').split('\n')[0].slice(0, 48))} — ${esc(regionDisplay(p.bolge) || p.bolge || '')}</option>`).join('');
  const seriOpts = Array.from({ length: 20 }, (_, i) => { const C = 'C' + String(i + 1).padStart(2, '0'); return `<option value="${C}">Eğitici seri ${C}</option>`; }).join('');
  return `<div class="pl-qa">
    <div class="pl-qa-tabs">
      <button type="button" data-qa="daire" class="active">🏠 Daire carousel</button>
      <button type="button" data-qa="story">⚡ Eğitici story</button>
    </div>
    <div class="pl-qa-pane" data-pane="daire"><select id="qaDaire"><option value="">Daire seç…</option>${daireOpts}</select></div>
    <div class="pl-qa-pane hidden" data-pane="story"><div class="pl-qa-2"><select id="qaSeri">${seriOpts}</select><select id="qaLang"><option value="tr">🇹🇷 Türkçe</option><option value="en">🇬🇧 İngilizce</option></select></div></div>
    <div class="pl-qa-row"><input type="time" id="qaTime" value="12:00" /><button class="btn btn-gold" id="qaGo">🕒 Bu güne zamanla</button></div>
    <div id="qaMsg" class="pl-qa-msg"></div>
    <a class="pl-qa-site" href="paylas.html?date=${encodeURIComponent(key)}">Yeni Gönderi sayfasında hazırla ↗</a>
  </div>`;
}
function wireQuickAdd(key) {
  let tab = 'daire';
  $('#plDrawerBody').querySelectorAll('[data-qa]').forEach((b) => b.onclick = () => {
    tab = b.dataset.qa;
    $('#plDrawerBody').querySelectorAll('[data-qa]').forEach((x) => x.classList.toggle('active', x === b));
    $('#plDrawerBody').querySelectorAll('[data-pane]').forEach((p) => p.classList.toggle('hidden', p.dataset.pane !== tab));
  });
  $('#qaGo').onclick = () => quickAdd(key, tab);
}
async function quickAdd(key, tab) {
  const msg = (t, e) => { const m = $('#qaMsg'); if (m) { m.textContent = t; m.className = 'pl-qa-msg' + (e ? ' err' : ''); } };
  const time = $('#qaTime').value || '12:00';
  const when = new Date(`${key}T${time}:00`);
  const go = $('#qaGo'); const orig = go.textContent; go.disabled = true;
  try {
    let row;
    if (tab === 'daire') {
      const p = daireList.find((x) => x.id === $('#qaDaire').value);
      if (!p) { msg('Önce daire seç', true); go.disabled = false; return; }
      go.textContent = 'Hazırlanıyor…'; msg('Kapak kartı + fotoğraflar hazırlanıyor…');
      const images = await brandDaire(p);
      if (images.length < 2) { msg('Bu dairede yeterli fotoğraf yok', true); go.disabled = false; go.textContent = orig; return; }
      row = { format: 'carousel', images, video_url: null, caption: daireCaption(p), publish_at: when.toISOString(), status: 'pending', created_by: currentEmail() };
    } else {
      const C = $('#qaSeri').value; const lang = $('#qaLang').value;
      const images = Array.from({ length: 7 }, (_, i) => lang === 'en' ? `${AUTO}/${C}_en_story_${i + 1}.webp` : `${AUTO}/${C}_story_${i + 1}.webp`);
      row = { format: 'story', images, video_url: null, caption: '', publish_at: when.toISOString(), status: 'pending', created_by: currentEmail() };
    }
    go.textContent = 'Kaydediliyor…';
    const { error } = await supabase.from('scheduled_posts').insert(row);
    if (error) throw error;
    toast('Gönderi bu güne eklendi 🎉', 'ok');
    $('#plDrawer').classList.remove('open');
    await refresh();
  } catch (e) { msg('Hata: ' + (e.message || e), true); go.disabled = false; go.textContent = orig; }
}
async function loadDaireList() {
  const { data } = await supabase.from('properties').select('id,baslik,tip,bolge,fiyat,para_birimi,kapak_index,fotograflar,oda_sayisi,esyali,konut_tipi').order('created_at', { ascending: false });
  daireList = (data || []).filter((p) => (p.fotograflar || []).length);
}

async function refresh() { await load(); renderMonth(); }

initAuth(async () => {
  wirePostDrawer();
  renderLegend();
  $('#plPrev').onclick = () => { viewMonth.setMonth(viewMonth.getMonth() - 1); renderMonth(); };
  $('#plNext').onclick = () => { viewMonth.setMonth(viewMonth.getMonth() + 1); renderMonth(); };
  $('#plToday').onclick = () => { viewMonth = startOfMonth(new Date()); renderMonth(); };
  $('#plGrid').addEventListener('click', (e) => { const c = e.target.closest('[data-day]'); if (c) { openDay(c.dataset.day); return; } const a = e.target.closest('[data-add]'); if (a) openEmptyDay(a.dataset.add); });
  await Promise.all([load(), loadDaireList()]);
  if (posts.length) viewMonth = startOfMonth(new Date(posts.find((p) => new Date(p.publish_at) >= new Date()) ? posts.find((p) => new Date(p.publish_at) >= new Date()).publish_at : posts[0].publish_at));
  renderMonth();
});
