import type { Earthquake, SourceId } from '@/types';
import { isSourceId } from '@/lib/sourceInfo';

export interface FeedFilter {
  minMagnitude?: number;
  sources?: SourceId[];
  since?: number;
  limit?: number;
}

export function parseFilter(params: URLSearchParams): FeedFilter | { error: string } {
  const filter: FeedFilter = {};

  const minmag = params.get('minmag');
  if (minmag !== null) {
    const v = Number(minmag);
    if (!Number.isFinite(v)) return { error: 'minmag sayı olmalı' };
    filter.minMagnitude = v;
  }

  const source = params.get('source');
  if (source) {
    const ids = source.split(',').map((s) => s.trim().toLowerCase());
    const bad = ids.find((s) => !isSourceId(s));
    if (bad) return { error: `Bilinmeyen kaynak: ${bad}` };
    filter.sources = ids as SourceId[];
  }

  const since = params.get('since');
  if (since) {
    const t = Date.parse(since);
    if (!Number.isFinite(t)) return { error: 'since ISO 8601 tarih olmalı' };
    filter.since = t;
  }

  const limit = params.get('limit');
  if (limit) {
    const v = Number(limit);
    if (!Number.isInteger(v) || v < 1 || v > 10_000) return { error: 'limit 1-10000 arası tam sayı olmalı' };
    filter.limit = v;
  }

  return filter;
}

export function applyFilter(list: Earthquake[], f: FeedFilter): Earthquake[] {
  let out = list;
  if (f.minMagnitude !== undefined) out = out.filter((eq) => eq.magnitude >= f.minMagnitude!);
  if (f.sources) {
    const set = new Set(f.sources);
    out = out.filter((eq) => set.has(eq.source) || eq.alsoReportedBy?.some((s) => set.has(s)));
  }
  if (f.since !== undefined) out = out.filter((eq) => Date.parse(eq.time) > f.since!);
  if (f.limit !== undefined) out = out.slice(0, f.limit);
  return out;
}
