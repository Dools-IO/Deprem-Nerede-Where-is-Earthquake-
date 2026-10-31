import type { Earthquake, SourceId } from '../../types';

/*
 * Her kaynağın ham yanıtını ortak Earthquake tipine çeviren saf fonksiyonlar.
 * Ağ erişimi yok; bu sayede kayıtlı örnek yanıtlarla kolayca test edilebilir.
 */

const num = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return NaN;
};

const round = (v: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

function make(
  source: SourceId,
  rawId: string,
  time: Date,
  latitude: number,
  longitude: number,
  depth: number,
  magnitude: number,
  location: string,
  extra: Partial<Earthquake> = {},
): Earthquake {
  return {
    id: `${source}:${rawId}`,
    time: time.toISOString(),
    latitude: round(latitude, 4),
    longitude: round(longitude, 4),
    depth: round(Number.isFinite(depth) ? depth : 0, 1),
    magnitude: round(magnitude, 1),
    location: location.trim(),
    source,
    ...extra,
  };
}

const validDate = (d: Date) => Number.isFinite(d.getTime());

/* ---------- USGS GeoJSON ---------- */
export function parseUSGS(json: any): Earthquake[] {
  const out: Earthquake[] = [];
  for (const f of json?.features ?? []) {
    const p = f?.properties;
    const c = f?.geometry?.coordinates;
    if (!p || !Array.isArray(c) || p.type !== 'earthquake' || p.mag == null) continue;
    const time = new Date(p.time);
    if (!validDate(time)) continue;
    out.push(
      make('usgs', String(f.id), time, c[1], c[0], c[2], num(p.mag), p.place ?? '', {
        magType: p.magType ?? undefined,
        url: p.url ?? undefined,
      }),
    );
  }
  return out;
}

/* ---------- EMSC (seismicportal FDSN JSON ve WebSocket) ---------- */
export function emscFeatureToEarthquake(f: any): Earthquake | null {
  const p = f?.properties;
  if (!p || p.mag == null) return null;
  const unid = String(p.unid ?? f.id ?? '');
  if (!unid) return null;
  const time = new Date(p.time);
  if (!validDate(time)) return null;
  return make('emsc', unid, time, num(p.lat), num(p.lon), num(p.depth), num(p.mag), p.flynn_region ?? '', {
    magType: p.magtype ?? undefined,
    url: `https://www.seismicportal.eu/eventdetails.html?unid=${encodeURIComponent(unid)}`,
  });
}

export function parseEMSC(json: any): Earthquake[] {
  const out: Earthquake[] = [];
  for (const f of json?.features ?? []) {
    const eq = emscFeatureToEarthquake(f);
    if (eq) out.push(eq);
  }
  return out;
}

/* ---------- FDSN text (INGV, GEOFON) ----------
 * #EventID|Time|Latitude|Longitude|Depth/km|Author|Catalog|Contributor|ContributorID|MagType|Magnitude|MagAuthor|EventLocationName|EventType
 */
export function parseFdsnText(
  text: string,
  source: SourceId,
  urlFor: (eventId: string) => string,
): Earthquake[] {
  const out: Earthquake[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const c = line.split('|');
    if (c.length < 13) continue;
    const eventType = (c[13] ?? '').trim().toLowerCase();
    if (eventType && eventType !== 'earthquake') continue;
    const t = c[1].trim();
    const time = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(t) ? t : `${t}Z`);
    if (!validDate(time)) continue;
    const id = c[0].trim();
    out.push(
      make(source, id, time, num(c[2]), num(c[3]), num(c[4]), num(c[10]), c[12] ?? '', {
        magType: c[9]?.trim() || undefined,
        url: urlFor(id),
      }),
    );
  }
  return out;
}

/* ---------- AFAD apiv2 (tarihler UTC) ---------- */
export function parseAFAD(json: any): Earthquake[] {
  const out: Earthquake[] = [];
  if (!Array.isArray(json)) return out;
  for (const e of json) {
    const id = String(e?.eventID ?? '');
    if (!id || !e.date) continue;
    const time = new Date(/[zZ]$/.test(e.date) ? e.date : `${e.date}Z`);
    if (!validDate(time)) continue;
    out.push(
      make('afad', id, time, num(e.latitude), num(e.longitude), num(e.depth), num(e.magnitude), e.location ?? '', {
        magType: e.type ?? undefined,
        url: `https://deprem.afad.gov.tr/event-detail/${encodeURIComponent(id)}`,
      }),
    );
  }
  return out;
}

/* ---------- Kandilli lst0.asp (düz metin liste, Türkiye saati UTC+3) ----------
 * 2025.04.26 12:01:23  39.1234   28.1234        7.0      -.-  1.5  -.-   SINDIRGI (BALIKESIR)    İlksel
 */
const KANDILLI_LINE =
  /^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(\d+(?:\.\d+)?)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+?)\s{2,}(\S.*)$/;

export function parseKandilli(text: string): Earthquake[] {
  const out: Earthquake[] = [];
  const pre = text.match(/<pre>([\s\S]*?)<\/pre>/i);
  const body = pre ? pre[1] : text;
  for (const raw of body.split(/\r?\n/)) {
    const m = KANDILLI_LINE.exec(raw.trim());
    if (!m) continue;
    const [, y, mo, d, h, mi, s, lat, lon, depth, md, ml, mw, place] = m;
    const time = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+03:00`);
    if (!validDate(time)) continue;
    // Kandilli'nin birincil büyüklüğü ML; yoksa Mw, o da yoksa MD
    const pick = [ml, mw, md].map((v) => (v === '-.-' ? NaN : Number(v)));
    const idx = pick.findIndex((v) => Number.isFinite(v));
    if (idx < 0) continue;
    const magnitude = pick[idx];
    const magType = ['ML', 'Mw', 'MD'][idx];
    const id = `${y}${mo}${d}${h}${mi}${s}_${lat}_${lon}`;
    out.push(
      make('kandilli', id, time, Number(lat), Number(lon), Number(depth), magnitude, place, {
        magType,
        url: 'http://www.koeri.boun.edu.tr/scripts/lst0.asp',
      }),
    );
  }
  return out;
}

/* ---------- GeoNet GeoJSON ---------- */
export function parseGeoNet(json: any): Earthquake[] {
  const out: Earthquake[] = [];
  for (const f of json?.features ?? []) {
    const p = f?.properties;
    const c = f?.geometry?.coordinates;
    if (!p?.publicID || !Array.isArray(c) || p.magnitude == null) continue;
    if (p.quality === 'deleted') continue;
    const time = new Date(p.time);
    if (!validDate(time)) continue;
    out.push(
      make('geonet', p.publicID, time, c[1], c[0], num(p.depth), num(p.magnitude), p.locality ?? 'New Zealand', {
        url: `https://www.geonet.org.nz/earthquake/${encodeURIComponent(p.publicID)}`,
      }),
    );
  }
  return out;
}

/* ---------- Geoscience Australia WFS GeoJSON ---------- */
export function parseGA(json: any): Earthquake[] {
  const out: Earthquake[] = [];
  for (const f of json?.features ?? []) {
    const p = f?.properties;
    const c = f?.geometry?.coordinates;
    if (!p || !Array.isArray(c) || p.preferred_magnitude == null) continue;
    const time = new Date(p.epicentral_time ?? p.origin_time);
    if (!validDate(time)) continue;
    const id = String(p.event_id ?? f.id ?? time.getTime());
    out.push(
      make('ga', id, time, c[1], c[0], num(p.depth), num(p.preferred_magnitude), p.description ?? 'Australia', {
        magType: p.preferred_magnitude_type ?? undefined,
        url: `https://earthquakes.ga.gov.au/event/${encodeURIComponent(id)}`,
      }),
    );
  }
  return out;
}

/* ---------- JMA bosai list.json ----------
 * cod: "+35.7+137.2-10000/" -> enlem, boylam, derinlik (metre, negatif = aşağı)
 * Aynı deprem için birden çok bülten olabilir; en güncel olanı (listede ilk) alınır.
 */
const JMA_COD = /^([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)([+-]\d+)?/;

export function parseJMA(json: any): Earthquake[] {
  const out: Earthquake[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(json)) return out;
  for (const e of json) {
    const eid = String(e?.eid ?? '');
    if (!eid || seen.has(eid)) continue;
    const m = typeof e.cod === 'string' ? JMA_COD.exec(e.cod) : null;
    const magnitude = num(e.mag);
    if (!m || !Number.isFinite(magnitude)) continue;
    const time = new Date(e.at);
    if (!validDate(time)) continue;
    seen.add(eid);
    const depth = m[3] ? Math.abs(Number(m[3])) / 1000 : 0;
    out.push(
      make('jma', eid, time, Number(m[1]), Number(m[2]), depth, magnitude, e.en_anm || e.anm || 'Japan', {
        magType: 'Mj',
        url: 'https://www.data.jma.go.jp/multi/quake/index.html?lang=en',
      }),
    );
  }
  return out;
}

/* ---------- SSN Meksika RSS (saatler Meksika merkez saati, UTC-6) ---------- */
export function parseSSN(xml: string): Earthquake[] {
  const out: Earthquake[] = [];
  const decode = (s: string) =>
    s
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  for (const item of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
    const title = decode(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
    const desc = decode(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '').replace(/<[^>]+>/g, ' ');
    const [magStr, ...rest] = title.split(',');
    const magnitude = Number(magStr);
    const ll = desc.match(/Lat\/Lon:\s*(-?[\d.]+)\s*\/\s*(-?[\d.]+)/);
    const dep = desc.match(/Profundidad:\s*([\d.]+)/);
    const date = desc.match(/Fecha:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
    if (!ll || !date || !Number.isFinite(magnitude)) continue;
    const time = new Date(`${date[1]}T${date[2]}-06:00`);
    if (!validDate(time)) continue;
    out.push(
      make('ssn', `${date[1]}T${date[2]}_${ll[1]}_${ll[2]}`, time, Number(ll[1]), Number(ll[2]), dep ? Number(dep[1]) : 0, magnitude, rest.join(',').trim() || 'México', {
        url: 'http://www.ssn.unam.mx/sismicidad/ultimos/',
      }),
    );
  }
  return out;
}

/* ---------- IGN İspanya GeoRSS ----------
 * <title>-Info.terremoto: 30/10/2026 1:26:27</title>
 * <description>Se ha producido un terremoto de magnitud 2.6 en NE SIDI SLIMANE.MAC en la fecha ...</description>
 * <link>...detailTerremoto?evid=es2026vfzwg</link> <geo:lat>34.3137</geo:lat> <geo:long>-5.9127</geo:long>
 * IGN kataloğu saatleri UTC verir.
 */
export function parseIGN(xml: string): Earthquake[] {
  const out: Earthquake[] = [];
  const tag = (item: string, name: string) =>
    item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() ?? '';
  for (const item of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
    const desc = tag(item, 'description');
    const link = tag(item, 'link').replace(/&amp;/g, '&');
    const date = (tag(item, 'title') + ' ' + desc).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
    const mag = desc.match(/magnitud\s+(-?[\d.]+)/i);
    const place = desc.match(/\sen\s+(.+?)\s+en la fecha/i);
    const lat = Number(tag(item, 'geo:lat'));
    const lon = Number(tag(item, 'geo:long'));
    if (!date || !mag) continue;
    const pad = (v: string) => v.padStart(2, '0');
    const time = new Date(`${date[3]}-${pad(date[2])}-${pad(date[1])}T${pad(date[4])}:${date[5]}:${date[6]}Z`);
    if (!validDate(time)) continue;
    const evid = link.match(/evid=([\w-]+)/)?.[1] ?? `${time.getTime()}_${lat}_${lon}`;
    out.push(
      make('ign', evid, time, lat, lon, NaN, Number(mag[1]), place?.[1] ?? '', {
        url: link || undefined,
      }),
    );
  }
  return out;
}

/* ---------- IPMA Portekiz açık veri (saatler UTC, eksik büyüklük -99) ---------- */
export function parseIPMA(json: any): Earthquake[] {
  const out: Earthquake[] = [];
  for (const e of json?.data ?? []) {
    const magnitude = num(e?.magnitud);
    if (!Number.isFinite(magnitude) || magnitude <= -9) continue;
    const time = new Date(/[zZ]$/.test(e.time) ? e.time : `${e.time}Z`);
    if (!validDate(time)) continue;
    const lat = num(e.lat);
    const lon = num(e.lon);
    out.push(
      make('ipma', e.sismoId || `${e.time}_${e.lat}_${e.lon}`, time, lat, lon, num(e.depth), magnitude, e.obsRegion ?? '', {
        magType: e.magType ? `M${e.magType}` : undefined,
        url: 'https://www.ipma.pt/en/geofisica/sismologia/',
      }),
    );
  }
  return out;
}

/* ---------- BMKG Endonezya açık veri ----------
 * { Infogempa: { gempa: [{ DateTime: "2026-10-29T20:32:13+00:00", Coordinates: "-4.40,132.49",
 *   Magnitude: "5.3", Kedalaman: "10 km", Wilayah: "..." }] } }
 */
export function parseBMKG(json: any): Earthquake[] {
  const out: Earthquake[] = [];
  const list = json?.Infogempa?.gempa;
  for (const e of Array.isArray(list) ? list : list ? [list] : []) {
    const [lat, lon] = String(e?.Coordinates ?? '').split(',').map(Number);
    const time = new Date(e?.DateTime);
    if (!validDate(time)) continue;
    out.push(
      make('bmkg', `${time.getTime()}_${lat}_${lon}`, time, lat, lon, parseFloat(e.Kedalaman), num(e.Magnitude), e.Wilayah ?? '', {
        url: 'https://www.bmkg.go.id/gempabumi/gempabumi-terkini',
      }),
    );
  }
  return out;
}
