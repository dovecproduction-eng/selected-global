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

// KKTC bölgeleri — ilçe + ilan yoğun popüler alt bölgeler (gruplu)
export const REGION_GROUPS = {
  'Girne': ['Girne', 'Girne Merkez', 'Alsancak', 'Lapta', 'Çatalköy', 'Esentepe', 'Karşıyaka', 'Karaoğlanoğlu', 'Zeytinlik', 'Ozanköy', 'Edremit', 'Bellapais', 'Arapköy'],
  'Gazimağusa': ['Gazimağusa', 'Mağusa Merkez', 'Tuzla', 'Yeniboğaziçi', 'Sakarya', 'Maraş', 'Karakol'],
  'İskele': ['İskele', 'İskele Merkez', 'Long Beach', 'Boğaz', 'Bahçeler', 'Bafra', 'Kumyalı', 'Yeni İskele'],
  'Lefkoşa': ['Lefkoşa', 'Lefkoşa Merkez', 'Gönyeli', 'Hamitköy', 'Yenikent', 'Ortaköy', 'Küçük Kaymaklı'],
  'Güzelyurt': ['Güzelyurt'],
  'Lefke': ['Lefke'],
};
export const REGIONS = Object.values(REGION_GROUPS).flat();

// Konut tipleri (opsiyonel)
export const KONUT_TIPLERI = ['Daire', 'Stüdyo', 'Penthouse', 'Dubleks', 'Villa', 'İkiz Villa', 'Müstakil Ev', 'Bungalov', 'Townhouse', 'Loft', 'Rezidans', 'Arsa', 'İşyeri / Dükkan'];

// Para birimi simgeleri
export const CURRENCY = { GBP: '£', EUR: '€', USD: '$', TRY: '₺' };
