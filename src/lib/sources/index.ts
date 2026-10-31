import 'server-only';
import type { Earthquake, EarthquakeFeed, SourceId, SourceStatus } from '@/types';
import { isValidEarthquake, mergeEarthquakes } from '@/lib/merge';
import { PUBLIC_SOURCE_IDS, SOURCES, SOURCE_IDS } from '@/lib/sourceInfo';
import { FETCHERS, WINDOW_HOURS } from './fetchers';
import { saveReports } from '@/lib/archive';

/*
 * Sunucu tarafı önbellek.
 * - Her kaynak kendi TTL'iyle ayrı önbelleklenir; biri yavaşsa diğerlerini beklemez.
 * - Aynı anda gelen istekler tek bir yukarı akış isteğini paylaşır (in-flight).
 * - Bir kaynak hata verirse son başarılı verisi gösterilmeye devam eder.
 */

interface Entry {
  data: Earthquake[];
  updatedAt: number;
  error?: string;
  inflight?: Promise<void>;
  lastAttempt: number;
}

const cache = new Map<SourceId, Entry>();
// Hata durumunda kaynağı her istekte dövmemek için
const RETRY_AFTER_ERROR_MS = 30_000;
// İlk yüklemede yavaş bir kaynağı en fazla bu kadar bekle; gerisi sonraki istekte gelir
const FIRST_LOAD_BUDGET_MS = 1_500;
// Son başarılı veri bundan eskiyse göstermeyi bırak
const MAX_STALE_MS = 30 * 60_000;

function refresh(id: SourceId, entry: Entry): Promise<void> {
  if (entry.inflight) return entry.inflight;
  entry.lastAttempt = Date.now();
  entry.inflight = FETCHERS[id]
    .fetch()
    .then((data) => {
      entry.data = data.filter((eq) => isValidEarthquake(eq));
      entry.updatedAt = Date.now();
      entry.error = undefined;
      // Kalıcı arşive arka planda yaz (DATABASE_URL yoksa hiçbir şey yapmaz)
      void saveReports(id, entry.data);
    })
    .catch((err: unknown) => {
      entry.error = err instanceof Error ? err.message : 'Bilinmeyen hata';
      console.warn(`[${id}] veri alınamadı: ${entry.error}`);
    })
    .finally(() => {
      entry.inflight = undefined;
    });
  return entry.inflight;
}

async function getSource(id: SourceId): Promise<Entry> {
  let entry = cache.get(id);
  if (!entry) {
    entry = { data: [], updatedAt: 0, lastAttempt: 0 };
    cache.set(id, entry);
  }
  const now = Date.now();
  const fresh = now - entry.updatedAt < FETCHERS[id].ttlMs;
  const backingOff = entry.error && now - entry.lastAttempt < RETRY_AFTER_ERROR_MS;
  if (!fresh && !backingOff) {
    if (entry.updatedAt === 0 && !entry.error) {
      // İlk yükleme: kısa bir süre bekle, yavaş kaynak tüm yanıtı geciktirmesin
      const pending = refresh(id, entry);
      await Promise.race([pending, new Promise((r) => setTimeout(r, FIRST_LOAD_BUDGET_MS))]);
    } else {
      // Bayat ama elimizde veri var: hemen dön, arkada yenile (stale-while-revalidate)
      void refresh(id, entry);
    }
  }
  return entry;
}

function status(id: SourceId, entry: Entry): SourceStatus {
  return {
    id,
    name: SOURCES[id].name,
    ok: !entry.error,
    ...(entry.updatedAt === 0 && entry.inflight ? { pending: true } : {}),
    count: entry.data.length,
    updatedAt: entry.updatedAt ? new Date(entry.updatedAt).toISOString() : null,
    ...(entry.error ? { error: entry.error } : {}),
  };
}

const usable = (entry: Entry) => entry.updatedAt > 0 && Date.now() - entry.updatedAt < MAX_STALE_MS;

export async function getSourceEarthquakes(id: SourceId) {
  const entry = await getSource(id);
  return { status: status(id, entry), earthquakes: usable(entry) ? entry.data : [] };
}

/** Sunucu açılırken önbelleği ısıtmak için (instrumentation.ts) */
export function warmUp(): void {
  for (const id of SOURCE_IDS) void getSource(id);
}

/**
 * Akışın kapsamı. `app`: sitedeki harita, tüm kaynaklar. `public`: herkese açık API,
 * yalnız yeniden dağıtım lisansı olan kaynaklar (sourceInfo'da publicApi: true).
 */
export type FeedScope = 'app' | 'public';

const mergedCache = new Map<FeedScope, { key: string; value: Earthquake[] }>();

export async function getEarthquakeFeed(scope: FeedScope = 'app'): Promise<EarthquakeFeed> {
  const ids = scope === 'public' ? PUBLIC_SOURCE_IDS : SOURCE_IDS;
  const entries = await Promise.all(ids.map(async (id) => [id, await getSource(id)] as const));

  // Birleştirme yalnızca bir kaynağın verisi değiştiğinde yeniden yapılır
  const key = entries.map(([id, e]) => `${id}:${usable(e) ? e.updatedAt : 0}`).join('|');
  let merged = mergedCache.get(scope);
  if (merged?.key !== key) {
    const all = entries.flatMap(([, e]) => (usable(e) ? e.data : []));
    merged = { key, value: mergeEarthquakes(all) };
    mergedCache.set(scope, merged);
  }

  return {
    updatedAt: new Date().toISOString(),
    windowHours: WINDOW_HOURS,
    count: merged.value.length,
    sources: entries.map(([id, e]) => status(id, e)),
    earthquakes: merged.value,
  };
}
