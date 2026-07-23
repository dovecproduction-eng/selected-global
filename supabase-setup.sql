-- Selected Global — Supabase şema kurulumu
-- Supabase → SQL Editor'de bir kez çalıştırılır.

-- DAİRELER
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  ref_kodu text,
  konut_tipi text,
  baslik text,
  title_en text,
  tip text check (tip in ('kiralik','satilik')),
  oda_sayisi text,
  fiyat numeric,
  para_birimi text default 'GBP',
  metrekare numeric,
  bolge text,
  banyo_sayisi int,
  kat text,
  esyali boolean,
  ozellikler text[],
  aciklama text,
  desc_en text,
  fotograflar text[],
  kapak_index int default 0,
  created_at timestamptz default now()
);

-- PORTFÖY (gönderilen linkler)
create table if not exists public.portfolios (
  kod text primary key,
  baslik text,
  olusturan text,
  property_ids uuid[],
  created_at timestamptz default now()
);

-- Güvenlik: herkes okur, sadece giriş yapan admin yazar
alter table public.properties enable row level security;
alter table public.portfolios enable row level security;

create policy "read_properties"  on public.properties for select using (true);
create policy "write_properties" on public.properties for all to authenticated using (true) with check (true);
create policy "read_portfolios"  on public.portfolios for select using (true);
create policy "write_portfolios" on public.portfolios for all to authenticated using (true) with check (true);

-- (Mevcut tabloya sonradan eklemek için — Excel içe aktarma mükerrer kontrolü kullanır)
alter table public.properties add column if not exists ref_kodu text;
alter table public.properties add column if not exists konut_tipi text;
alter table public.properties add column if not exists ekleyen text;
alter table public.properties add column if not exists proje text;
-- Sadece yönetim panelinde görünen iç bilgiler (portföy/vitrin/ilan sayfasında gösterilmez)
alter table public.properties add column if not exists blok text;
alter table public.properties add column if not exists daire_no text;
alter table public.properties add column if not exists musteri_fiyat numeric; -- müşterinin (mal sahibinin) istediği fiyat — yalnız yönetim
alter table public.portfolios add column if not exists olusturan text;

-- GİZLİLİK: yönetime özel sütunları (musteri_fiyat, blok, daire_no) dışarıdaki (anon)
-- kullanıcıdan tamamen gizle. Bu sütunlar artık müşteri tarafında ağ trafiğinde bile
-- görünmez; sadece giriş yapan admin (authenticated) okur.
--
-- ÖNEMLİ: Supabase, anon rolüne TABLO GENELİNDE select yetkisi verir. PostgreSQL'de
-- sütun-bazlı `revoke select (col)`, tablo-geneli grant'ın üstüne geçemez ve etkisiz kalır.
-- Bu yüzden ÖNCE tablo geneli SELECT'i geri alıp SONRA yalnız güvenli sütunları veriyoruz.
revoke select on public.properties from anon;
grant  select (
  id, ref_kodu, konut_tipi, baslik, title_en, tip, oda_sayisi, fiyat, para_birimi,
  metrekare, bolge, banyo_sayisi, kat, esyali, ozellikler, aciklama, desc_en,
  fotograflar, kapak_index, created_at, ekleyen, proje
) on public.properties to anon;
create index if not exists idx_properties_ref on public.properties(ref_kodu);

-- ============================================================
-- v73 — SAHİPLİK & YETKİ + AKTİVİTE KAYDI (LOG)
-- Bu bloğu Supabase → SQL Editor'da BİR KEZ çalıştırın (tekrar çalıştırmak güvenli).
-- Kural: Orçun (süper admin) her şeyi düzenler/siler ve logları görür.
--        Diğer danışmanlar yalnız KENDİ ekledikleri kaydı düzenler/siler.
-- ============================================================

-- 1) Sahiplik: her kaydı kimin oluşturduğu (giriş e-postası). Yeni kayıtta panel otomatik yazar.
alter table public.properties add column if not exists owner_email text;
alter table public.portfolios add column if not exists owner_email text;

-- 2) YETKİ (RLS): eski geniş "for all" politikalarını kaldır, sahip-bazlı politikalar kur.
drop policy if exists "write_properties" on public.properties;
drop policy if exists "write_portfolios" on public.portfolios;

-- properties — ekleme/düzenleme/silme yalnız kendi kaydında (veya süper admin ise hepsinde)
drop policy if exists "props_insert" on public.properties;
drop policy if exists "props_update" on public.properties;
drop policy if exists "props_delete" on public.properties;
create policy "props_insert" on public.properties for insert to authenticated
  with check ( owner_email = (auth.jwt() ->> 'email') or (auth.jwt() ->> 'email') = 'orcundovec@gmail.com' );
create policy "props_update" on public.properties for update to authenticated
  using  ( owner_email = (auth.jwt() ->> 'email') or (auth.jwt() ->> 'email') = 'orcundovec@gmail.com' );
create policy "props_delete" on public.properties for delete to authenticated
  using  ( owner_email = (auth.jwt() ->> 'email') or (auth.jwt() ->> 'email') = 'orcundovec@gmail.com' );

-- portfolios — aynı kural
drop policy if exists "ports_insert" on public.portfolios;
drop policy if exists "ports_update" on public.portfolios;
drop policy if exists "ports_delete" on public.portfolios;
create policy "ports_insert" on public.portfolios for insert to authenticated
  with check ( owner_email = (auth.jwt() ->> 'email') or (auth.jwt() ->> 'email') = 'orcundovec@gmail.com' );
create policy "ports_update" on public.portfolios for update to authenticated
  using  ( owner_email = (auth.jwt() ->> 'email') or (auth.jwt() ->> 'email') = 'orcundovec@gmail.com' );
create policy "ports_delete" on public.portfolios for delete to authenticated
  using  ( owner_email = (auth.jwt() ->> 'email') or (auth.jwt() ->> 'email') = 'orcundovec@gmail.com' );

-- 3) AKTİVİTE KAYDI (LOG) — değiştirilemez; herkes kendi adına yazar, YALNIZ Orçun okur.
create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  actor_email text,
  actor_name  text,
  action      text not null,   -- create|update|delete|price_change|photo_add|photo_download|portfolio_create|media_create
  entity_type text,            -- property|portfolio
  entity_ref  text,
  detail      text
);
alter table public.activity_log enable row level security;
-- herkes yalnız KENDİ adına log yazabilir
drop policy if exists "log_insert" on public.activity_log;
create policy "log_insert" on public.activity_log for insert to authenticated
  with check ( actor_email = (auth.jwt() ->> 'email') );
-- yalnız Orçun okuyabilir; güncelleme/silme politikası YOK → kayıt değiştirilemez/silinemez
drop policy if exists "log_read" on public.activity_log;
create policy "log_read" on public.activity_log for select to authenticated
  using ( (auth.jwt() ->> 'email') = 'orcundovec@gmail.com' );
-- anon hiç göremez; authenticated yalnız ekler/okur
revoke all on public.activity_log from anon;
grant select, insert on public.activity_log to authenticated;
create index if not exists idx_activity_log_created on public.activity_log(created_at desc);

-- ============================================================
-- ZAMANLANMIŞ INSTAGRAM GÖNDERİLERİ (zamanlayıcı) — bu bloğu bir kez çalıştırın
-- ============================================================
create table if not exists public.scheduled_posts (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  created_by  text,
  format      text not null,                  -- carousel|post|story|reels
  images      jsonb default '[]'::jsonb,       -- herkese açık görsel URL'leri
  video_url   text,
  caption     text,
  publish_at  timestamptz not null,
  status      text not null default 'pending', -- pending|published|failed
  result      text,
  ig_post_id  text
);
alter table public.scheduled_posts enable row level security;
drop policy if exists "sched_insert" on public.scheduled_posts;
create policy "sched_insert" on public.scheduled_posts for insert to authenticated with check (true);
drop policy if exists "sched_read" on public.scheduled_posts;
create policy "sched_read" on public.scheduled_posts for select to authenticated using (true);
drop policy if exists "sched_del" on public.scheduled_posts;
create policy "sched_del" on public.scheduled_posts for delete to authenticated using (true);
revoke all on public.scheduled_posts from anon;
grant select, insert, delete on public.scheduled_posts to authenticated;
create index if not exists idx_sched_due on public.scheduled_posts(status, publish_at);

-- FOTOĞRAF deposu (bucket)
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

create policy "read_images"   on storage.objects for select using (bucket_id = 'property-images');
create policy "upload_images" on storage.objects for insert to authenticated with check (bucket_id = 'property-images');
create policy "update_images" on storage.objects for update to authenticated using (bucket_id = 'property-images');
create policy "delete_images" on storage.objects for delete to authenticated using (bucket_id = 'property-images');
