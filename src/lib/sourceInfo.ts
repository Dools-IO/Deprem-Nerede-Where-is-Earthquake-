/*
 * Kaynak kayıt defteri (istemci ve sunucu ortak).
 * SourceId tipi bu nesnenin anahtarlarından türetilir; yeni bir kaynak için
 * buraya bir girdi ekleyip sunucu tarafında FETCHERS'a çekicisini yazmak yeterli.
 * FETCHERS `Record<SourceId, …>` olduğundan çekicisi unutulursa derleme hata verir.
 */

import type { Locale } from '@/i18n/config';

interface SourceDefinition {
  name: string;
  fullName: string;
  /** Kapsadığı bölge, her dilde */
  region: Record<Locale, string>;
  homepage: string;
  /** Birleştirmede hangi kaydın gösterileceği: küçük sayı = öncelikli */
  priority: number;
  /** Verinin lisansı / kullanım şartı (kurumun kendi sayfasından) */
  license: string;
  licenseUrl: string;
  /** Veriyi kullananların koruması gereken atıf metni */
  attribution: string;
  /**
   * Herkese açık API'de yeniden dağıtılabilir mi? false: yeniden yayın izni yok veya
   * doğrulanmadı; veri sitedeki haritada gösterilir ama /api/* çıktısına girmez.
   */
  publicApi: boolean;
}

// Bölgesel resmi kurumlar, kendi bölgelerinde küresel kataloglardan daha
// isabetli konum/büyüklük verir; bu yüzden birleştirmede önce gelirler.
const DEFINITIONS = {
  afad: {
    name: 'AFAD',
    fullName: 'AFAD Deprem Dairesi Başkanlığı',
    region: { tr: 'Türkiye', en: 'Türkiye' },
    homepage: 'https://deprem.afad.gov.tr',
    priority: 1,
    license: 'No open licence published',
    licenseUrl: 'https://deprem.afad.gov.tr',
    attribution: 'AFAD',
    publicApi: false,
  },
  kandilli: {
    name: 'Kandilli',
    fullName: 'Boğaziçi Üni. Kandilli Rasathanesi (KOERI)',
    region: { tr: 'Türkiye', en: 'Türkiye' },
    homepage: 'http://www.koeri.boun.edu.tr',
    priority: 2,
    license: 'No open licence; © KOERI',
    licenseUrl: 'http://www.koeri.boun.edu.tr',
    attribution: 'B.Ü. KRDAE Bölgesel Deprem-Tsunami İzleme ve Değerlendirme Merkezi',
    publicApi: false,
  },
  ingv: {
    name: 'INGV',
    fullName: 'Istituto Nazionale di Geofisica e Vulcanologia',
    region: { tr: 'İtalya', en: 'Italy' },
    homepage: 'https://terremoti.ingv.it',
    priority: 3,
    license: 'CC BY 4.0',
    licenseUrl: 'https://www.ingv.it/it/note-legali',
    attribution: 'INGV',
    publicApi: true,
  },
  geonet: {
    name: 'GeoNet',
    fullName: 'GeoNet',
    region: { tr: 'Yeni Zelanda', en: 'New Zealand' },
    homepage: 'https://www.geonet.org.nz',
    priority: 3,
    license: 'CC BY 3.0 NZ',
    licenseUrl: 'https://www.geonet.org.nz/policy',
    attribution: 'We acknowledge the New Zealand GeoNet programme and its sponsors NHC, Earth Sciences NZ, LINZ, NEMA and MBIE',
    publicApi: true,
  },
  ga: {
    name: 'GA',
    fullName: 'Geoscience Australia',
    region: { tr: 'Avustralya', en: 'Australia' },
    homepage: 'https://earthquakes.ga.gov.au',
    priority: 3,
    license: 'CC BY 4.0',
    licenseUrl: 'https://researchdata.edu.au/earthquakesga',
    attribution: 'Geoscience Australia',
    publicApi: true,
  },
  jma: {
    name: 'JMA',
    fullName: 'Japan Meteorological Agency',
    region: { tr: 'Japonya', en: 'Japan' },
    homepage: 'https://www.jma.go.jp',
    priority: 3,
    license: 'Public Data License (Japan) 1.0, CC BY 4.0 compatible',
    licenseUrl: 'https://www.jma.go.jp/jma/kishou/info/coment.html',
    attribution: '出典：気象庁ホームページ (Source: Japan Meteorological Agency; processed by Deprem Nerede)',
    publicApi: true,
  },
  ssn: {
    name: 'SSN',
    fullName: 'Servicio Sismológico Nacional',
    region: { tr: 'Meksika', en: 'Mexico' },
    homepage: 'http://www.ssn.unam.mx',
    priority: 3,
    license: 'Unverified (no licence page found)',
    licenseUrl: 'http://www.ssn.unam.mx',
    attribution: 'Servicio Sismológico Nacional, UNAM',
    publicApi: false,
  },
  sed: {
    name: 'SED',
    fullName: 'Swiss Seismological Service (ETH Zürich)',
    region: { tr: 'İsviçre ve Alpler', en: 'Switzerland and the Alps' },
    homepage: 'http://www.seismo.ethz.ch',
    priority: 3,
    license: 'opendata.swiss: open use, source must be given',
    licenseUrl: 'https://opendata.swiss/en/terms-of-use',
    attribution: 'Swiss Seismological Service (SED) at ETH Zürich',
    publicApi: true,
  },
  renass: {
    name: 'RéNaSS',
    fullName: 'EPOS-France / RéNaSS',
    region: { tr: 'Fransa ve denizaşırı bölgeler', en: 'France and overseas' },
    homepage: 'https://renass.unistra.fr',
    priority: 3,
    license: 'Unverified',
    licenseUrl: 'https://renass.unistra.fr/en/legale-notice',
    attribution: 'BCSF-RéNaSS',
    publicApi: false,
  },
  ign: {
    name: 'IGN',
    fullName: 'Instituto Geográfico Nacional',
    region: { tr: 'İspanya, Fas, Kanarya', en: 'Spain, Morocco, Canaries' },
    homepage: 'https://www.ign.es/web/ign/portal/sis-catalogo-terremotos',
    priority: 3,
    license: 'Orden FOM/2807/2015, CC BY 4.0 compatible',
    licenseUrl: 'https://www.ign.es/web/en/politica-datos',
    attribution: 'Instituto Geográfico Nacional (IGN)',
    publicApi: true,
  },
  ipma: {
    name: 'IPMA',
    fullName: 'Instituto Português do Mar e da Atmosfera',
    region: { tr: 'Portekiz, Azorlar', en: 'Portugal, Azores' },
    homepage: 'https://www.ipma.pt',
    priority: 3,
    license: 'IPMA terms: non-commercial use only',
    licenseUrl: 'https://api.ipma.pt/',
    attribution: 'Instituto Português do Mar e da Atmosfera (IPMA)',
    publicApi: true,
  },
  bmkg: {
    name: 'BMKG',
    fullName: 'Badan Meteorologi, Klimatologi, dan Geofisika',
    region: { tr: 'Endonezya', en: 'Indonesia' },
    homepage: 'https://www.bmkg.go.id',
    priority: 3,
    license: 'BMKG terms: written permission required to redistribute',
    licenseUrl: 'https://www.bmkg.go.id/ketentuan-penggunaan',
    attribution: 'Sumber: BMKG',
    publicApi: false,
  },
  usp: {
    name: 'USP',
    fullName: 'Centro de Sismologia da USP (RSBR)',
    region: { tr: 'Brezilya', en: 'Brazil' },
    homepage: 'https://www.moho.iag.usp.br',
    priority: 3,
    license: 'No licence published',
    licenseUrl: 'https://www.moho.iag.usp.br',
    attribution: 'Centro de Sismologia da USP',
    publicApi: false,
  },
  noa: {
    name: 'NOA',
    fullName: 'National Observatory of Athens, Geodynamics Institute',
    region: { tr: 'Yunanistan ve Ege', en: 'Greece and the Aegean' },
    homepage: 'https://www.gein.noa.gr',
    priority: 3,
    license: 'CC BY 4.0',
    licenseUrl: 'https://eida.gein.noa.gr',
    attribution: 'NOA Institute of Geodynamics',
    publicApi: true,
  },
  emsc: {
    name: 'EMSC',
    fullName: 'European-Mediterranean Seismological Centre',
    region: { tr: 'Dünya', en: 'World' },
    homepage: 'https://www.emsc-csem.org',
    priority: 5,
    license: 'CC BY 4.0 (no bulk mirroring)',
    licenseUrl: 'https://seismicportal.eu/terms.html',
    attribution: 'Credit: EMSC-CSEM SeismicPortal, https://www.seismicportal.eu',
    publicApi: true,
  },
  usgs: {
    name: 'USGS',
    fullName: 'United States Geological Survey',
    region: { tr: 'Dünya', en: 'World' },
    homepage: 'https://earthquake.usgs.gov',
    priority: 6,
    license: 'Public domain (U.S. Government)',
    licenseUrl: 'https://www.usgs.gov/faqs/how-should-i-cite-a-usgs-website',
    attribution: 'U.S. Geological Survey (USGS)',
    publicApi: true,
  },
  geofon: {
    name: 'GEOFON',
    fullName: 'GFZ GEOFON',
    region: { tr: 'Dünya', en: 'World' },
    homepage: 'https://geofon.gfz.de',
    priority: 7,
    license: 'CC BY 4.0',
    licenseUrl: 'https://geofon.gfz.de/eqinfo/faq/',
    attribution: 'GEOFON data centre, GFZ Helmholtz Centre for Geosciences',
    publicApi: true,
  },
} satisfies Record<string, SourceDefinition>;

export type SourceId = keyof typeof DEFINITIONS;

export interface SourceInfo extends SourceDefinition {
  id: SourceId;
}

export const SOURCE_IDS = Object.keys(DEFINITIONS) as SourceId[];

export const SOURCES = Object.fromEntries(
  SOURCE_IDS.map((id) => [id, { id, ...DEFINITIONS[id] }]),
) as Record<SourceId, SourceInfo>;

export function isSourceId(value: string): value is SourceId {
  return Object.prototype.hasOwnProperty.call(DEFINITIONS, value);
}

/** Depremi raporlayan kurumların adları: "AFAD, Kandilli, EMSC" */
export const reporterNames = (eq: { source: SourceId; alsoReportedBy?: SourceId[] }): string =>
  [eq.source, ...(eq.alsoReportedBy ?? [])].map((s) => SOURCES[s]?.name ?? s).join(', ');

/** Herkese açık API'de verisi dağıtılabilen kaynaklar */
export const PUBLIC_SOURCE_IDS = SOURCE_IDS.filter((id) => DEFINITIONS[id].publicApi);
