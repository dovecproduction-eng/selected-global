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
create index if not exists idx_properties_ref on public.properties(ref_kodu);

-- FOTOĞRAF deposu (bucket)
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

create policy "read_images"   on storage.objects for select using (bucket_id = 'property-images');
create policy "upload_images" on storage.objects for insert to authenticated with check (bucket_id = 'property-images');
create policy "update_images" on storage.objects for update to authenticated using (bucket_id = 'property-images');
create policy "delete_images" on storage.objects for delete to authenticated using (bucket_id = 'property-images');
