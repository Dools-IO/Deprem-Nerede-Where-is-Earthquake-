import 'server-only';
import postgres from 'postgres';
import type { Earthquake, SourceId } from '@/types';
import { mergeEarthquakes } from '@/lib/merge';

/*
 * Kalıcı deprem arşivi (PostgreSQL). DATABASE_URL tanımlı değilse tamamen devre dışıdır ve
 * uygulama eskisi gibi yalnızca son 24 saati bellekten gösterir.
 *
 * Kaynakların ham kayıtları saklanır (birleştirilmiş hâli değil): bir depremi önce EMSC,
 * birkaç dakika sonra AFAD raporladığında birleştirmenin "asıl" kaydı değişebilir. Ham kayıt
 * saklayıp sorgu anında birleştirmek hem kayıpsız hem de tekrarsızdır.
 */

const DATABASE_URL = process.env.DATABASE_URL;

/** Tek sorguda birleştirilecek en fazla ham kayıt; çok geniş aralıklar sınırlanır */
const MAX_ROWS = 50_000;
/** Geçmiş sorgusunun en fazla kapsayabileceği gün */
export const MAX_RANGE_DAYS = 31;
const BATCH = 500;

let sql: postgres.Sql | null = null;
let ready: Promise<void> | null = null;

export const archiveEnabled = () => Boolean(DATABASE_URL);

async function migrate(db: postgres.Sql): Promise<void> {
  await db`
    CREATE TABLE IF NOT EXISTS earthquake_reports (
      id          text PRIMARY KEY,
      source      text NOT NULL,
      time        timestamptz NOT NULL,
      latitude    double precision NOT NULL,
      longitude   double precision NOT NULL,
      depth       real NOT NULL,
      magnitude   real NOT NULL,
      mag_type    text,
      location    text NOT NULL,
      url         text,
      first_seen  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    )`;
  await db`CREATE INDEX IF NOT EXISTS earthquake_reports_time_idx ON earthquake_reports (time DESC)`;
}

async function getDb(): Promise<postgres.Sql | null> {
  if (!DATABASE_URL) return null;
  if (!sql) {
    sql = postgres(DATABASE_URL, {
      max: 5,
      idle_timeout: 60,
      connect_timeout: 10,
      onnotice: () => {},
      // Ağır bir sorgu sunucuyu kilitlemesin
      connection: { statement_timeout: 5000 },
    });
  }
  if (!ready) {
    ready = migrate(sql).catch((err) => {
      ready = null; // bir sonraki denemede tekrar dene
      throw err;
    });
  }
  await ready;
  return sql;
}

/* ---------- Yazma ---------- */

// Aynı kayıtları her yenilemede veritabanına tekrar yazmamak için son yazılan hâlin özeti
const savedSig = new Map<string, string>();
const signature = (eq: Earthquake) =>
  `${eq.time}|${eq.latitude}|${eq.longitude}|${eq.depth}|${eq.magnitude}|${eq.magType ?? ''}|${eq.location}|${eq.url ?? ''}`;

let queue: Promise<void> = Promise.resolve();

/**
 * Bir kaynağın son verisini arşive yazar (yalnızca yeni veya değişen kayıtlar).
 * Hata fırlatmaz; arşiv sorunu canlı akışı asla etkilemez.
 */
export function saveReports(source: SourceId, list: Earthquake[]): Promise<void> {
  if (!DATABASE_URL || !list.length) return Promise.resolve();
  const changed = list.filter((eq) => savedSig.get(eq.id) !== signature(eq));
  if (!changed.length) return Promise.resolve();

  // Yazmalar sıraya alınır; aynı anda yenilenen kaynaklar bağlantı havuzunu doldurmaz
  queue = queue
    .then(async () => {
      const db = await getDb();
      if (!db) return;
      for (let i = 0; i < changed.length; i += BATCH) {
        const rows = changed.slice(i, i + BATCH).map((eq) => ({
          id: eq.id,
          source: eq.source,
          time: eq.time,
          latitude: eq.latitude,
          longitude: eq.longitude,
          depth: eq.depth,
          magnitude: eq.magnitude,
          mag_type: eq.magType ?? null,
          location: eq.location,
          url: eq.url ?? null,
        }));
        await db`
          INSERT INTO earthquake_reports ${db(rows, 'id', 'source', 'time', 'latitude', 'longitude', 'depth', 'magnitude', 'mag_type', 'location', 'url')}
          ON CONFLICT (id) DO UPDATE SET
            time = EXCLUDED.time,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            depth = EXCLUDED.depth,
            magnitude = EXCLUDED.magnitude,
            mag_type = EXCLUDED.mag_type,
            location = EXCLUDED.location,
            url = EXCLUDED.url,
            updated_at = now()`;
      }
      for (const eq of changed) savedSig.set(eq.id, signature(eq));
      // Bellek sınırsız büyümesin: eski özetler atılır (en kötü ihtimalle bir kez fazladan yazılır)
      if (savedSig.size > 200_000) savedSig.clear();
    })
    .catch((err: unknown) => {
      console.warn(`[arşiv] ${source} yazılamadı: ${err instanceof Error ? err.message : err}`);
    });
  return queue;
}

/* ---------- Okuma ---------- */

export interface HistoryQuery {
  from: Date;
  to: Date;
  minMagnitude?: number;
  sources?: SourceId[];
  /** Yalnız bu kaynakların ham kayıtları birleştirilir (herkese açık API için) */
  onlySources?: readonly SourceId[];
  limit: number;
}

export interface HistoryResult {
  count: number;
  truncated: boolean;
  earthquakes: Earthquake[];
}

interface Row {
  id: string;
  source: SourceId;
  time: Date;
  latitude: number;
  longitude: number;
  depth: number;
  magnitude: number;
  mag_type: string | null;
  location: string;
  url: string | null;
}

export const rowToEarthquake = (r: Row): Earthquake => ({
  id: r.id,
  time: new Date(r.time).toISOString(),
  latitude: r.latitude,
  longitude: r.longitude,
  depth: r.depth,
  magnitude: Math.round(r.magnitude * 10) / 10,
  ...(r.mag_type ? { magType: r.mag_type } : {}),
  location: r.location,
  source: r.source,
  ...(r.url ? { url: r.url } : {}),
});

export async function queryHistory(q: HistoryQuery): Promise<HistoryResult> {
  const db = await getDb();
  if (!db) throw new Error('Arşiv yapılandırılmamış (DATABASE_URL yok)');
  const rows = await db<Row[]>`
    SELECT id, source, time, latitude, longitude, depth, magnitude, mag_type, location, url
    FROM earthquake_reports
    WHERE time >= ${q.from} AND time < ${q.to}
      ${q.minMagnitude !== undefined ? db`AND magnitude >= ${q.minMagnitude}` : db``}
      ${q.onlySources ? db`AND source = ANY(${[...q.onlySources]})` : db``}
    ORDER BY time DESC
    LIMIT ${MAX_ROWS}`;
  let merged = mergeEarthquakes(rows.map(rowToEarthquake));
  if (q.sources?.length) {
    const set = new Set(q.sources);
    merged = merged.filter((eq) => set.has(eq.source) || eq.alsoReportedBy?.some((s) => set.has(s)));
  }
  return {
    count: merged.length,
    truncated: rows.length >= MAX_ROWS || merged.length > q.limit,
    earthquakes: merged.slice(0, q.limit),
  };
}

/** Bağlantı havuzunu kapatır (testler ve düzgün kapanış için) */
export async function closeArchive(): Promise<void> {
  await queue;
  await sql?.end({ timeout: 5 });
  sql = null;
  ready = null;
}
