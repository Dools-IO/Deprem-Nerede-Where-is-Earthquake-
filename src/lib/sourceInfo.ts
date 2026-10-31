import type { SourceId } from '../types';

export interface SourceInfo {
  id: SourceId;
  name: string;
  fullName: string;
  region: string;
  homepage: string;
  /** Birleştirmede hangi kaydın gösterileceği: küçük sayı = öncelikli */
  priority: number;
}

// Bölgesel resmi kurumlar, kendi bölgelerinde küresel kataloglardan daha
// isabetli konum/büyüklük verir; bu yüzden birleştirmede önce gelirler.
export const SOURCES: Record<SourceId, SourceInfo> = {
  afad: {
    id: 'afad',
    name: 'AFAD',
    fullName: 'AFAD Deprem Dairesi Başkanlığı',
    region: 'Türkiye',
    homepage: 'https://deprem.afad.gov.tr',
    priority: 1,
  },
  kandilli: {
    id: 'kandilli',
    name: 'Kandilli',
    fullName: 'Boğaziçi Üni. Kandilli Rasathanesi (KOERI)',
    region: 'Türkiye',
    homepage: 'http://www.koeri.boun.edu.tr',
    priority: 2,
  },
  ingv: {
    id: 'ingv',
    name: 'INGV',
    fullName: 'Istituto Nazionale di Geofisica e Vulcanologia',
    region: 'İtalya',
    homepage: 'https://terremoti.ingv.it',
    priority: 3,
  },
  geonet: {
    id: 'geonet',
    name: 'GeoNet',
    fullName: 'GeoNet',
    region: 'Yeni Zelanda',
    homepage: 'https://www.geonet.org.nz',
    priority: 3,
  },
  ga: {
    id: 'ga',
    name: 'GA',
    fullName: 'Geoscience Australia',
    region: 'Avustralya',
    homepage: 'https://earthquakes.ga.gov.au',
    priority: 3,
  },
  jma: {
    id: 'jma',
    name: 'JMA',
    fullName: 'Japan Meteorological Agency',
    region: 'Japonya',
    homepage: 'https://www.jma.go.jp',
    priority: 3,
  },
  ssn: {
    id: 'ssn',
    name: 'SSN',
    fullName: 'Servicio Sismológico Nacional',
    region: 'Meksika',
    homepage: 'http://www.ssn.unam.mx',
    priority: 3,
  },
  sed: {
    id: 'sed',
    name: 'SED',
    fullName: 'Swiss Seismological Service (ETH Zürich)',
    region: 'İsviçre ve Alpler',
    homepage: 'http://www.seismo.ethz.ch',
    priority: 3,
  },
  renass: {
    id: 'renass',
    name: 'RéNaSS',
    fullName: 'EPOS-France / RéNaSS',
    region: 'Fransa ve denizaşırı bölgeler',
    homepage: 'https://renass.unistra.fr',
    priority: 3,
  },
  ign: {
    id: 'ign',
    name: 'IGN',
    fullName: 'Instituto Geográfico Nacional',
    region: 'İspanya, Fas, Kanarya',
    homepage: 'https://www.ign.es/web/ign/portal/sis-catalogo-terremotos',
    priority: 3,
  },
  ipma: {
    id: 'ipma',
    name: 'IPMA',
    fullName: 'Instituto Português do Mar e da Atmosfera',
    region: 'Portekiz, Azorlar',
    homepage: 'https://www.ipma.pt',
    priority: 3,
  },
  bmkg: {
    id: 'bmkg',
    name: 'BMKG',
    fullName: 'Badan Meteorologi, Klimatologi, dan Geofisika',
    region: 'Endonezya',
    homepage: 'https://www.bmkg.go.id',
    priority: 3,
  },
  usp: {
    id: 'usp',
    name: 'USP',
    fullName: 'Centro de Sismologia da USP (RSBR)',
    region: 'Brezilya',
    homepage: 'https://www.moho.iag.usp.br',
    priority: 3,
  },
  emsc: {
    id: 'emsc',
    name: 'EMSC',
    fullName: 'European-Mediterranean Seismological Centre',
    region: 'Dünya',
    homepage: 'https://www.emsc-csem.org',
    priority: 5,
  },
  usgs: {
    id: 'usgs',
    name: 'USGS',
    fullName: 'United States Geological Survey',
    region: 'Dünya',
    homepage: 'https://earthquake.usgs.gov',
    priority: 6,
  },
  geofon: {
    id: 'geofon',
    name: 'GEOFON',
    fullName: 'GFZ GEOFON',
    region: 'Dünya',
    homepage: 'https://geofon.gfz.de',
    priority: 7,
  },
};

export const SOURCE_IDS = Object.keys(SOURCES) as SourceId[];

export function isSourceId(value: string): value is SourceId {
  return value in SOURCES;
}
