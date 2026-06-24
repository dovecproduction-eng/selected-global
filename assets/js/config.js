// Selected Global — Supabase bağlantı ayarları
// anon key herkese açık olması güvenli olan anahtardır (asıl koruma RLS politikalarındadır).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://kimwdxymgdnkvivbvmtk.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbXdkeHltZ2Rua3ZpdmJ2bXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNTg5NzUsImV4cCI6MjA5NzczNDk3NX0.Ct6GMP_N4onggdUMR1ms8wmUJFa9Uu_HjMhqODPL7D0';

export const STORAGE_BUCKET = 'property-images';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// Portföyü oluşturan kişiye göre iletişim numarası
// keys: "Hazırlayan" alanında geçebilecek kelimeler (küçük harf). Yeni danışman eklemek için buraya ekle.
export const CREATORS = [
  { keys: ['janna'], name: 'Janna', phone: '0533 883 45 25', phoneRaw: '905338834525' },
  { keys: ['orçun', 'orcun', 'döveç', 'dovec'], name: 'Orçun Döveç', phone: '0548 869 05 15', phoneRaw: '905488690515' },
];
// olusturan metnine göre ilgili danışmanı bul; yoksa Selected Global genel numarası
export function creatorContact(olusturan) {
  const s = (olusturan || '').toLocaleLowerCase('tr');
  for (const c of CREATORS) if (c.keys.some((k) => s.includes(k))) return c;
  return { name: BRAND.name, phone: BRAND.phone, phoneRaw: BRAND.phoneRaw };
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

// Para birimi simgeleri
export const CURRENCY = { GBP: '£', EUR: '€', USD: '$', TRY: '₺' };
