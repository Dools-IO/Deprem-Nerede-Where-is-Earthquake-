import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Earthquake } from '../src/types';
import { distanceKm, isValidEarthquake, mergeEarthquakes } from '../src/lib/merge';
import { applyFilter, parseFilter } from '../src/lib/filters';
import { SOURCES, SOURCE_IDS, isSourceId } from '../src/lib/sourceInfo';

const eq = (over: Partial<Earthquake>): Earthquake => ({
  id: `${over.source ?? 'usgs'}:${Math.random()}`,
  time: '2026-10-31T10:00:00Z',
  latitude: 39,
  longitude: 28,
  depth: 10,
  magnitude: 3,
  location: 'x',
  source: 'usgs',
  ...over,
});

test('distanceKm: bilinen mesafe (İstanbul–Ankara ≈ 350 km)', () => {
  const d = distanceKm(41.01, 28.98, 39.93, 32.86);
  assert.ok(d > 340 && d < 360, String(d));
});

test('merge: aynı deprem tek kayıt olur, öncelikli kaynak gösterilir', () => {
  const out = mergeEarthquakes([
    eq({ source: 'usgs', time: '2026-10-31T10:00:05Z', latitude: 39.05 }),
    eq({ source: 'afad', time: '2026-10-31T10:00:00Z' }),
    eq({ source: 'emsc', time: '2026-10-31T10:00:02Z', magnitude: 3.2 }),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].source, 'afad');
  assert.deepEqual(new Set(out[0].alsoReportedBy), new Set(['usgs', 'emsc']));
});

test('merge: uzak veya zamanca ayrı depremler ayrı kalır, yeniden eskiye sıralı', () => {
  const out = mergeEarthquakes([
    eq({ source: 'usgs', time: '2026-10-31T10:00:00Z' }),
    eq({ source: 'emsc', time: '2026-10-31T10:00:00Z', latitude: 45 }),
    eq({ source: 'afad', time: '2026-10-31T10:05:00Z' }),
  ]);
  assert.equal(out.length, 3);
  assert.equal(out[0].time, '2026-10-31T10:05:00Z');
});

test('merge: aynı kaynaktan iki kayıt birleştirilmez', () => {
  const out = mergeEarthquakes([
    eq({ source: 'afad', time: '2026-10-31T10:00:00Z' }),
    eq({ source: 'afad', time: '2026-10-31T10:00:10Z' }),
  ]);
  assert.equal(out.length, 2);
});

test('merge: büyük depremde tolerans genişler', () => {
  const out = mergeEarthquakes([
    eq({ source: 'usgs', magnitude: 6.8, time: '2026-10-31T10:00:00Z' }),
    eq({ source: 'geofon', magnitude: 7.4, time: '2026-10-31T10:01:00Z', latitude: 40 }),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].source, 'usgs');
});

test('merge: 5000 kayıt makul sürede birleşir', () => {
  const base = Date.parse('2026-10-31T00:00:00Z');
  const ids = SOURCE_IDS;
  const input = Array.from({ length: 5000 }, (_, i) =>
    eq({
      id: `x:${i}`,
      source: ids[i % ids.length],
      time: new Date(base + i * 15_000).toISOString(),
      latitude: -60 + ((i * 7) % 120),
      longitude: -170 + ((i * 13) % 340),
    }),
  );
  const t0 = performance.now();
  mergeEarthquakes(input);
  assert.ok(performance.now() - t0 < 500);
});

test('isValidEarthquake: aralık dışı değerler reddedilir', () => {
  assert.equal(isValidEarthquake(eq({})), true);
  assert.equal(isValidEarthquake(eq({ latitude: 91 })), false);
  assert.equal(isValidEarthquake(eq({ magnitude: NaN })), false);
  assert.equal(isValidEarthquake(eq({ time: 'dün' })), false);
});

test('filtreler: parse ve uygula', () => {
  const f = parseFilter(new URLSearchParams('minmag=3&source=afad,USGS&limit=5'));
  assert.ok(!('error' in f));
  const list = [eq({ source: 'afad', magnitude: 3.5 }), eq({ source: 'emsc', magnitude: 4, alsoReportedBy: ['usgs'] }), eq({ source: 'jma', magnitude: 5 }), eq({ source: 'afad', magnitude: 2 })];
  assert.equal(applyFilter(list, f).length, 2);
  assert.deepEqual(parseFilter(new URLSearchParams('source=yok')), { error: 'Bilinmeyen kaynak: yok' });
  assert.ok('error' in parseFilter(new URLSearchParams('limit=0')));
});

test('kayıt defteri: her girdinin id alanı anahtarıyla aynı', () => {
  for (const id of SOURCE_IDS) assert.equal(SOURCES[id].id, id);
  assert.equal(isSourceId('usp'), true);
  assert.equal(isSourceId('toString'), false);
});
