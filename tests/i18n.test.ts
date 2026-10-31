import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DICTIONARIES, LOCALES, localePath, preferredLocale, splitLocale } from '../src/i18n';
import { SOURCES } from '../src/lib/sourceInfo';
import { getFormatters } from '../src/lib/format';

test('dil adresleri: varsayılan dil öneksiz', () => {
  assert.equal(localePath('tr', '/'), '/');
  assert.equal(localePath('tr', '/liste'), '/liste');
  assert.equal(localePath('en', '/'), '/en');
  assert.equal(localePath('en', '/liste'), '/en/liste');
  assert.deepEqual(splitLocale('/en/gecmis'), { locale: 'en', path: '/gecmis' });
  assert.deepEqual(splitLocale('/en'), { locale: 'en', path: '/' });
  assert.deepEqual(splitLocale('/liste'), { locale: 'tr', path: '/liste' });
  assert.deepEqual(splitLocale('/'), { locale: 'tr', path: '/' });
  // İç yol (rewrite sonrası) da çözülür
  assert.deepEqual(splitLocale('/tr/liste'), { locale: 'tr', path: '/liste' });
  // Bilinmeyen önek dil sayılmaz
  assert.deepEqual(splitLocale('/de/liste'), { locale: 'tr', path: '/de/liste' });
});

test('tarayıcı dili: Türkçe yoksa İngilizce, başlık yoksa karar yok', () => {
  assert.equal(preferredLocale('tr-TR,tr;q=0.9,en;q=0.8'), 'tr');
  assert.equal(preferredLocale('en-US,en;q=0.9,tr;q=0.5'), 'tr');
  assert.equal(preferredLocale('de-DE,de;q=0.9,en;q=0.8'), 'en');
  assert.equal(preferredLocale(null), null);
});

/** Sözlüğün tüm yaprakları: 'common.map' → değer */
function leaves(obj: object, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') for (const [kk, vv] of leaves(v, key)) out.set(kk, vv);
    else out.set(key, v);
  }
  return out;
}

test('sözlükler: her dilde aynı anahtarlar, boş metin yok', () => {
  const base = leaves(DICTIONARIES.tr);
  for (const locale of LOCALES) {
    const dict = leaves(DICTIONARIES[locale]);
    assert.deepEqual([...dict.keys()].sort(), [...base.keys()].sort(), locale);
    for (const [key, value] of dict) {
      if (typeof value === 'string') assert.ok(value.trim(), `${locale}.${key} boş`);
      else assert.equal(typeof value, typeof base.get(key), `${locale}.${key}`);
    }
  }
  assert.equal(DICTIONARIES.en.common.earthquakes('1,234'), '1,234 earthquakes');
  assert.equal(DICTIONARIES.tr.list.heading(24, '700'), 'Son 24 saat · 700 deprem');
});

test('her kaynağın bölge adı her dilde var', () => {
  for (const s of Object.values(SOURCES)) {
    for (const locale of LOCALES) assert.ok(s.region[locale]?.trim(), `${s.id} ${locale}`);
  }
});

test('biçimlendiriciler dile göre', () => {
  const now = Date.parse('2026-10-31T12:00:00Z');
  const fiveMin = '2026-10-31T11:55:00Z';
  assert.equal(getFormatters('tr').relative(fiveMin, now), '5 dakika önce');
  assert.equal(getFormatters('en').relative(fiveMin, now), '5 minutes ago');
  assert.equal(getFormatters('tr').number(12345), '12.345');
  assert.equal(getFormatters('en').number(12345), '12,345');
});
