// Selected Global — Instagram backend (Composio). Anahtar SADECE Vercel env'inde durur.
// Uçlar: ?action=userinfo | insights | media | publish  (publish = POST body ile)
const KEY = process.env.COMPOSIO_API_KEY;
const USER = process.env.COMPOSIO_USER_ID || 'selected-global';
const IG = process.env.COMPOSIO_IG_USER_ID || '17841443965554476';
const BASE = 'https://backend.composio.dev/api/v3';

async function exec(tool, args) {
  const r = await fetch(`${BASE}/tools/execute/${tool}`, {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ user_id: USER, arguments: args }),
  });
  return r.json().catch(() => ({ successful: false, error: 'yanıt okunamadı' }));
}
const cid = (res) => (res && res.data && (res.data.id || (res.data.data && res.data.data.id))) || null;
const ok = (res) => !!res && res.successful !== false && !res.error;
const errOf = (res) => (res && (res.error || (res.data && res.data.message))) || 'bilinmeyen hata';

// Container işlenene kadar bekle (foto: saniyeler, video: daha uzun)
async function waitReady(creation_id, tries = 10) {
  for (let i = 0; i < tries; i++) {
    const s = await exec('INSTAGRAM_GET_POST_STATUS', { ig_user_id: IG, creation_id });
    const st = (s.data && (s.data.status_code || s.data.status)) || (s.data && s.data.data && (s.data.data.status_code || s.data.data.status)) || '';
    if (st === 'FINISHED') return true;
    if (st === 'ERROR' || st === 'EXPIRED') throw new Error('Medya işlenemedi (' + st + ')');
    await new Promise((r) => setTimeout(r, 2500));
  }
  return false; // durum alınamasa da yayın denenecek
}
// "hazır değil" (2207027 / is_transient) hatasında bekleyip tekrar dener
async function publishWithRetry(creation_id, tries = 6) {
  let last;
  for (let i = 0; i < tries; i++) {
    const pub = await exec('INSTAGRAM_CREATE_POST', { ig_user_id: IG, creation_id });
    if (ok(pub)) return pub;
    last = pub;
    const s = JSON.stringify(pub).toLowerCase();
    if (s.includes('2207027') || s.includes('not ready') || s.includes('is not available') || s.includes('"is_transient":true') || s.includes('media id is not available')) {
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    return pub; // farklı bir hata → tekrar deneme
  }
  return last;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve) => {
    let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
  });
}

module.exports = async (req, res) => {
  if (!KEY) return res.status(500).json({ error: 'Sunucuda COMPOSIO_API_KEY tanımlı değil (Vercel env değişkeni ekleyin).' });
  const action = (req.query && req.query.action) || '';
  try {
    if (action === 'userinfo') {
      const r = await exec('INSTAGRAM_GET_USER_INFO', {});
      return res.status(ok(r) ? 200 : 400).json(r);
    }

    if (action === 'insights') {
      const spec = [
        ['reach', 'day'], ['profile_views', 'day'], ['website_clicks', 'day'],
        ['accounts_engaged', 'day'], ['total_interactions', 'day'],
        ['follower_count', 'day'], ['online_followers', 'lifetime'],
        ['views', 'day'], ['impressions', 'day'],
      ];
      const insights = {};
      await Promise.all(spec.map(async ([m, period]) => {
        try {
          const r = await exec('INSTAGRAM_GET_USER_INSIGHTS', { metric: [m], period });
          insights[m] = ok(r) ? ((r.data && r.data.data) || r.data) : { error: errOf(r) };
        } catch (e) { insights[m] = { error: String(e.message || e) }; }
      }));
      const info = await exec('INSTAGRAM_GET_USER_INFO', {});
      const media = await exec('INSTAGRAM_GET_USER_MEDIA', { limit: 12 });
      return res.json({ userinfo: info.data || null, insights, media: (media.data && (media.data.data || media.data)) || null, fetched_at: new Date().toISOString() });
    }

    if (action === 'media') {
      const r = await exec('INSTAGRAM_GET_USER_MEDIA', { limit: 24 });
      return res.status(ok(r) ? 200 : 400).json(r);
    }

    if (action === 'publish') {
      const body = await readBody(req);
      const format = body.format || 'post';
      const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
      const videoUrl = body.videoUrl || '';
      const caption = body.caption || '';
      let containerId;

      if (format === 'carousel') {
        if (images.length < 2) return res.status(400).json({ error: 'Carousel için en az 2 görsel gerekir.' });
        const children = [];
        for (const img of images.slice(0, 10)) {
          const c = await exec('INSTAGRAM_CREATE_MEDIA_CONTAINER', { ig_user_id: IG, content_type: 'carousel_item', image_url: img });
          if (!ok(c) || !cid(c)) return res.status(400).json({ error: 'Görsel yüklenemedi: ' + errOf(c) });
          children.push(cid(c));
        }
        const car = await exec('INSTAGRAM_CREATE_CAROUSEL_CONTAINER', { ig_user_id: IG, children, caption });
        if (!ok(car) || !cid(car)) return res.status(400).json({ error: 'Carousel oluşturulamadı: ' + errOf(car) });
        containerId = cid(car);
      } else if (format === 'reels') {
        if (!videoUrl) return res.status(400).json({ error: 'Reels için video URL gerekli.' });
        const c = await exec('INSTAGRAM_CREATE_MEDIA_CONTAINER', { ig_user_id: IG, content_type: 'reel', video_url: videoUrl, caption });
        if (!ok(c) || !cid(c)) return res.status(400).json({ error: 'Video yüklenemedi: ' + errOf(c) });
        containerId = cid(c);
      } else if (format === 'story') {
        if (!images[0]) return res.status(400).json({ error: 'Story için görsel gerekli.' });
        const c = await exec('INSTAGRAM_CREATE_MEDIA_CONTAINER', { ig_user_id: IG, content_type: 'photo', media_type: 'STORIES', image_url: images[0] });
        if (!ok(c) || !cid(c)) return res.status(400).json({ error: 'Story oluşturulamadı: ' + errOf(c) });
        containerId = cid(c);
      } else { // post = tek görsel
        if (!images[0]) return res.status(400).json({ error: 'Görsel gerekli.' });
        const c = await exec('INSTAGRAM_CREATE_MEDIA_CONTAINER', { ig_user_id: IG, content_type: 'photo', image_url: images[0], caption });
        if (!ok(c) || !cid(c)) return res.status(400).json({ error: 'Görsel yüklenemedi: ' + errOf(c) });
        containerId = cid(c);
      }

      // Yayınlamadan ÖNCE container'ın hazır olmasını bekle (yarış durumunu önler), sonra gerekirse tekrar dene
      await waitReady(containerId);
      const pub = await publishWithRetry(containerId);
      if (!ok(pub)) return res.status(400).json({ error: 'Yayınlanamadı: ' + errOf(pub), detail: pub });
      return res.json({ ok: true, id: cid(pub), format });
    }

    return res.status(400).json({ error: 'geçersiz action' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};
