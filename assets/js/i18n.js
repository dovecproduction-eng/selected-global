// Selected Global — TR/EN çeviriler ve dil yönetimi

export const I18N = {
  tr: {
    nav_admin: 'Yönetim',
    hero_eyebrow: 'KKTC Gayrimenkul',
    hero_title_1: 'Kıbrıs’ta',
    hero_title_em: 'seçkin',
    hero_title_2: 'yaşam alanları',
    hero_lead: 'Kiralık ve satılık dairelerimizi keşfedin. Beğendiğiniz daireleri tek tuşla görüntüleyin, fotoğraflarını indirin.',
    stat_listings: 'İlan',
    stat_regions: 'Bölge',
    stat_support: 'Danışmanlık',

    f_all: 'Tümü',
    f_rent: 'Kiralık',
    f_sale: 'Satılık',
    f_region: 'Tüm Bölgeler',
    f_rooms: 'Tüm Oda Tipleri',
    results: 'ilan',

    empty_title: 'İlan bulunamadı',
    empty_text: 'Bu filtrelere uygun ilan yok. Filtreleri değiştirip tekrar deneyin.',
    loading: 'Yükleniyor…',

    badge_rent: 'Kiralık',
    badge_sale: 'Satılık',
    photos: 'fotoğraf',
    per_month: '/ay',

    sp_rooms: 'Oda',
    sp_konut: 'Konut Tipi',
    sp_area: 'Alan',
    sp_bath: 'Banyo',
    sp_floor: 'Kat',
    sp_furnished: 'Eşyalı',
    sp_unfurnished: 'Eşyasız',
    sp_region: 'Bölge',
    sp_type: 'Tip',
    not_specified: 'Belirtilmemiş',

    back_to_listings: 'Geri',
    download_photos: 'Fotoğrafları indir',
    preparing: 'Hazırlanıyor…',
    call_now: 'Hemen ara',
    whatsapp: 'WhatsApp',
    description: 'Açıklama',
    features: 'Özellikler',
    detail_not_found: 'İlan bulunamadı',

    portfolio_eyebrow: 'Size özel seçki',
    portfolio_default_title: 'Seçilmiş Daireler',
    portfolio_lead: 'Sizin için hazırladığımız daireler aşağıdadır.',
    download_all: 'Tüm fotoğrafları indir',
    see_all: 'Tüm dairelerimiz',
    all_title: 'Tüm Dairelerimiz',
    all_lead: 'Kiralık ve satılık dairelerimizin tamamı. Beğendiğinize tıklayıp detay ve fotoğraflara ulaşın.',
    view_photos: 'Fotoğraflar & detay',
    portfolio_empty: 'Bu portföyde gösterilecek ilan yok.',

    footer_tagline: 'Kuzey Kıbrıs’ta güvenilir gayrimenkul.',
  },
  en: {
    nav_admin: 'Admin',
    hero_eyebrow: 'North Cyprus Real Estate',
    hero_title_1: 'Distinguished',
    hero_title_em: 'living',
    hero_title_2: 'in Cyprus',
    hero_lead: 'Explore our properties for rent and sale. View selected homes in one tap and download their photos instantly.',
    stat_listings: 'Listings',
    stat_regions: 'Regions',
    stat_support: 'Advisory',

    f_all: 'All',
    f_rent: 'For Rent',
    f_sale: 'For Sale',
    f_region: 'All Regions',
    f_rooms: 'All Room Types',
    results: 'listings',

    empty_title: 'No listings found',
    empty_text: 'No properties match these filters. Try adjusting them.',
    loading: 'Loading…',

    badge_rent: 'For Rent',
    badge_sale: 'For Sale',
    photos: 'photos',
    per_month: '/mo',

    sp_rooms: 'Rooms',
    sp_konut: 'Property Type',
    sp_area: 'Area',
    sp_bath: 'Bath',
    sp_floor: 'Floor',
    sp_furnished: 'Furnished',
    sp_unfurnished: 'Unfurnished',
    sp_region: 'Region',
    sp_type: 'Type',
    not_specified: 'Not specified',

    back_to_listings: 'Back',
    download_photos: 'Download photos',
    preparing: 'Preparing…',
    call_now: 'Call now',
    whatsapp: 'WhatsApp',
    description: 'Description',
    features: 'Features',
    detail_not_found: 'Listing not found',

    portfolio_eyebrow: 'A selection for you',
    portfolio_default_title: 'Selected Properties',
    portfolio_lead: 'Below are the properties we have prepared for you.',
    download_all: 'Download all photos',
    see_all: 'All our properties',
    all_title: 'All Our Properties',
    all_lead: 'All our properties for rent and sale. Tap any to see details and photos.',
    view_photos: 'Photos & details',
    portfolio_empty: 'No listings to show in this portfolio.',

    footer_tagline: 'Trusted real estate in North Cyprus.',
  },
};

export function getLang() {
  return localStorage.getItem('sg_lang') || 'tr';
}
export function setLang(lang) {
  localStorage.setItem('sg_lang', lang);
  document.documentElement.lang = lang;
}
export function t(key) {
  const lang = getLang();
  return (I18N[lang] && I18N[lang][key]) || (I18N.tr[key]) || key;
}

// Sayfadaki [data-i18n] elemanlarını çevirir
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
}
