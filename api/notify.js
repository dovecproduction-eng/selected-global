// Selected Global — E-posta bildirimleri (Resend). Ayarlar Supabase app_config'te (env'e de düşer).
// Uçlar: ?action=send (POST) | activity (Supabase webhook) | daily (pg_cron GET)
const SUP = process.env.SUPABASE_URL || 'https://kimwdxymgdnkvivbvmtk.supabase.co';
const SKEY = process.env.SUPABASE_SERVICE_KEY;
const TZ = 'Europe/Nicosia';

// Config: önce app_config tablosu, yoksa env
let _cfg = null;
async function loadCfg() {
  if (_cfg) return _cfg;
  _cfg = {};
  try {
    const r = await fetch(`${SUP}/rest/v1/app_config?select=key,value`, { headers: { apikey: SKEY, Authorization: `Bearer ${SKEY}` } });
    const rows = await r.json(); if (Array.isArray(rows)) rows.forEach((x) => { _cfg[x.key] = x.value; });
  } catch (_) { /* tablo yoksa env'e düş */ }
  const g = (k) => _cfg[k] || process.env[k] || null;
  _cfg = {
    RESEND: g('RESEND_API_KEY'),
    SECRET: g('NOTIFY_SECRET'),
    TO: (g('NOTIFY_TO') || 'dovecproduction@gmail.com').split(',').map((s) => s.trim()).filter(Boolean),
    FROM: g('NOTIFY_FROM') || 'Selected Global <onboarding@resend.dev>',
  };
  return _cfg;
}

async function sendMail(subject, innerHtml) {
  const c = await loadCfg();
  if (!c.RESEND) return { ok: false, error: 'RESEND_API_KEY tanımlı değil (app_config veya env)' };
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${c.RESEND}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: c.FROM, to: c.TO, subject, html: shell(subject, innerHtml) }),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, detail: j };
}
function shell(title, body) {
  return `<div style="margin:0;padding:24px;background:#F6F8FB;font-family:-apple-system,Segoe UI,Manrope,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5EAF0;border-radius:16px;overflow:hidden">
    <div style="background:#0A2540;padding:20px 26px"><span style="color:#fff;font-weight:800;letter-spacing:.04em">SELECTED<span style="color:#B8924A"> · </span>GLOBAL</span></div>
    <div style="padding:26px">${body}</div>
    <div style="padding:16px 26px;border-top:1px solid #EFF3F8;color:#8A97A6;font-size:12px">Selected Global · Instagram otomasyonu · otomatik bildirim</div>
  </div></div>`;
}
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const fmtT = (iso) => new Date(iso).toLocaleString('tr-TR', { timeZone: TZ, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const kindOf = (p) => p.format === 'story' ? '⚡ Story' : (((p.images || [])[0] || '').includes('/_ig/auto/') ? '📚 Eğitici carousel' : '🏠 Daire carousel');
function h(t, sub) { return `<h1 style="margin:0 0 6px;font-size:20px;color:#0A2540">${esc(t)}</h1>${sub ? `<p style="margin:0 0 18px;color:#5B6B7B;font-size:14px">${esc(sub)}</p>` : ''}`; }
function row(k, v) { return `<tr><td style="padding:6px 0;color:#8A97A6;font-size:13px;width:120px">${esc(k)}</td><td style="padding:6px 0;color:#0A2540;font-size:14px;font-weight:600">${v}</td></tr>`; }

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } }); });
}
async function authed(req) {
  const c = await loadCfg(); const s = c.SECRET; if (!s) return true;
  const hdr = req.headers['x-notify-secret'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const key = (req.query && req.query.key) || '';
  return hdr === s || key === s;
}

const ACTS = { create: 'Ekledi', update: 'Düzenledi', delete: 'Sildi', price_change: 'Fiyat değiştirdi', photo_add: 'Fotoğraf ekledi', photo_download: 'Fotoğraf indirdi', portfolio_create: 'Portföy oluşturdu', media_create: 'Instagram gönderisi', excel: 'Excel işlemi' };

// Türkiye + KKTC önemli günler (yıllık; dini bayramlar 2026 yaklaşık — her yıl güncellenebilir)
const IMPORTANT = [
  { md: '01-01', name: 'Yılbaşı', tag: 'TR·KKTC' },
  { md: '02-14', name: 'Sevgililer Günü', tag: 'Pazarlama' },
  { md: '03-18', name: 'Çanakkale Zaferi ve Şehitleri Anma', tag: 'TR' },
  { md: '03-20', name: 'Ramazan Bayramı (yaklaşık)', tag: 'Dini' },
  { md: '04-23', name: 'Ulusal Egemenlik ve Çocuk Bayramı', tag: 'TR' },
  { md: '05-01', name: 'Emek ve Dayanışma Günü', tag: 'TR·KKTC' },
  { md: '05-10', name: 'Anneler Günü', tag: 'Pazarlama' },
  { md: '05-19', name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", tag: 'TR' },
  { md: '05-26', name: 'Kurban Bayramı (yaklaşık)', tag: 'Dini' },
  { md: '06-21', name: 'Babalar Günü', tag: 'Pazarlama' },
  { md: '07-15', name: 'Demokrasi ve Milli Birlik Günü', tag: 'TR' },
  { md: '07-20', name: 'Barış ve Özgürlük Bayramı', tag: 'KKTC' },
  { md: '08-01', name: 'Toplumsal Direniş Bayramı', tag: 'KKTC' },
  { md: '08-30', name: 'Zafer Bayramı', tag: 'TR' },
  { md: '10-29', name: 'Cumhuriyet Bayramı', tag: 'TR' },
  { md: '11-10', name: "Atatürk'ü Anma Günü (10 Kasım)", tag: 'TR' },
  { md: '11-15', name: 'KKTC Cumhuriyet Bayramı', tag: 'KKTC' },
  { md: '11-24', name: 'Öğretmenler Günü', tag: 'TR' },
  { md: '12-31', name: 'Yılbaşı Gecesi', tag: 'Pazarlama' },
];
// Bir MM-DD için bugünden itibaren bir sonraki gerçekleşme (KKTC) ve kaç gün kaldığı
function nextOcc(md) {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const y = +nowStr.slice(0, 4);
  let d = new Date(`${y}-${md}T12:00:00`);
  const todayNoon = new Date(`${nowStr}T12:00:00`);
  if (d < todayNoon) d = new Date(`${y + 1}-${md}T12:00:00`);
  const days = Math.round((d - todayNoon) / 86400000);
  return { date: d, days };
}
const fDayName = (d) => d.toLocaleDateString('tr-TR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const SH = () => ({ apikey: SKEY, Authorization: `Bearer ${SKEY}` });

async function planHtml() {
  const sp = await (await fetch(`${SUP}/rest/v1/scheduled_posts?select=format,images,caption,publish_at&status=eq.pending&order=publish_at.asc`, { headers: SH() })).json();
  if (!Array.isArray(sp) || !sp.length) return '<p style="color:#8A97A6;font-size:13px">Zamanlı gönderi yok.</p>';
  const dayK = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
  const fMonth = (iso) => new Date(iso).toLocaleDateString('tr-TR', { timeZone: TZ, month: 'long', year: 'numeric' });
  const fD = (iso) => new Date(iso).toLocaleDateString('tr-TR', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'long' });
  const lbl = (p) => { const k = kindOf(p); return k.includes('Daire') ? ((p.caption || '').split('\n')[0].slice(0, 38) || 'Daire') : k; };
  const byMon = {}; sp.forEach((p) => { (byMon[dayK(p.publish_at).slice(0, 7)] = byMon[dayK(p.publish_at).slice(0, 7)] || []).push(p); });
  let html = '';
  for (const mk of Object.keys(byMon).sort()) {
    const items = byMon[mk];
    html += `<div style="background:#0A2540;color:#fff;border-radius:8px;padding:8px 12px;margin:16px 0 8px"><b>${fMonth(items[0].publish_at)}</b> <span style="opacity:.7;font-size:12px">· ${items.length} gönderi</span></div>`;
    const byDay = {}; items.forEach((p) => { (byDay[dayK(p.publish_at)] = byDay[dayK(p.publish_at)] || []).push(p); });
    for (const dk of Object.keys(byDay).sort()) { const its = byDay[dk];
      html += `<div style="font-size:12.5px;padding:4px 0 1px;border-top:1px solid #EFF3F8"><b style="color:#0A2540">${fD(its[0].publish_at)}</b></div>`;
      for (const p of its) html += `<div style="font-size:12px;padding:1px 0 1px 6px;color:#5B6B7B"><b style="color:#8A97A6;display:inline-block;width:42px">${fmtT(p.publish_at)}</b> ${kindOf(p)} — ${esc(lbl(p))}</div>`;
    }
  }
  return html;
}
async function jannaHtml() {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const acts = await (await fetch(`${SUP}/rest/v1/activity_log?select=actor_name,action,entity_ref,created_at&created_at=gte.${since}&order=created_at.desc`, { headers: SH() })).json();
  if (!Array.isArray(acts)) return null;
  const j = acts.filter((a) => /janna/i.test(a.actor_name || ''));
  if (!j.length) return null;
  return j.map((a) => `<div style="font-size:13px;padding:4px 0;border-top:1px solid #EFF3F8;color:#0A2540">• <b>${esc(ACTS[a.action] || a.action)}</b>${a.entity_ref ? ' — ' + esc(a.entity_ref) : ''} <span style="color:#8A97A6;font-size:12px">(${fmtT(a.created_at)})</span></div>`).join('');
}
async function publishedHtml() {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const pub = await (await fetch(`${SUP}/rest/v1/scheduled_posts?select=format,images,publish_at&status=eq.published&publish_at=gte.${since}&order=publish_at.desc`, { headers: SH() })).json();
  if (!Array.isArray(pub) || !pub.length) return null;
  return pub.map((p) => `<div style="font-size:13px;padding:4px 0;border-top:1px solid #EFF3F8;color:#0A2540">✓ ${fmtT(p.publish_at)} — ${kindOf(p)}</div>`).join('');
}
function remindersHtml() {
  const up = IMPORTANT.map((x) => ({ ...x, ...nextOcc(x.md) })).filter((x) => x.days >= 0 && x.days <= 7).sort((a, b) => a.days - b.days);
  if (!up.length) return null;
  return up.map((x) => `<div style="font-size:13px;padding:6px 0;border-top:1px solid #EFF3F8;color:#0A2540">📌 <b>${esc(x.name)}</b> <span style="color:#B8924A;font-weight:700">${x.days === 0 ? 'BUGÜN' : x.days + ' gün sonra'}</span> <span style="color:#8A97A6;font-size:12px">· ${fDayName(x.date)} · ${x.tag}</span></div>`).join('');
}
function importantListHtml() {
  const list = IMPORTANT.map((x) => ({ ...x, ...nextOcc(x.md) })).sort((a, b) => a.days - b.days);
  return list.map((x) => `<div style="font-size:13px;padding:6px 0;border-top:1px solid #EFF3F8;color:#0A2540"><b>${esc(x.name)}</b> — ${fDayName(x.date)} <span style="color:#8A97A6;font-size:12px">· ${x.tag} · ${x.days} gün kaldı</span></div>`).join('');
}

module.exports = async (req, res) => {
  const action = (req.query && req.query.action) || 'send';
  if (!(await authed(req))) return res.status(401).json({ error: 'unauthorized' });
  try {
    // 1) Genel gönderim (cron buradan çağırır)
    if (action === 'send') {
      const b = await readBody(req);
      if (!b.subject) return res.status(400).json({ error: 'subject gerekli' });
      const out = await sendMail(b.subject, b.html || `<p style="color:#0A2540">${esc(b.text || '')}</p>`);
      return res.status(out.ok ? 200 : 400).json(out);
    }
    // 2) Kullanıcı işlemi (Supabase webhook → activity_log INSERT)
    if (action === 'activity') {
      const b = await readBody(req);
      const rec = b.record || b;
      const who = rec.actor_name || rec.actor_email || 'Bir kullanıcı';
      const act = ACTS[rec.action] || rec.action || 'işlem';
      const body = h(`📝 ${who} — ${act}`, fmtT(rec.created_at || new Date().toISOString()))
        + `<table style="width:100%;border-collapse:collapse">`
        + row('Kullanıcı', esc(who))
        + row('İşlem', esc(act))
        + (rec.entity_ref ? row('Kayıt', esc(rec.entity_ref)) : '')
        + (rec.detail ? row('Detay', esc(rec.detail)) : '')
        + `</table>`;
      const out = await sendMail(`📝 ${who} — ${act}`, body);
      return res.status(out.ok ? 200 : 400).json(out);
    }
    // 3) Günlük özet (pg_cron → her akşam)
    if (action === 'daily') {
      if (!SKEY) return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY yok' });
      const sh = { apikey: SKEY, Authorization: `Bearer ${SKEY}` };
      const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
      const from = dayStart.toISOString();
      const [pubR, actR] = await Promise.all([
        fetch(`${SUP}/rest/v1/scheduled_posts?select=format,images,publish_at,status&status=in.(published,failed)&publish_at=gte.${from}&order=publish_at.asc`, { headers: sh }),
        fetch(`${SUP}/rest/v1/activity_log?select=actor_name,action,entity_ref,created_at&created_at=gte.${from}&order=created_at.asc`, { headers: sh }),
      ]);
      const pub = await pubR.json().catch(() => []); const acts = await actR.json().catch(() => []);
      const okP = (pub || []).filter((p) => p.status === 'published'); const failP = (pub || []).filter((p) => p.status === 'failed');
      const dateStr = new Date().toLocaleDateString('tr-TR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
      let body = h(`📊 Günlük özet`, dateStr);
      body += `<div style="display:flex;gap:8px;margin:0 0 18px">
        <div style="flex:1;background:#F0F4F9;border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:#0A2540">${okP.length}</div><div style="font-size:12px;color:#5B6B7B">yayınlandı</div></div>
        <div style="flex:1;background:#F0F4F9;border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:${failP.length ? '#B23A3A' : '#0A2540'}">${failP.length}</div><div style="font-size:12px;color:#5B6B7B">hata</div></div>
        <div style="flex:1;background:#F0F4F9;border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:#0A2540">${(acts || []).length}</div><div style="font-size:12px;color:#5B6B7B">işlem</div></div></div>`;
      body += `<h2 style="font-size:14px;color:#0A2540;margin:18px 0 8px">Yayınlananlar</h2>`;
      body += okP.length ? okP.map((p) => `<div style="font-size:13px;color:#0A2540;padding:4px 0">✓ ${fmtT(p.publish_at)} — ${kindOf(p)}</div>`).join('') : `<div style="font-size:13px;color:#8A97A6">Bugün yayın yok.</div>`;
      if (failP.length) { body += `<h2 style="font-size:14px;color:#B23A3A;margin:18px 0 8px">Yayınlanamayanlar</h2>` + failP.map((p) => `<div style="font-size:13px;color:#B23A3A;padding:4px 0">✕ ${fmtT(p.publish_at)} — ${kindOf(p)}</div>`).join(''); }
      body += `<h2 style="font-size:14px;color:#0A2540;margin:18px 0 8px">Kullanıcı işlemleri</h2>`;
      body += (acts && acts.length) ? acts.map((a) => `<div style="font-size:13px;color:#0A2540;padding:4px 0">• <b>${esc(a.actor_name || '—')}</b> ${esc(ACTS[a.action] || a.action)}${a.entity_ref ? ' — ' + esc(a.entity_ref) : ''}</div>`).join('') : `<div style="font-size:13px;color:#8A97A6">Bugün işlem yok.</div>`;
      const out = await sendMail(`📊 Günlük özet — ${dateStr}`, body);
      return res.status(out.ok ? 200 : 400).json({ ...out, published: okP.length, failed: failP.length, actions: (acts || []).length });
    }
    // 4) Önemli günler tam listesi (elle/istenince)
    if (action === 'important') {
      const body = h('🗓️ Önemli Günler', 'Türkiye + Kuzey Kıbrıs — yaklaşana göre sıralı') + importantListHtml()
        + `<p style="margin:16px 0 0;color:#8A97A6;font-size:12px">Her önemli gün yaklaştıkça 1 hafta öncesinden günlük hatırlatma gelir. Dini bayram tarihleri yaklaşıktır.</p>`;
      const out = await sendMail('🗓️ Önemli Günler — Türkiye & Kuzey Kıbrıs', body);
      return res.status(out.ok ? 200 : 400).json(out);
    }
    // 5) SABAH RAPORU (pg_cron 08:00) — plan + Janna + yayınlananlar + önemli gün hatırlatma
    if (action === 'morning') {
      if (!SKEY) return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY yok' });
      const [plan, janna, published] = await Promise.all([planHtml(), jannaHtml(), publishedHtml()]);
      const rem = remindersHtml();
      const dateStr = new Date().toLocaleDateString('tr-TR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
      let body = h('☀️ Günaydın', dateStr);
      if (rem) body += `<h2 style="font-size:15px;color:#B8924A;margin:20px 0 4px">🗓️ Yaklaşan önemli günler</h2>` + rem;
      body += `<h2 style="font-size:15px;color:#0A2540;margin:20px 0 4px">✅ Dün yayınlananlar</h2>` + (published || '<div style="color:#8A97A6;font-size:13px">Dün yayın yok.</div>');
      if (janna) body += `<h2 style="font-size:15px;color:#0A2540;margin:20px 0 4px">👤 Janna — son 24 saat</h2>` + janna;
      body += `<h2 style="font-size:15px;color:#0A2540;margin:20px 0 8px">📅 Aylık çekim planı</h2>` + plan;
      const out = await sendMail(`☀️ Günaydın — Selected Global · ${dateStr}`, body);
      return res.status(out.ok ? 200 : 400).json({ ...out, reminders: !!rem, jannaActions: !!janna, published: !!published });
    }
    return res.status(400).json({ error: 'geçersiz action' });
  } catch (e) { return res.status(500).json({ error: String((e && e.message) || e) }); }
};
