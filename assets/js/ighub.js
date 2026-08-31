// Selected Global — Instagram Merkez (hub)
import { initAuth, supabase, fmtTime, fmtDay, classify, FMT } from './planner-common.js?v=135';

const $ = (s) => document.querySelector(s);

initAuth(async () => {
  const { data } = await supabase.from('scheduled_posts').select('id,format,images,publish_at,status').order('publish_at', { ascending: true });
  const posts = data || [];
  const now = Date.now();
  const pending = posts.filter((p) => p.status === 'pending' && new Date(p.publish_at).getTime() > now);

  if ($('#hubCntCal')) $('#hubCntCal').textContent = posts.length ? `${posts.length}` : '';
  if ($('#hubCntList')) $('#hubCntList').textContent = pending.length ? `${pending.length} sırada` : '';

  const next = pending[0];
  if (next) {
    const kind = classify(next); const f = FMT[kind];
    $('#hubNext').innerHTML = `<span class="hub-next-dot"></span>Sıradaki gönderi: <b>${fmtDay(next.publish_at)} ${fmtTime(next.publish_at)}</b> <span class="hub-next-tag" style="background:${f.soft};color:${f.color}">${f.icon} ${f.label}</span>`;
  } else {
    $('#hubNext').innerHTML = `<span class="hub-next-dot idle"></span>Zamanlanmış gönderi yok. <a href="otomasyon.html">Otomasyon</a> ile planla.`;
  }
});
