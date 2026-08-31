// Selected Global — E-posta bildirimleri (Resend). Anahtar SADECE Vercel env'inde.
// Uçlar: ?action=send (POST) | activity (Supabase webhook) | daily (pg_cron GET)
const RESEND = process.env.RESEND_API_KEY;
const TO = (process.env.NOTIFY_TO || 'orcun.karagoz@dovecgroup.com').split(',').map((s) => s.trim()).filter(Boolean);
const FROM = process.env.NOTIFY_FROM || 'Selected Global <onboarding@resend.dev>';
const SECRET = process.env.NOTIFY_SECRET;
const SUP = process.env.SUPABASE_URL || 'https://kimwdxymgdnkvivbvmtk.supabase.co';
const SKEY = process.env.SUPABASE_SERVICE_KEY;
const TZ = 'Europe/Nicosia';

async function sendMail(subject, innerHtml) {
  if (!RESEND) return { ok: false, error: 'RESEND_API_KEY tanımlı değil' };
  const html = shell(subject, innerHtml);
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: TO, subject, html }),
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
const authed = (req) => {
  const s = SECRET; if (!s) return true;
  const hdr = req.headers['x-notify-secret'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const key = (req.query && req.query.key) || '';
  return hdr === s || key === s;
};

const ACTS = { create: 'Ekledi', update: 'Düzenledi', delete: 'Sildi', price_change: 'Fiyat değiştirdi', photo_add: 'Fotoğraf ekledi', photo_download: 'Fotoğraf indirdi', portfolio_create: 'Portföy oluşturdu', media_create: 'Instagram gönderisi', excel: 'Excel işlemi' };

module.exports = async (req, res) => {
  const action = (req.query && req.query.action) || 'send';
  if (!authed(req)) return res.status(401).json({ error: 'unauthorized' });
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
    return res.status(400).json({ error: 'geçersiz action' });
  } catch (e) { return res.status(500).json({ error: String((e && e.message) || e) }); }
};
