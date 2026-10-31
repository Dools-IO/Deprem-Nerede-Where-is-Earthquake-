import type { SourceInfo } from '@/lib/sourceInfo';

/*
 * Arayüz dilleri. Türkçe varsayılandır ve önek almaz (/liste); İngilizce /en altındadır.
 * Sayfalar app/[lang] altında; middleware ziyaretçinin gördüğü adresi iç yola çevirir.
 */

export const LANGS = ['tr', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const isLang = (v: string): v is Lang => (LANGS as readonly string[]).includes(v);

/** Görünen adresler: [Türkçe, İngilizce, iç yol (app/[lang] altındaki klasör)] */
const ROUTES = [
  ['/', '/en', ''],
  ['/liste', '/en/list', '/liste'],
  ['/gecmis', '/en/history', '/gecmis'],
  ['/api-docs', '/en/api-docs', '/api-docs'],
] as const;

export type Page = (typeof ROUTES)[number][2];

/** Bir sayfanın verilen dildeki görünen adresi */
export function pagePath(lang: Lang, page: Page): string {
  const r = ROUTES.find((x) => x[2] === page)!;
  return lang === 'tr' ? r[0] : r[1];
}

/** Görünen adresi iç yola çevirir (/en/list → /en/liste, /liste → /tr/liste) */
export function internalPath(pathname: string): string {
  const en = ROUTES.find((x) => x[1] === pathname);
  if (en) return `/en${en[2]}`;
  if (pathname === '/en' || pathname.startsWith('/en/')) return pathname;
  return pathname === '/' ? '/tr' : `/tr${pathname}`;
}

/** Görünen adresin öbür dildeki karşılığı; eşleşme yoksa o dilin ana sayfası */
export function switchPath(pathname: string, to: Lang): string {
  const r = ROUTES.find((x) => x[0] === pathname || x[1] === pathname);
  if (r) return to === 'tr' ? r[0] : r[1];
  return to === 'tr' ? '/' : '/en';
}

export const locale = (lang: Lang) => (lang === 'tr' ? 'tr-TR' : 'en-GB');
export const formatCount = (n: number, lang: Lang) => n.toLocaleString(locale(lang));
export const regionOf = (s: SourceInfo, lang: Lang) => (lang === 'tr' ? s.region : s.regionEn);

const tr = {
  brand: 'Deprem Nerede?',
  metaTitle: 'Deprem Nerede? Dünya geneli canlı deprem haritası',
  metaDescription:
    'AFAD, Kandilli, EMSC, USGS ve 16 resmi kurumdan dünyadaki tüm depremleri tek haritada, canlı olarak takip edin.',
  navMap: 'Harita',
  navList: 'Liste',
  navHistory: 'Geçmiş',
  navApi: 'API',
  otherLang: 'EN',
  otherLangTitle: 'English',
  listTitle: 'Son depremler listesi',
  historyTitle: 'Geçmiş depremler',
  apiTitle: 'API',
  notFound: 'Sayfa bulunamadı',
  backToMap: 'Haritaya dön',

  quakes: 'deprem',
  strongest: 'En büyük:',
  strongestTitle: 'En büyük depreme git',
  sources: 'kaynak',
  updated: (rel: string) => `güncellendi ${rel}`,
  connError: 'bağlantı sorunu, yeniden deneniyor',
  dataSources: 'Veri kaynakları',
  close: 'Kapat',
  sourcesHint: 'İşareti kaldırılan kaynağın yalnız raporladığı depremler gizlenir.',
  errorPrefix: 'Hata',
  pending: 'yükleniyor',
  failed: 'hata',
  liveNote: 'Canlı akış: EMSC WebSocket. Diğer kaynaklar sunucuda 30–120 sn aralıkla yenilenir.',
  hidePanel: 'Paneli gizle',
  showPanel: 'Paneli göster',
  magnitude: 'Büyüklük',
  time: 'Zaman',
  all: 'Tümü',
  hoursShort: (h: number) => `${h} sa`,
  live: 'CANLI',
  liveTitle: 'EMSC canlı akışına bağlı',
  connecting: 'Bağlanıyor',
  connectingTitle: 'Canlı akışa bağlanılıyor',
  offline: 'Canlı akış yok',
  offlineTitle: 'Canlı akış koptu; 30 sn yenileme devam ediyor',
  noLocation: 'Konum belirtilmemiş',
  newBadge: 'YENİ',
  noMatches: 'Bu filtrelerle deprem yok.',
  loading: 'Veriler yükleniyor…',
  showMoreOf: (total: string, shown: number) => `Daha fazla göster (${total} kayıttan ${shown})`,
  firstN: (n: number) => `İlk ${n} kayıt listeleniyor; tamamı haritada.`,

  lastHours: (h: number, n: string) => `Son ${h} saat · ${n} deprem`,
  searchPlaceholder: 'Konum ara (ör. Malatya)',
  source: 'Kaynak',
  allSources: 'Tüm kaynaklar',
  minMagnitude: 'En küçük büyüklük',
  allMagnitudes: 'Tüm büyüklükler',
  location: 'Konum',
  depth: 'Derinlik',
  mapLink: 'Harita',
  details: 'Detay',
  noRecords: 'Kayıt yok.',
  showMore: (n: number) => `Daha fazla göster (${n})`,

  coordinates: 'Koordinat',
  magType: 'Büyüklük tipi',
  openOn: (name: string) => `${name} sayfasında aç →`,
  mapLabel: 'Deprem haritası',

  from: 'Başlangıç',
  to: 'Bitiş',
  loadingShort: 'Yükleniyor…',
  fetch: 'Getir',
  unknownError: 'Bilinmeyen hata',
  archiveUnavailable: 'Geçmiş arşivi şu anda kullanılamıyor.',
  truncated: ' (aralık çok geniş, en yeni 10.000 kayıt gösteriliyor; aralığı daraltın veya büyüklük filtresi seçin)',
  archiveNote: '. Arşiv, sunucunun kayda başladığı andan itibaren dolar.',
  noRecordsInRange: 'Bu aralıkta kayıt yok.',
};

export type Dict = typeof tr;

const en: Dict = {
  brand: 'Where’s the Earthquake?',
  metaTitle: 'Where’s the Earthquake? Live worldwide earthquake map',
  metaDescription:
    'Follow every earthquake in the world live on one map, from AFAD, Kandilli, EMSC, USGS and 16 official agencies.',
  navMap: 'Map',
  navList: 'List',
  navHistory: 'History',
  navApi: 'API',
  otherLang: 'TR',
  otherLangTitle: 'Türkçe',
  listTitle: 'Latest earthquakes',
  historyTitle: 'Past earthquakes',
  apiTitle: 'API',
  notFound: 'Page not found',
  backToMap: 'Back to the map',

  quakes: 'earthquakes',
  strongest: 'Strongest:',
  strongestTitle: 'Go to the strongest earthquake',
  sources: 'sources',
  updated: (rel: string) => `updated ${rel}`,
  connError: 'connection problem, retrying',
  dataSources: 'Data sources',
  close: 'Close',
  sourcesHint: 'Unticking a source hides the earthquakes reported only by that source.',
  errorPrefix: 'Error',
  pending: 'loading',
  failed: 'error',
  liveNote: 'Live feed: EMSC WebSocket. Other sources are refreshed on the server every 30–120 s.',
  hidePanel: 'Hide panel',
  showPanel: 'Show panel',
  magnitude: 'Magnitude',
  time: 'Time',
  all: 'All',
  hoursShort: (h: number) => `${h} h`,
  live: 'LIVE',
  liveTitle: 'Connected to the EMSC live feed',
  connecting: 'Connecting',
  connectingTitle: 'Connecting to the live feed',
  offline: 'No live feed',
  offlineTitle: 'Live feed lost; 30 s refresh continues',
  noLocation: 'Location not given',
  newBadge: 'NEW',
  noMatches: 'No earthquakes match these filters.',
  loading: 'Loading data…',
  showMoreOf: (total: string, shown: number) => `Show more (${shown} of ${total})`,
  firstN: (n: number) => `Showing the first ${n}; all of them are on the map.`,

  lastHours: (h: number, n: string) => `Last ${h} hours · ${n} earthquakes`,
  searchPlaceholder: 'Search location (e.g. Japan)',
  source: 'Source',
  allSources: 'All sources',
  minMagnitude: 'Minimum magnitude',
  allMagnitudes: 'All magnitudes',
  location: 'Location',
  depth: 'Depth',
  mapLink: 'Map',
  details: 'Details',
  noRecords: 'No records.',
  showMore: (n: number) => `Show more (${n})`,

  coordinates: 'Coordinates',
  magType: 'Magnitude type',
  openOn: (name: string) => `Open on ${name} →`,
  mapLabel: 'Earthquake map',

  from: 'From',
  to: 'To',
  loadingShort: 'Loading…',
  fetch: 'Show',
  unknownError: 'Unknown error',
  archiveUnavailable: 'The history archive is not available right now.',
  truncated: ' (range too wide, showing the newest 10,000; narrow the range or choose a magnitude filter)',
  archiveNote: '. The archive fills up from the moment the server started recording.',
  noRecordsInRange: 'No records in this range.',
};

export const DICTS: Record<Lang, Dict> = { tr, en };
