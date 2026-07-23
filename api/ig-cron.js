// Selected Global — zamanlanmış Instagram gönderilerini yayınlar (Vercel Cron veya harici ping tetikler)
const KEY = process.env.COMPOSIO_API_KEY;
const USER = process.env.COMPOSIO_USER_ID || 'selected-global';
const IG = process.env.COMPOSIO_IG_USER_ID || '17841443965554476';
const SUP = process.env.SUPABASE_URL || 'https://kimwdxymgdnkvivbvmtk.supabase.co';
const SKEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const BASE = 'https://backend.composio.dev/api/v3';

async function exec(tool, args) {
  const r = await fetch(`${BASE}/tools/execute/${tool}`, {
    method: 'POST', headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ user_id: USER, arguments: args }),
  });
  return r.json().catch(() => ({ successful: false, error: 'yanıt okunamadı' }));
}
const cid = (r) => (r && r.data && (r.data.id || (r.data.data && r.data.data.id))) || null;
const ok = (r) => !!r && r.successful !== false && !r.error;
const errOf = (r) => (r && (r.error || (r.data && r.data.message))) || 'bilinmeyen hata';
async function waitReady(creation_id, tries = 10) {
  for (let i = 0; i < tries; i++) {
    const s = await exec('INSTAGRAM_GET_POST_STATUS', { ig_user_id: IG, creation_id });
    const st = (s.data && (s.data.status_code || s.data.status)) || (s.data && s.data.data && (s.data.data.status_code || s.data.data.status)) || '';
    if (st === 'FINISHED') return true;
    if (st === 'ERROR' || st === 'EXPIRED') throw new Error('Medya işlenemedi (' + st + ')');
    await new Promise((r) => setTimeout(r, 2500));
  }
  return false;
}
async function publishWithRetry(creation_id, tries = 6) {
  let last;
  for (let i = 0; i < tries; i++) {
    const pub = await exec('INSTAGRAM_CREATE_POST', { ig_user_id: IG, creation_id });
    if (ok(pub)) return pub;
    last = pub;
    const s = JSON.stringify(pub).toLowerCase();
    if (s.includes('2207027') || s.includes('not ready') || s.includes('is not available') || s.includes('"is_transient":true') || s.includes('media id is not available')) { await new Promise((r) => setTimeout(r, 3000)); continue; }
    return pub;
  }
  return last;
}
async function publishOne(format, images, videoUrl, caption) {
  images = Array.isArray(images) ? images.filter(Boolean) : [];
  let containerId;
  if (format === 'carousel') {
    const children = [];
    for (const img of images.slice(0, 10)) {
      const c = await exec('INSTAGRAM_CREATE_MEDIA_CONTAINER', { ig_user_id: IG, content_type: 'carousel_item', image_url: img });
      if (!ok(c) || !cid(c)) return { ok: false, error: errOf(c) };
      children.push(cid(c));
    }
    const car = await exec('INSTAGRAM_CREATE_CAROUSEL_CONTAINER', { ig_user_id: IG, children, caption });
    if (!ok(car) || !cid(car)) return { ok: false, error: errOf(car) };
    containerId = cid(car);
  } else if (format === 'reels') {
    const c = await exec('INSTAGRAM_CREATE_MEDIA_CONTAINER', { ig_user_id: IG, content_type: 'reel', video_url: videoUrl, caption });
    if (!ok(c) || !cid(c)) return { ok: false, error: errOf(c) };
    containerId = cid(c);
  } else if (format === 'story') {
    const c = await exec('INSTAGRAM_CREATE_MEDIA_CONTAINER', { ig_user_id: IG, content_type: 'photo', media_type: 'STORIES', image_url: images[0] });
    if (!ok(c) || !cid(c)) return { ok: false, error: errOf(c) };
    containerId = cid(c);
  } else {
    const c = await exec('INSTAGRAM_CREATE_MEDIA_CONTAINER', { ig_user_id: IG, content_type: 'photo', image_url: images[0], caption });
    if (!ok(c) || !cid(c)) return { ok: false, error: errOf(c) };
    containerId = cid(c);
  }
  await waitReady(containerId);
  const pub = await publishWithRetry(containerId);
  if (!ok(pub)) return { ok: false, error: errOf(pub) };
  // Post/carousel → otomatik olarak story'de de paylaş (ilk görselden)
  if ((format === 'post' || format === 'carousel') && images[0]) {
    try {
      const sc = await exec('INSTAGRAM_CREATE_MEDIA_CONTAINER', { ig_user_id: IG, content_type: 'photo', media_type: 'STORIES', image_url: images[0] });
      if (ok(sc) && cid(sc)) { await waitReady(cid(sc)); await publishWithRetry(cid(sc)); }
    } catch (_) { /* story başarısızsa ana gönderiyi bozma */ }
  }
  return { ok: true, id: cid(pub) };
}

module.exports = async (req, res) => {
  const auth = req.headers.authorization || '';
  const key = (req.query && req.query.key) || '';
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}` && key !== CRON_SECRET) return res.status(401).json({ error: 'unauthorized' });
  if (!KEY || !SKEY) return res.status(500).json({ error: 'env eksik (COMPOSIO_API_KEY / SUPABASE_SERVICE_KEY)' });
  const sh = { apikey: SKEY, Authorization: `Bearer ${SKEY}` };
  const now = new Date().toISOString();
  let due = [];
  try {
    const r = await fetch(`${SUP}/rest/v1/scheduled_posts?status=eq.pending&publish_at=lte.${now}&order=publish_at.asc&limit=5`, { headers: sh });
    due = await r.json();
  } catch (e) { return res.status(500).json({ error: 'sorgu hatası: ' + (e.message || e) }); }
  if (!Array.isArray(due)) return res.status(500).json({ error: 'beklenmeyen yanıt', detail: due });
  const processed = [];
  for (const row of due) {
    let out;
    try { out = await publishOne(row.format, row.images || [], row.video_url, row.caption || ''); }
    catch (e) { out = { ok: false, error: String(e.message || e) }; }
    await fetch(`${SUP}/rest/v1/scheduled_posts?id=eq.${row.id}`, {
      method: 'PATCH', headers: { ...sh, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ status: out.ok ? 'published' : 'failed', result: out.ok ? 'ok' : String(out.error).slice(0, 300), ig_post_id: out.id || null }),
    });
    processed.push({ id: row.id, ok: out.ok, error: out.ok ? undefined : out.error });
  }
  return res.json({ checked: due.length, processed });
};
