import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAFAD,
  parseBMKG,
  parseEMSC,
  parseFdsnText,
  parseGA,
  parseIGN,
  parseIPMA,
  parseJMA,
  parseKandilli,
  parseSSN,
  parseUSGS,
} from '../src/lib/sources/parsers';

test('USGS: yalnızca deprem tipindeki kayıtlar, koordinat sırası lon/lat/derinlik', () => {
  const out = parseUSGS({
    features: [
      {
        id: 'us7000abcd',
        properties: { type: 'earthquake', mag: 4.56, place: '10 km N of X', time: 1761868800000, magType: 'mb', url: 'https://u' },
        geometry: { coordinates: [27.1234567, 38.7654321, 12.34] },
      },
      { id: 'q1', properties: { type: 'quarry blast', mag: 1.2, time: 1761868800000 }, geometry: { coordinates: [0, 0, 0] } },
    ],
  });
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], {
    id: 'usgs:us7000abcd',
    time: '2025-10-31T00:00:00.000Z',
    latitude: 38.7654,
    longitude: 27.1235,
    depth: 12.3,
    magnitude: 4.6,
    location: '10 km N of X',
    source: 'usgs',
    magType: 'mb',
    url: 'https://u',
  });
});

test('EMSC: unid kimlik olur, büyüklüğü olmayan atlanır', () => {
  const out = parseEMSC({
    features: [
      { properties: { unid: '20261031_0000001', time: '2026-10-31T10:00:00.0Z', lat: 40.1, lon: 29.2, depth: 7, mag: 3.1, magtype: 'ml', flynn_region: 'WESTERN TURKEY' } },
      { properties: { unid: 'x', time: '2026-10-31T10:00:00Z', lat: 1, lon: 1, depth: 1, mag: null } },
    ],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'emsc:20261031_0000001');
  assert.equal(out[0].location, 'WESTERN TURKEY');
  assert.match(out[0].url!, /unid=20261031_0000001$/);
});

test('FDSN text: saat dilimi eki yoksa UTC kabul edilir, deprem dışı olaylar atlanır', () => {
  const text = [
    '#EventID|Time|Latitude|Longitude|Depth/km|Author|Catalog|Contributor|ContributorID|MagType|Magnitude|MagAuthor|EventLocationName|EventType',
    '44001|2026-10-31T08:15:30.120000|42.5|13.3|9.8|SURVEY-INGV||||ML|2.4|--|3 km W Norcia (PG)|earthquake',
    '44002|2026-10-31T08:20:00|42.5|13.3|0|SURVEY-INGV||||ML|1.0|--|Cava|quarry blast',
    'bozuk satır',
  ].join('\n');
  const out = parseFdsnText(text, 'ingv', (id) => `https://e/${id}`);
  assert.equal(out.length, 1);
  assert.equal(out[0].time, '2026-10-31T08:15:30.120Z');
  assert.equal(out[0].magType, 'ML');
  assert.equal(out[0].url, 'https://e/44001');
  assert.equal(out[0].source, 'ingv');
});

test('AFAD: tarih UTC olarak yorumlanır', () => {
  const out = parseAFAD([
    { eventID: '654321', date: '2026-10-31T09:00:00', latitude: '39.2', longitude: '28.1', depth: '7.0', magnitude: '3.2', type: 'ML', location: 'Sındırgı (Balıkesir)' },
  ]);
  assert.equal(out[0].time, '2026-10-31T09:00:00.000Z');
  assert.equal(out[0].id, 'afad:654321');
  assert.equal(out[0].magnitude, 3.2);
});

test('Kandilli: Türkiye saati UTC+3 çevrilir, ML > Mw > MD önceliği', () => {
  const text = `\u003cpre>
Tarih      Saat      Enlem(N)  Boylam(E) Derinlik(km)  MD   ML   Mw    Yer                                             Çözüm Niteliği
---------- --------  --------  -------  ----------    ------------    --------------                                  --------------
2026.10.31 12:01:23  39.1234   28.1234        7.0      -.-  1.5  -.-   SINDIRGI (BALIKESIR)                              İlksel
2026.10.31 11:00:00  38.0000   27.0000        5.1      2.0  -.-  -.-   EGE DENIZI                                        İlksel
\u003c/pre>`;
  const out = parseKandilli(text);
  assert.equal(out.length, 2);
  assert.equal(out[0].time, '2026-10-31T09:01:23.000Z');
  assert.equal(out[0].magnitude, 1.5);
  assert.equal(out[0].magType, 'ML');
  assert.equal(out[0].location, 'SINDIRGI (BALIKESIR)');
  assert.equal(out[1].magType, 'MD');
});

test('JMA: cod alanından konum/derinlik, aynı olayın eski bültenleri atlanır', () => {
  const out = parseJMA([
    { eid: '20261031120000', at: '2026-10-31T12:00:00+09:00', cod: '+35.7+137.2-10000/', mag: '4.1', en_anm: 'Gifu' },
    { eid: '20261031120000', at: '2026-10-31T12:00:00+09:00', cod: '+35.0+137.0-20000/', mag: '4.0', en_anm: 'Gifu' },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].time, '2026-10-31T03:00:00.000Z');
  assert.deepEqual([out[0].latitude, out[0].longitude, out[0].depth], [35.7, 137.2, 10]);
});

test('SSN: saatler UTC-6 olarak yorumlanır', () => {
  const xml = `\u003crss>\u003cchannel>\u003citem>\u003ctitle>4.2, 25 km al SUR de PINOTEPA, OAX\u003c/title>
\u003cdescription>\u003c![CDATA[\u003cp>Fecha: 2026-10-31 06:10:00 Lat/Lon: 16.12/-98.05 Profundidad: 15.3 km\u003c/p>]]>\u003c/description>\u003c/item>\u003c/channel>\u003c/rss>`;
  const out = parseSSN(xml);
  assert.equal(out.length, 1);
  assert.equal(out[0].time, '2026-10-31T12:10:00.000Z');
  assert.equal(out[0].location, '25 km al SUR de PINOTEPA, OAX');
  assert.equal(out[0].depth, 15.3);
});

test('IGN: GeoRSS, saat UTC, evid kimlik olur', () => {
  const xml = `\u003crss>\u003cchannel>\u003citem>\u003ctitle>-Info.terremoto: 30/10/2026 1:26:27\u003c/title>
\u003clink>https://www.ign.es/web/ign/portal/sis-catalogo-terremotos/-/catalogo-terremotos/detailTerremoto?evid=es2026vfzwg\u003c/link>
\u003cdescription>Se ha producido un terremoto de magnitud 2.6 en NE SIDI SLIMANE.MAC en la fecha 30/10/2026 1:26:27\u003c/description>
\u003cgeo:lat>34.3137\u003c/geo:lat>\u003cgeo:long>-5.9127\u003c/geo:long>\u003c/item>\u003c/channel>\u003c/rss>`;
  const out = parseIGN(xml);
  assert.equal(out[0].id, 'ign:es2026vfzwg');
  assert.equal(out[0].time, '2026-10-30T01:26:27.000Z');
  assert.equal(out[0].location, 'NE SIDI SLIMANE.MAC');
  assert.equal(out[0].magnitude, 2.6);
});

test('IPMA: -99 büyüklük atlanır', () => {
  const out = parseIPMA({
    data: [
      { sismoId: 'a1', time: '2026-10-31T01:02:03', lat: '38.5', lon: '-28.1', depth: 10, magnitud: '2.3', magType: 'L', obsRegion: 'Faial' },
      { sismoId: 'a2', time: '2026-10-31T01:02:03', lat: '38.5', lon: '-28.1', depth: 10, magnitud: '-99.0' },
    ],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].magType, 'ML');
  assert.equal(out[0].time, '2026-10-31T01:02:03.000Z');
});

test('BMKG: tekil nesne de dizi gibi işlenir', () => {
  const out = parseBMKG({
    Infogempa: { gempa: { DateTime: '2026-10-29T20:32:13+00:00', Coordinates: '-4.40,132.49', Magnitude: '5.3', Kedalaman: '10 km', Wilayah: 'Laut Banda' } },
  });
  assert.equal(out.length, 1);
  assert.deepEqual([out[0].latitude, out[0].longitude, out[0].depth, out[0].magnitude], [-4.4, 132.49, 10, 5.3]);
});

test('GA: origin_time (UTC) kullanılır, yerel saatli epicentral_time değil', () => {
  const out = parseGA({
    features: [
      {
        geometry: { coordinates: [168.5, -17.7] },
        properties: {
          event_id: 'ga2026vanuatu',
          origin_time: '2026-10-31T11:31:15.963Z',
          epicentral_time: '2026-10-31T22:31:15.963Z',
          preferred_magnitude: 5.1384,
          depth: 31.2,
          description: 'Offshore Vanuatu',
        },
      },
    ],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].time, '2026-10-31T11:31:15.963Z');
});

test('isValidEarthquake: ileri tarihli kayıtlar reddedilir', async () => {
  const { isValidEarthquake } = await import('../src/lib/merge');
  const base = { id: 'x', latitude: 0, longitude: 0, depth: 10, magnitude: 3, location: '', source: 'usgs' as const };
  const now = Date.parse('2026-10-31T19:50:00Z');
  assert.equal(isValidEarthquake({ ...base, time: '2026-10-31T19:49:00Z' }, now), true);
  assert.equal(isValidEarthquake({ ...base, time: '2026-10-31T22:31:15Z' }, now), false);
});
