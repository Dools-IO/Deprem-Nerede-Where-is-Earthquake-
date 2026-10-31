import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DICTS, internalPath, pagePath, switchPath } from '../src/lib/i18n';

test('dil adresleri: görünen adres iç yola çevrilir', () => {
  assert.equal(internalPath('/'), '/tr');
  assert.equal(internalPath('/liste'), '/tr/liste');
  assert.equal(internalPath('/gecmis'), '/tr/gecmis');
  assert.equal(internalPath('/en'), '/en');
  assert.equal(internalPath('/en/list'), '/en/liste');
  assert.equal(internalPath('/en/history'), '/en/gecmis');
  assert.equal(internalPath('/en/api-docs'), '/en/api-docs');
  // Bilinmeyen adresler dilin içinde kalır (404 o dilde gösterilir)
  assert.equal(internalPath('/yok'), '/tr/yok');
  assert.equal(internalPath('/en/nope'), '/en/nope');
});

test('dil adresleri: dil değiştirme ve sayfa bağlantıları', () => {
  assert.equal(switchPath('/liste', 'en'), '/en/list');
  assert.equal(switchPath('/en/history', 'tr'), '/gecmis');
  assert.equal(switchPath('/', 'en'), '/en');
  assert.equal(switchPath('/en', 'tr'), '/');
  assert.equal(switchPath('/bilinmeyen', 'en'), '/en');
  assert.equal(pagePath('en', '/liste'), '/en/list');
  assert.equal(pagePath('tr', ''), '/');
});

test('sözlük: iki dilde de aynı anahtarlar dolu', () => {
  for (const key of Object.keys(DICTS.tr) as (keyof typeof DICTS.tr)[]) {
    assert.equal(typeof DICTS.en[key], typeof DICTS.tr[key], key);
    if (typeof DICTS.en[key] === 'string') assert.ok(DICTS.en[key], key);
  }
});
