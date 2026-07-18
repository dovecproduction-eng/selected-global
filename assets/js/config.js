// Selected Global — Supabase bağlantı ayarları
// anon key herkese açık olması güvenli olan anahtardır (asıl koruma RLS politikalarındadır).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://kimwdxymgdnkvivbvmtk.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbXdkeHltZ2Rua3ZpdmJ2bXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNTg5NzUsImV4cCI6MjA5NzczNDk3NX0.Ct6GMP_N4onggdUMR1ms8wmUJFa9Uu_HjMhqODPL7D0';

export const STORAGE_BUCKET = 'property-images';

// SÜPER ADMIN — her şeyi düzenleyip silebilen ve aktivite loglarını görebilen tek kişi.
// (Panelde 'admin' rozeti yok; dışarıdan sıradan danışman gibi görünür.) Değişirse burayı güncelle.
export const SUPER_ADMIN_EMAIL = 'orcundovec@gmail.com';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Müşteri (public) tarafında çekilecek sütunlar — YÖNETİME ÖZEL alanlar (musteri_fiyat, blok, daire_no)
// bilerek dışarıda bırakıldı; ayrıca Supabase'de bu sütunlar anon rolünden REVOKE edildi (bkz. supabase-setup.sql).
export const PUBLIC_PROPERTY_COLS = 'id,ref_kodu,konut_tipi,baslik,title_en,tip,oda_sayisi,fiyat,para_birimi,metrekare,bolge,banyo_sayisi,kat,esyali,ozellikler,aciklama,desc_en,fotograflar,kapak_index,created_at,ekleyen,proje';

// Marka / iletişim sabitleri
export const BRAND = {
  name: 'Selected Global',
  phone: '+90 539 114 45 25',
  phoneRaw: '905391144525',
  email: 'info@selectedglobal.com',
  site: 'https://www.selectedglobal.com',
  // Logo (SVG vektör). Yoksa yazı-logoya düşer.
  logoLight: 'assets/img/logo-white.svg', // koyu zemin (kapak bandı) için — beyaz
  logoDark: 'assets/img/logo.svg',         // açık zemin için — lacivert
};

// "Tüm daireler" butonunun gideceği Selected Global sayfası.
// >>> Gerçek adres verilince burayı değiştir. <<<
export const ALL_LISTINGS_URL = 'https://www.selectedglobal.com/tr';

// MÜŞTERİYE GÖSTERİLEN TEK YETKİLİ KİŞİ
// Daireyi/portföyü kim oluşturursa oluştursun (Orçun dahil), müşteri tarafında
// iletişim hep bu kişiye gider. Tek muhatap. Değiştirmek için aşağıyı düzenle.
export const PUBLIC_CONTACT = { name: 'Janna', phone: '0533 883 45 25', phoneRaw: '905338834525' };

// Danışmanlar: ada göre iletişim + giriş e-postasına göre otomatik isim
// keys: isim eşleşmesi için kelimeler. emails: o kişinin giriş e-posta(ları) (varsa).
export const CREATORS = [
  { keys: ['izgün', 'izgun', 'günsal', 'gunsal'], emails: ['izgun.gunsal@dovecgroup.com'], name: 'İzgün Günsal', phone: '0533 820 55 15', phoneRaw: '905338205515' },
  { keys: ['janna', 'jana', 'alek', 'emiral'], emails: ['janna@selectedglobal.com'], name: 'Janna Alek Emiral', phone: '0533 883 45 25', phoneRaw: '905338834525' },
  { keys: ['orçun', 'orcun', 'karagöz', 'karagoz'], emails: ['orcundovec@gmail.com'], name: 'Orçun Karagöz', phone: '0548 869 05 15', phoneRaw: '905488690515' },
  { keys: ['celal', 'seyitzade', 'jalal'], emails: ['jalal@selectedglobal.com'], name: 'Celal Seyitzade', phone: '0539 124 45 25', phoneRaw: '905391244525' },
  { keys: ['cavid', 'javid', 'rustamov'], emails: ['cavid.rustamov@selectedglobal.com'], name: 'Cavid Rustamov', phone: '0548 824 05 15', phoneRaw: '905488240515' },
];
// İsme göre danışmanı bul (yazım farkına dayanıklı); yoksa genel numara
export function creatorContact(olusturan) {
  const s = (olusturan || '').toLocaleLowerCase('tr').trim();
  for (const c of CREATORS) {
    if (c.keys.some((k) => s.includes(k) || (s.length >= 3 && k.includes(s)))) return c;
  }
  return { name: BRAND.name, phone: BRAND.phone, phoneRaw: BRAND.phoneRaw };
}
// Giriş e-postasına göre danışmanı bul (önce e-posta, sonra e-posta önekinden isim eşleşmesi)
export function creatorByEmail(email) {
  const e = (email || '').toLocaleLowerCase('tr').trim();
  if (!e) return null;
  for (const c of CREATORS) if ((c.emails || []).some((m) => e === m.toLocaleLowerCase('tr'))) return c;
  const prefix = e.split('@')[0].replace(/[._-]+/g, ' ').trim();
  const c = creatorContact(prefix);
  return c.name !== BRAND.name ? c : null;
}
// Giriş e-postasından gösterilecek isim (tanınan danışman → düzgün ad, değilse önek)
export function nameFromEmail(email) {
  const c = creatorByEmail(email);
  if (c) return c.name;
  const prefix = (email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
  return prefix ? prefix.charAt(0).toLocaleUpperCase('tr') + prefix.slice(1) : '';
}

// KKTC bölgeleri — ilçe + ilan yoğun popüler alt bölgeler (gruplu). Sıra: İskele, Gazimağusa, Girne...
export const REGION_GROUPS = {
  'İskele': ['İskele', 'İskele Merkez', 'Long Beach', 'Boğaz', 'Bahçeler', 'Bafra', 'Kumyalı', 'Yeni İskele'],
  'Gazimağusa': ['Gazimağusa', 'Mağusa Merkez', 'Tuzla', 'Yeniboğaziçi', 'Sakarya', 'Maraş', 'Karakol'],
  'Girne': ['Girne', 'Girne Merkez', 'Alsancak', 'Lapta', 'Çatalköy', 'Esentepe', 'Karşıyaka', 'Karaoğlanoğlu', 'Zeytinlik', 'Ozanköy', 'Edremit', 'Bellapais', 'Arapköy'],
  'Lefkoşa': ['Lefkoşa', 'Lefkoşa Merkez', 'Gönyeli', 'Hamitköy', 'Yenikent', 'Ortaköy', 'Küçük Kaymaklı'],
  'Güzelyurt': ['Güzelyurt'],
  'Lefke': ['Lefke'],
};
export const REGIONS = Object.values(REGION_GROUPS).flat();

// Konut tipleri (opsiyonel)
export const KONUT_TIPLERI = ['Daire', 'Penthouse', 'Dubleks', 'Villa', 'İkiz Villa', 'Müstakil Ev', 'Loft', 'Rezidans', 'Arsa', 'İşyeri / Dükkan'];

// Oda sayısı seçenekleri
export const ODA_TIPLERI = ['Stüdyo', '1+0', '1+1', '2+1', '3+1', '3+2', '4+1', '4+2', '5+1', '6+1', '7+1'];

// Projeler (opsiyonel) — yeni proje eklemek için buraya ekle
export const PROJELER = ['Four Season 1', 'Four Season 2', 'Four Season 3', 'Courtyard Long Beach', 'Panorama', 'Sky Sakarya', 'La Isla', 'Terrace Park', 'Courtyard Platinum'];

// Para birimi simgeleri
export const CURRENCY = { GBP: '£', EUR: '€', USD: '$', TRY: '₺' };
