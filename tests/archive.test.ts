import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Earthquake } from '../src/types';
import { parseHistoryParams } from '../src/lib/filters';

const NOW = Date.parse('2026-10-31T12:00:00Z');

test('geçmiş parametreleri: varsayılan son 24 saat, sınırlar', () => {
  const p = parseHistoryParams(new URLSearchParams(''), NOW, 31);
  assert.ok(!('error' in p));
  if ('error' in p) return;
  assert.equal(p.to.getTime(), NOW);
  assert.equal(p.from.getTime(), NOW - 86_400_000);
  assert.equal(p.limit, 2000);

  const q = parseHistoryParams(new URLSearchParams('from=2026-10-01&to=2026-10-08&minmag=3&source=afad'), NOW, 31);
  assert.ok(!('error' in q));
  if ('error' in q) return;
  assert.equal(q.minMagnitude, 3);
  assert.deepEqual(q.sources, ['afad']);

  assert.ok('error' in parseHistoryParams(new URLSearchParams('from=2026-01-01&to=2026-03-01'), NOW, 31));
  assert.ok('error' in parseHistoryParams(new URLSearchParams('from=2026-10-08&to=2026-10-01'), NOW, 31));
  assert.ok('error' in parseHistoryParams(new URLSearchParams('from=dün'), NOW, 31));
});

// Gerçek veritabanı testi: yalnızca TEST_DATABASE_URL verilirse çalışır (ör. yerel Postgres)
const DB = process.env.TEST_DATABASE_URL;
test('arşiv: yazma, tekrar yazmama, birleştirerek okuma', { skip: !DB && 'TEST_DATABASE_URL yok' }, async () => {
  process.env.DATABASE_URL = DB;
  const { saveReports, queryHistory, closeArchive } = await import('../src/lib/archive');
  const postgres = (await import('postgres')).default;
  const sql = postgres(DB!, { onnotice: () => {} });
  await sql`DROP TABLE IF EXISTS earthquake_reports`;

  const eq = (over: Partial<Earthquake>): Earthquake => ({
    id: 'x', time: '2026-10-30T10:00:00.000Z', latitude: 39, longitude: 28, depth: 10,
    magnitude: 3.1, location: 'Test', source: 'afad', ...over,
  });
  await saveReports('afad', [eq({ id: 'afad:1', magType: 'ML', url: 'https://a/1' })]);
  await saveReports('emsc', [eq({ id: 'emsc:1', source: 'emsc', time: '2026-10-30T10:00:03.000Z', magnitude: 3.0 })]);
  await saveReports('usgs', [eq({ id: 'usgs:far', source: 'usgs', latitude: -30, magnitude: 5.2 })]);
  // Değişmeyen kayıt tekrar yazılmaz, değişen güncellenir
  await saveReports('afad', [eq({ id: 'afad:1', magType: 'ML', url: 'https://a/1', magnitude: 3.2 })]);

  const rows = await sql`SELECT id, magnitude FROM earthquake_reports ORDER BY id`;
  assert.equal(rows.length, 3);
  assert.equal(Math.round(rows.find((r) => r.id === 'afad:1')!.magnitude * 10) / 10, 3.2);

  const res = await queryHistory({ from: new Date('2026-10-30T00:00:00Z'), to: new Date('2026-10-31T00:00:00Z'), limit: 100 });
  assert.equal(res.count, 2); // AFAD+EMSC tek deprem, USGS ayrı
  const merged = res.earthquakes.find((e) => e.source === 'afad')!;
  assert.deepEqual(merged.alsoReportedBy, ['emsc']);
  assert.equal(merged.magnitude, 3.2);
  assert.equal(merged.time, '2026-10-30T10:00:00.000Z');

  const big = await queryHistory({ from: new Date('2026-10-30T00:00:00Z'), to: new Date('2026-10-31T00:00:00Z'), minMagnitude: 5, limit: 100 });
  assert.deepEqual(big.earthquakes.map((e) => e.id), ['usgs:far']);

  await sql`DROP TABLE earthquake_reports`;
  await sql.end();
  await closeArchive();
});
