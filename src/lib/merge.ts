import type { Earthquake, SourceId } from '../types';
import { SOURCES } from './sourceInfo';

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Farklı kurumlar aynı depremi birkaç saniye ve birkaç km farkla raporlar.
// Büyük depremlerde konum farkı daha büyük olabildiği için tolerans büyür.
const MAX_WINDOW_MS = 90_000;

function isSameEvent(a: Earthquake, b: Earthquake, ta: number, tb: number): boolean {
  const dt = Math.abs(ta - tb);
  const big = Math.max(a.magnitude, b.magnitude) >= 5;
  const maxDt = big ? MAX_WINDOW_MS : 40_000;
  const maxKm = big ? 200 : 80;
  if (dt > maxDt) return false;
  if (Math.abs(a.magnitude - b.magnitude) > (big ? 1.2 : 0.8)) return false;
  return distanceKm(a.latitude, a.longitude, b.latitude, b.longitude) <= maxKm;
}

interface Cluster {
  primary: Earthquake;
  time: number;
  sources: Set<SourceId>;
}

const rank = (eq: Earthquake) => SOURCES[eq.source]?.priority ?? 99;

/**
 * Birden fazla kaynaktan gelen kayıtları tek depreme indirger.
 * Her küme için en öncelikli kaynağın kaydı gösterilir, diğerleri
 * `alsoReportedBy` alanında listelenir. Sonuç yeniden eskiye sıralıdır.
 */
export function mergeEarthquakes(input: Earthquake[]): Earthquake[] {
  const items = input
    .map((eq) => ({ eq, t: Date.parse(eq.time) }))
    .filter((x) => Number.isFinite(x.t))
    .sort((a, b) => a.t - b.t);

  const clusters: Cluster[] = [];
  const byId = new Map<string, Cluster>();

  for (const { eq, t } of items) {
    // Aynı kimlikli kayıt (ör. güncelleme) varsa yenisiyle değiştir
    const existing = byId.get(eq.id);
    if (existing) {
      if (existing.primary.id === eq.id) existing.primary = { ...eq };
      continue;
    }

    let match: Cluster | undefined;
    for (let i = clusters.length - 1; i >= 0; i--) {
      const c = clusters[i];
      if (t - c.time > MAX_WINDOW_MS) break;
      if (c.sources.has(eq.source)) continue;
      if (isSameEvent(c.primary, eq, c.time, t)) {
        match = c;
        break;
      }
    }

    if (match) {
      match.sources.add(eq.source);
      if (rank(eq) < rank(match.primary)) {
        match.primary = eq;
        match.time = t;
      }
      byId.set(eq.id, match);
    } else {
      const cluster: Cluster = { primary: eq, time: t, sources: new Set([eq.source]) };
      // Kümeler zamana göre sıralı kalmalı; çoğunlukla sona eklenir
      let pos = clusters.length;
      while (pos > 0 && clusters[pos - 1].time > t) pos--;
      clusters.splice(pos, 0, cluster);
      byId.set(eq.id, cluster);
    }
  }

  const result: Earthquake[] = new Array(clusters.length);
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[clusters.length - 1 - i];
    const others = Array.from(c.sources).filter((s) => s !== c.primary.source);
    result[i] = others.length ? { ...c.primary, alsoReportedBy: others } : c.primary;
  }
  return result;
}

/** Saat farkı payı: bundan daha ileri tarihli kayıt saat dilimi hatasıdır, listenin tepesine yapışmasın */
const FUTURE_TOLERANCE_MS = 10 * 60_000;

export function isValidEarthquake(eq: Earthquake, now = Date.now()): boolean {
  const time = Date.parse(eq.time);
  return (
    Number.isFinite(eq.latitude) &&
    Number.isFinite(eq.longitude) &&
    Number.isFinite(eq.magnitude) &&
    Number.isFinite(eq.depth) &&
    eq.latitude >= -90 &&
    eq.latitude <= 90 &&
    eq.longitude >= -180 &&
    eq.longitude <= 180 &&
    eq.magnitude > -2 &&
    eq.magnitude < 10.5 &&
    eq.depth > -10 &&
    eq.depth < 800 &&
    Number.isFinite(time) &&
    time <= now + FUTURE_TOLERANCE_MS
  );
}
