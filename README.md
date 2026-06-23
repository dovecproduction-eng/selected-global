# Selected Global — Emlak Vitrin & Portföy Uygulaması

KKTC kiralık/satılık daire vitrini + admin paneli + müşteriye özel portföy linki.
Statik site (HTML + CSS + JS), veri/fotoğraf/giriş için **Supabase** kullanır. Build adımı yoktur.

## Sayfalar
- `index.html` — Vitrin/katalog (herkese açık). Filtre: Kiralık/Satılık, Bölge, Oda.
- `daire.html?id=...` — Daire detayı + "Fotoğrafları indir (ZIP)".
- `p.html?kod=...` — Müşteriye gönderilen portföy linki (sadece seçilen daireler).
- `admin.html` — Yönetim paneli (Supabase Auth ile şifre korumalı).

## Admin paneli kullanımı
1. `/admin` adresine git, e-posta + şifre ile giriş yap.
2. **Daireler** sekmesi → "Yeni daire ekle" → bilgileri gir, fotoğrafları yükle (ilk fotoğraf kapak; tıklayarak veya sürükleyerek sıralayabilirsin) → Kaydet.
3. **Portföyler** sekmesi → "Yeni portföy oluştur" → başlık ver, daireleri seç → "Link oluştur" → linki kopyala / WhatsApp'tan gönder.

## Supabase kurulumu (tek seferlik — yapıldı)
- Proje: `kimwdxymgdnkvivbvmtk` (ayarlar `assets/js/config.js` içinde).
- Tablolar: `properties`, `portfolios`. Storage bucket: `property-images` (public).
- RLS: herkes okur, sadece giriş yapan admin yazar.
- Admin kullanıcısı: Supabase → Authentication → Users altından eklenir.
- Şema/politikaları yeniden kurmak gerekirse: `supabase-setup.sql` dosyasını SQL Editor'de çalıştır.

> `config.js` içindeki `anon` anahtarı herkese açık olması güvenli olan türdendir; asıl koruma RLS'tedir. `service_role` anahtarını ASLA buraya koyma/paylaşma.

## Yerelde çalıştırma
ES modülleri kullanıldığı için `file://` ile açılmaz, basit bir sunucu gerekir:
```bash
cd selected-global
python3 -m http.server 8080
# tarayıcıda: http://localhost:8080
```

## Yayına alma (Vercel — kıos akışıyla aynı)
```bash
cd selected-global
git init && git add -A && git commit -m "Selected Global emlak uygulaması"
# GitHub'a push → Vercel projesine bağla → otomatik deploy
```
`vercel.json`: temiz URL'ler + güvenlik başlıkları içerir.
