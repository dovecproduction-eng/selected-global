// Selected Global — Planlayıcı ortak modülü (auth, toast, tür sınıflandırma, saat)
import { supabase, SUPER_ADMIN_EMAIL, nameFromEmail } from './config.js?v=122';
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
