import 'server-only';
import type { Earthquake, SourceId } from '@/types';
import {
  parseAFAD,
  parseBMKG,
  parseIGN,
  parseIPMA,
  parseEMSC,
  parseFdsnText,
  parseGA,
  parseGeoNet,
  parseJMA,
  parseKandilli,
  parseSSN,
  parseUSGS,
} from './parsers';

/** Tüm kaynaklardan çekilen zaman penceresi */
export const WINDOW_HOURS = 24;

const USER_AGENT = 'DepremNerede/0.2 (+https://github.com/Dools-IO/Deprem-Nerede-Where-is-Earthquake-)';
const TIMEOUT_MS = 8_000;

async function get(url: string, accept: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: accept },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

const getJson = async (url: string) => (await get(url, 'application/json')).json();
const getText = async (url: string) => (await get(url, 'text/plain, application/xml, text/html')).text();

/** FDSN servisleri saniye hassasiyetinde, saat dilimi eki olmadan UTC ister */
const fdsnTime = (d: Date) => d.toISOString().slice(0, 19);
const windowStart = () => new Date(Date.now() - WINDOW_HOURS * 3600_000);

export interface SourceFetcher {
  /** Bu kaynağın sunucu önbelleğinde ne kadar taze tutulacağı */
  ttlMs: number;
  fetch: () => Promise<Earthquake[]>;
}

/** Standart FDSN event servisi (format=text) için ortak çekici */
function fdsnSource(
  source: SourceId,
  base: string,
  urlFor: (id: string) => string,
  ttlMs = 60_000,
): SourceFetcher {
  return {
    ttlMs,
    fetch: async () => {
      const q = new URLSearchParams({
        format: 'text',
        starttime: fdsnTime(windowStart()),
        orderby: 'time',
        limit: '2000',
      });
      return parseFdsnText(await getText(`${base}?${q}`), source, urlFor);
    },
  };
}

const sinceWindow = (list: Earthquake[]) => {
  const since = windowStart().getTime();
  return list.filter((eq) => Date.parse(eq.time) >= since);
};

export const FETCHERS: Record<SourceId, SourceFetcher> = {
  // USGS özet beslemesi her dakika güncellenir
  usgs: {
    ttlMs: 60_000,
    fetch: async () =>
      parseUSGS(await getJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson')),
  },

  emsc: {
    ttlMs: 30_000,
    fetch: async () => {
      const q = new URLSearchParams({
        format: 'json',
        starttime: fdsnTime(windowStart()),
        orderby: 'time',
        limit: '3000',
      });
      return parseEMSC(await getJson(`https://www.seismicportal.eu/fdsnws/event/1/query?${q}`));
    },
  },

  afad: {
    ttlMs: 30_000,
    fetch: async () => {
      const q = new URLSearchParams({
        start: fdsnTime(windowStart()),
        end: fdsnTime(new Date(Date.now() + 60_000)),
        format: 'json',
        orderby: 'timedesc',
        limit: '1000',
      });
      // deprem.afad.gov.tr bu adrese yönlendiriyor; doğrudan çağırarak bir tur kazanıyoruz
      return parseAFAD(await getJson(`https://servisnet.afad.gov.tr/apigateway/deprem/apiv2/event/filter?${q}`));
    },
  },

  // Kandilli'nin resmi bir API'si yok; lst0.asp düz metin listesi kurumun
  // kendi yayınladığı, yıllardır aynı formatta duran son 500 deprem listesi.
  kandilli: {
    ttlMs: 60_000,
    fetch: async () => {
      const res = await get('http://www.koeri.boun.edu.tr/scripts/lst0.asp', 'text/html');
      const text = new TextDecoder('windows-1254').decode(await res.arrayBuffer());
      const since = windowStart().getTime();
      return parseKandilli(text).filter((eq) => Date.parse(eq.time) >= since);
    },
  },

  ingv: fdsnSource(
    'ingv',
    'https://webservices.ingv.it/fdsnws/event/1/query',
    (id) => `https://terremoti.ingv.it/event/${encodeURIComponent(id)}`,
  ),

  geofon: fdsnSource(
    'geofon',
    'https://geofon.gfz.de/fdsnws/event/1/query',
    (id) => `https://geofon.gfz.de/eqinfo/event.php?id=${encodeURIComponent(id)}`,
    120_000,
  ),

  sed: fdsnSource(
    'sed',
    'https://eida.ethz.ch/fdsnws/event/1/query',
    () => 'http://www.seismo.ethz.ch/en/earthquakes/switzerland/last-90-days/',
  ),

  renass: fdsnSource(
    'renass',
    'https://api.franceseisme.fr/fdsnws/event/1/query',
    (id) => `https://renass.unistra.fr/fr/evenements/${encodeURIComponent(id)}`,
  ),

  usp: fdsnSource(
    'usp',
    'https://moho.iag.usp.br/fdsnws/event/1/query',
    () => 'https://www.moho.iag.usp.br/eq/latest',
    120_000,
  ),

  noa: fdsnSource(
    'noa',
    'https://eida.gein.noa.gr/fdsnws/event/1/query',
    () => 'https://www.gein.noa.gr',
  ),

  ign: {
    ttlMs: 60_000,
    fetch: async () => sinceWindow(parseIGN(await getText('https://www.ign.es/ign/RssTools/sismologia.xml'))),
  },

  ipma: {
    ttlMs: 120_000,
    fetch: async () => {
      // 3: Azorlar, 7: Portekiz anakarası ve Madeira
      const areas = await Promise.all(
        [3, 7].map((a) => getJson(`https://api.ipma.pt/open-data/observation/seismic/${a}.json`)),
      );
      return sinceWindow(areas.flatMap(parseIPMA));
    },
  },

  bmkg: {
    ttlMs: 60_000,
    fetch: async () => {
      // Son M5+ depremler ve hissedilen depremler; ikisi çakışabilir, birleştirme tekrarı ayıklar
      const [latest, felt] = await Promise.all([
        getJson('https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json'),
        getJson('https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json'),
      ]);
      const byId = new Map<string, Earthquake>();
      for (const eq of [...parseBMKG(latest), ...parseBMKG(felt)]) byId.set(eq.id, eq);
      return sinceWindow([...byId.values()]);
    },
  },

  geonet: {
    ttlMs: 60_000,
    fetch: async () => {
      const since = windowStart().getTime();
      const json = await (await get('https://api.geonet.org.nz/quake?MMI=-1', 'application/vnd.geo+json;version=2')).json();
      return parseGeoNet(json).filter((eq) => Date.parse(eq.time) >= since);
    },
  },

  ga: {
    ttlMs: 120_000,
    fetch: async () => {
      const q = new URLSearchParams({
        service: 'WFS',
        request: 'GetFeature',
        typeNames: 'earthquakes:earthquakes_seven_days',
        outputFormat: 'application/json',
        CQL_FILTER: "display_flag='Y'",
      });
      const since = windowStart().getTime();
      const json = await getJson(`https://earthquakes.ga.gov.au/geoserver/earthquakes/wfs?${q}`);
      return parseGA(json).filter((eq) => Date.parse(eq.time) >= since);
    },
  },

  jma: {
    ttlMs: 60_000,
    fetch: async () => {
      const since = windowStart().getTime();
      return parseJMA(await getJson('https://www.jma.go.jp/bosai/quake/data/list.json')).filter(
        (eq) => Date.parse(eq.time) >= since,
      );
    },
  },

  ssn: {
    ttlMs: 120_000,
    fetch: async () => {
      const since = windowStart().getTime();
      return parseSSN(await getText('http://www.ssn.unam.mx/rss/ultimos-sismos.xml')).filter(
        (eq) => Date.parse(eq.time) >= since,
      );
    },
  },
};
