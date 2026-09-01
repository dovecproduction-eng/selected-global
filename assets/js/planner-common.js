// Selected Global — Planlayıcı ortak modülü (auth, toast, tür sınıflandırma, saat)
import { supabase, SUPER_ADMIN_EMAIL, nameFromEmail } from './config.js?v=140';
export { supabase };

const $ = (s) => document.querySelector(s);
const asciiLower = (s) => String(s || '').toLocaleLowerCase('tr');

// Gönderi türü: story | egitici (otomasyon C-serisi) | daire
export function classify(p) {
  if (p.format === 'story') return 'story';
  const u = (p.images && p.images[0]) || '';
  return u.includes('/_ig/auto/') ? 'egitici' : 'daire';
}
// Tür bilgisi — renk ASLA tek başına anlam taşımaz; her yerde ikon + etiket eşlik eder
export const FMT = {
  daire:   { label: 'Daire',   color: '#0A2540', soft: 'rgba(10,37,64,.10)',  icon: '🏠' },
  egitici: { label: 'Eğitici', color: '#B8924A', soft: 'rgba(184,146,74,.16)', icon: '📚' },
  story:   { label: 'Story',   color: '#3E7C8C', soft: 'rgba(62,124,140,.14)', icon: '⚡' },
};
export const ST = {
  pending:   { label: 'Bekliyor',    cls: 'st-pending' },
  processing:{ label: 'İşleniyor',   cls: 'st-proc' },
  published: { label: 'Yayınlandı',  cls: 'st-pub' },
  failed:    { label: 'Başarısız',   cls: 'st-fail' },
};

const TZ = 'Europe/Nicosia';
export function fmtTime(iso) { return new Date(iso).toLocaleTimeString('tr-TR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }); }
export function fmtDay(iso) { return new Date(iso).toLocaleDateString('tr-TR', { timeZone: TZ, day: 'numeric', month: 'long' }); }
export function fmtFull(iso) { return new Date(iso).toLocaleString('tr-TR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); }
// Yerel (KKTC) yyyy-mm-dd anahtarı — takvim gününe yerleştirmek için
export function dayKey(iso) {
  const p = new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }); // yyyy-mm-dd
  return p;
}

// ---- Toast ----
export function toast(msg, type = 'ok') {
  const wrap = $('#toastWrap'); if (!wrap) return;
  const t = document.createElement('div');
  t.className = 'ig-toast ' + (type === 'err' ? 'err' : 'ok');
  t.textContent = msg;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3600);
}

// ---- Auth (yalnız süper admin) ----
let myEmail = '';
export function currentEmail() { return myEmail; }
export function currentName() { return nameFromEmail(myEmail) || ''; }

export function initAuth(onReady) {
  const showLogin = () => { $('#loginScreen').classList.remove('hidden'); $('#app').classList.add('hidden'); };
  const showApp = () => {
    $('#loginScreen').classList.add('hidden'); $('#app').classList.remove('hidden');
    if ($('#userName')) $('#userName').textContent = currentName();
    if (asciiLower(myEmail) !== asciiLower(SUPER_ADMIN_EMAIL)) {
      document.querySelector('.pl-main')?.replaceChildren();
      const m = document.querySelector('.pl-main') || $('#app');
      m.innerHTML = '<div style="text-align:center;padding:80px 20px"><h2 style="margin-bottom:10px">Bu sayfaya erişiminiz yok</h2><p class="text-muted" style="margin-bottom:20px">Bu alan yalnız yetkili kişiye açıktır.</p><a class="btn btn-primary" href="admin.html">← Panele dön</a></div>';
      return;
    }
    onReady();
  };
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) { myEmail = session.user?.email || ''; showApp(); } else showLogin();
  });
  $('#loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#loginBtn'); btn.disabled = true; btn.textContent = 'Giriş yapılıyor…';
    $('#loginErr').textContent = '';
    const { data, error } = await supabase.auth.signInWithPassword({ email: $('#loginEmail').value.trim(), password: $('#loginPass').value });
    btn.disabled = false; btn.textContent = 'Giriş yap';
    if (error) { $('#loginErr').textContent = 'Giriş başarısız: e-posta veya şifre hatalı.'; return; }
    myEmail = data.user?.email || '';
    if (asciiLower(myEmail) !== asciiLower(SUPER_ADMIN_EMAIL)) { await supabase.auth.signOut(); $('#loginErr').textContent = 'Bu panele giriş yetkiniz yok.'; return; }
    showApp();
  });
  $('#logoutBtn')?.addEventListener('click', async () => { await supabase.auth.signOut(); showLogin(); });
}

// ---- Ortak yardımcı ----
export function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function toLocalInput(iso) { const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }

// ---- Gönderi detay paneli (takvim + gönderiler ortak) ----
export function closePostDrawer() { document.querySelector('#plDrawer')?.classList.remove('open'); }
export function wirePostDrawer() {
  const dr = document.querySelector('#plDrawer'); if (!dr) return;
  document.querySelector('#plDrawerClose')?.addEventListener('click', closePostDrawer);
  dr.addEventListener('click', (e) => { if (e.target === dr) closePostDrawer(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePostDrawer(); });
}
export function openPostDrawer(p, onRefresh) {
  const kind = classify(p); const f = FMT[kind]; const st = ST[p.status] || ST.pending;
  const imgs = p.images || [];
  document.querySelector('#plDrawerTitle').innerHTML = `<span class="pl-dtag" style="background:${f.soft};color:${f.color}">${f.icon} ${f.label}</span>`;
  document.querySelector('#plDrawerBody').innerHTML = `
    <div class="pl-resched"><label for="plReDate">Yeniden zamanla</label>
      <div class="pl-resched-row"><input type="date" id="plReDay" value="${esc(toLocalInput(p.publish_at).slice(0, 10))}" /><input type="time" id="plReTime" value="${esc(toLocalInput(p.publish_at).slice(11, 16))}" /><button class="btn btn-primary btn-sm" id="plReSave">Kaydet</button></div>
      <p class="pl-resched-cur">Şu an: <b>${esc(fmtFull(p.publish_at))}</b> <span class="text-muted">(KKTC)</span></p></div>
    <div class="pl-preview">${imgs[0] ? `<img src="${esc(imgs[0])}" alt="önizleme" />` : '<div class="pl-noimg">görsel yok</div>'}${imgs.length > 1 ? `<span class="pl-preview-n">1 / ${imgs.length}</span>` : ''}</div>
    ${imgs.length > 1 ? `<div class="pl-thumbs">${imgs.map((u) => `<span style="background-image:url('${esc(u)}')"></span>`).join('')}</div>` : ''}
    <dl class="pl-meta">
      <div><dt>Durum</dt><dd><span class="pl-badge ${st.cls}">${st.label}</span>${p.result ? ` <span class="text-muted">— ${esc(String(p.result).slice(0, 120))}</span>` : ''}</dd></div>
      <div><dt>Biçim</dt><dd>${p.format === 'story' ? 'Story' : `Carousel · ${imgs.length} görsel`}</dd></div>
    </dl>
    ${p.caption ? `<div class="pl-capbox"><label>Caption</label><p>${esc(p.caption)}</p></div>` : ''}
    <button class="btn btn-danger-o btn-block" id="plDelete">🗑 Planı sil</button>`;
  document.querySelector('#plDelete').onclick = async () => {
    if (!confirm('Bu zamanlanmış gönderi silinsin mi? (Yayınlanmadan iptal edilir)')) return;
    const { error } = await supabase.from('scheduled_posts').delete().eq('id', p.id);
    if (error) { toast('Silinemedi: ' + error.message, 'err'); return; }
    toast('Plan silindi', 'ok'); closePostDrawer(); onRefresh && onRefresh();
  };
  document.querySelector('#plReSave').onclick = async () => {
    const day = document.querySelector('#plReDay').value; const time = document.querySelector('#plReTime').value;
    if (!day || !time) { toast('Tarih ve saat seç', 'err'); return; }
    const v = `${day}T${time}`;
    const { data, error } = await supabase.from('scheduled_posts').update({ publish_at: new Date(v).toISOString() }).eq('id', p.id).select();
    if (error) { toast('Güncellenemedi: ' + error.message, 'err'); return; }
    if (!data || !data.length) { toast('Güncellenemedi — yetki (RLS) eksik olabilir', 'err'); return; }
    p.publish_at = data[0].publish_at;
    toast('Yeniden zamanlandı', 'ok'); closePostDrawer(); onRefresh && onRefresh();
  };
  document.querySelector('#plDrawer').classList.add('open');
}
