/*
 * Kaynak kayıt defteri (istemci ve sunucu ortak).
 * SourceId tipi bu nesnenin anahtarlarından türetilir; yeni bir kaynak için
 * buraya bir girdi ekleyip sunucu tarafında FETCHERS'a çekicisini yazmak yeterli.
 * FETCHERS `Record<SourceId, …>` olduğundan çekicisi unutulursa derleme hata verir.
 */

interface SourceDefinition {
  name: string;
  fullName: string;
  region: string;
  /** Bölge adının İngilizcesi */
  regionEn: string;
  homepage: string;
  /** Birleştirmede hangi kaydın gösterileceği: küçük sayı = öncelikli */
  priority: number;
}

// Bölgesel resmi kurumlar, kendi bölgelerinde küresel kataloglardan daha
// isabetli konum/büyüklük verir; bu yüzden birleştirmede önce gelirler.
const DEFINITIONS = {
  afad: {
    name: 'AFAD',
    fullName: 'AFAD Deprem Dairesi Başkanlığı',
    region: 'Türkiye',

    regionEn: 'Türkiye',
    homepage: 'https://deprem.afad.gov.tr',
    priority: 1,
  },
  kandilli: {
    name: 'Kandilli',
    fullName: 'Boğaziçi Üni. Kandilli Rasathanesi (KOERI)',
    region: 'Türkiye',

    regionEn: 'Türkiye',
    homepage: 'http://www.koeri.boun.edu.tr',
    priority: 2,
  },
  ingv: {
    name: 'INGV',
    fullName: 'Istituto Nazionale di Geofisica e Vulcanologia',
    region: 'İtalya',

    regionEn: 'Italy',
    homepage: 'https://terremoti.ingv.it',
    priority: 3,
  },
  geonet: {
    name: 'GeoNet',
    fullName: 'GeoNet',
    region: 'Yeni Zelanda',

    regionEn: 'New Zealand',
    homepage: 'https://www.geonet.org.nz',
    priority: 3,
  },
  ga: {
    name: 'GA',
    fullName: 'Geoscience Australia',
    region: 'Avustralya',

    regionEn: 'Australia',
    homepage: 'https://earthquakes.ga.gov.au',
    priority: 3,
  },
  jma: {
    name: 'JMA',
    fullName: 'Japan Meteorological Agency',
    region: 'Japonya',

    regionEn: 'Japan',
    homepage: 'https://www.jma.go.jp',
    priority: 3,
  },
  ssn: {
    name: 'SSN',
    fullName: 'Servicio Sismológico Nacional',
    region: 'Meksika',

    regionEn: 'Mexico',
    homepage: 'http://www.ssn.unam.mx',
    priority: 3,
  },
  sed: {
    name: 'SED',
    fullName: 'Swiss Seismological Service (ETH Zürich)',
    region: 'İsviçre ve Alpler',

    regionEn: 'Switzerland and the Alps',
    homepage: 'http://www.seismo.ethz.ch',
    priority: 3,
  },
  renass: {
    name: 'RéNaSS',
    fullName: 'EPOS-France / RéNaSS',
    region: 'Fransa ve denizaşırı bölgeler',

    regionEn: 'France and overseas territories',
    homepage: 'https://renass.unistra.fr',
    priority: 3,
  },
  ign: {
    name: 'IGN',
    fullName: 'Instituto Geográfico Nacional',
    region: 'İspanya, Fas, Kanarya',

    regionEn: 'Spain, Morocco, Canaries',
    homepage: 'https://www.ign.es/web/ign/portal/sis-catalogo-terremotos',
    priority: 3,
  },
  ipma: {
    name: 'IPMA',
    fullName: 'Instituto Português do Mar e da Atmosfera',
    region: 'Portekiz, Azorlar',

    regionEn: 'Portugal, Azores',
    homepage: 'https://www.ipma.pt',
    priority: 3,
  },
  bmkg: {
    name: 'BMKG',
    fullName: 'Badan Meteorologi, Klimatologi, dan Geofisika',
    region: 'Endonezya',

    regionEn: 'Indonesia',
    homepage: 'https://www.bmkg.go.id',
    priority: 3,
  },
  usp: {
    name: 'USP',
    fullName: 'Centro de Sismologia da USP (RSBR)',
    region: 'Brezilya',

    regionEn: 'Brazil',
    homepage: 'https://www.moho.iag.usp.br',
    priority: 3,
  },
  noa: {
    name: 'NOA',
    fullName: 'National Observatory of Athens, Geodynamics Institute',
    region: 'Yunanistan ve Ege',

    regionEn: 'Greece and the Aegean',
    homepage: 'https://www.gein.noa.gr',
    priority: 3,
  },
  emsc: {
    name: 'EMSC',
    fullName: 'European-Mediterranean Seismological Centre',
    region: 'Dünya',

    regionEn: 'Worldwide',
    homepage: 'https://www.emsc-csem.org',
    priority: 5,
  },
  usgs: {
    name: 'USGS',
    fullName: 'United States Geological Survey',
    region: 'Dünya',

    regionEn: 'Worldwide',
    homepage: 'https://earthquake.usgs.gov',
    priority: 6,
  },
  geofon: {
    name: 'GEOFON',
    fullName: 'GFZ GEOFON',
    region: 'Dünya',

    regionEn: 'Worldwide',
    homepage: 'https://geofon.gfz.de',
    priority: 7,
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
