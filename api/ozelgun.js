// Selected Global — Özel gün otomatik paylaşımı. pg_cron her sabah 07:00'de çağırır.
// Bugünün tarihi (MM-DD) için _ig/ozel/{MM-DD}.webp varsa story olarak paylaşır.
const KEY = process.env.COMPOSIO_API_KEY;
const USER = process.env.COMPOSIO_USER_ID || 'selected-global';
const IG = process.env.COMPOSIO_IG_USER_ID || '17841443965554476';
const CRON_SECRET = process.env.CRON_SECRET;
const SUP = process.env.SUPABASE_URL || 'https://kimwdxymgdnkvivbvmtk.supabase.co';
const BASE = 'https://backend.composio.dev/api/v3';

async function exec(tool, args) {
  const r = await fetch(`${BASE}/tools/execute/${tool}`, { method: 'POST', headers: { 'x-api-key': KEY, 'content-type': 'application/json' }, body: JSON.stringify({ user_id: USER, arguments: args }) });
  return r.json().catch(() => ({ successful: false, error: 'yanıt okunamadı' }));
}
const cid = (r) => (r && r.data && (r.data.id || (r.data.data && r.data.data.id))) || null;
const ok = (r) => !!r && r.successful !== false && !r.error;
const errOf = (r) => (r && (r.error || (r.data && r.data.message))) || 'bilinmeyen hata';
async function waitReady(id, tries = 10) { for (let i = 0; i < tries; i++) { const s = await exec('INSTAGRAM_GET_POST_STATUS', { ig_user_id: IG, creation_id: id }); const st = (s.data && (s.data.status_code || s.data.status)) || (s.data && s.data.data && (s.data.data.status_code || s.data.data.status)) || ''; if (st === 'FINISHED') return true; if (st === 'ERROR' || st === 'EXPIRED') return false; await new Promise((r) => setTimeout(r, 2500)); } return false; }
async function publishWithRetry(id, tries = 6) { let last; for (let i = 0; i < tries; i++) { const pub = await exec('INSTAGRAM_CREATE_POST', { ig_user_id: IG, creation_id: id }); if (ok(pub)) return pub; last = pub; const s = JSON.stringify(pub).toLowerCase(); if (s.includes('2207027') || s.includes('not ready') || s.includes('is not available') || s.includes('is_transient')) { await new Promise((r) => setTimeout(r, 3000)); continue; } return pub; } return last; }

module.exports = async (req, res) => {
  const auth = req.headers.authorization || '';
  const key = (req.query && req.query.key) || '';
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}` && key !== CRON_SECRET) return res.status(401).json({ error: 'unauthorized' });
  if (!KEY) return res.status(500).json({ error: 'COMPOSIO_API_KEY yok' });
  // Bugünün MM-DD'si (KKTC)
  const md = (req.query && req.query.md) || new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' }).slice(5); // MM-DD
  const url = `${SUP}/storage/v1/object/public/property-images/_ig/ozel/${md}.webp`;
  try {
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) return res.json({ posted: false, md, reason: 'bugün özel gün görseli yok' });
    const c = await exec('INSTAGRAM_CREATE_MEDIA_CONTAINER', { ig_user_id: IG, content_type: 'photo', media_type: 'STORIES', image_url: url });
    if (!ok(c) || !cid(c)) return res.status(400).json({ error: 'Story oluşturulamadı: ' + errOf(c), md });
    await waitReady(cid(c));
    const pub = await publishWithRetry(cid(c));
    if (!ok(pub)) return res.status(400).json({ error: 'Yayınlanamadı: ' + errOf(pub), md });
    return res.json({ posted: true, md, id: cid(pub) });
  } catch (e) { return res.status(500).json({ error: String((e && e.message) || e), md }); }
};
