'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Earthquake, EarthquakeFeed, SourceStatus } from '@/types';
import { isValidEarthquake, mergeEarthquakes } from '@/lib/merge';
import { useEmscLive, type LiveStatus } from './useEmscLive';

const POLL_MS = 30_000;
// Sunucu ilk açılışta yavaş kaynakları beklemeden yanıt verir; onlar için kısa aralıkla tekrar sor
const PENDING_RETRY_MS = 3_000;

export interface FeedState {
  earthquakes: Earthquake[];
  sources: SourceStatus[];
  updatedAt: string | null;
  windowHours: number;
  live: LiveStatus;
  /** Sayfa açıldıktan sonra gelen depremler: id -> geliş zamanı */
  arrivals: Map<string, number>;
  error: boolean;
}

/**
 * Sunucudaki birleşik akışı 30 sn'de bir çeker (sekme gizliyken durur) ve
 * aradaki boşluğu EMSC WebSocket ile anlık doldurur.
 */
export function useEarthquakeFeed(initial: EarthquakeFeed | null): FeedState {
  const [feed, setFeed] = useState<EarthquakeFeed | null>(initial);
  const [liveEvents, setLiveEvents] = useState<Earthquake[]>([]);
  const [error, setError] = useState(false);
  const [arrivals, setArrivals] = useState<Map<string, number>>(() => new Map());
  const known = useRef<Set<string>>(new Set(initial?.earthquakes.map((e) => e.id)));
  const windowHours = feed?.windowHours ?? 24;
  const pendingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const loadRef = useRef<() => Promise<void>>(async () => {});

  const noteArrivals = useCallback((list: Earthquake[]) => {
    const fresh = list.filter((e) => !known.current.has(e.id));
    if (!fresh.length) return;
    const now = Date.now();
    for (const e of fresh) known.current.add(e.id);
    setArrivals((prev) => {
      const next = new Map(prev);
      for (const e of fresh) next.set(e.id, now);
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/earthquakes', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data: EarthquakeFeed = await res.json();
      setFeed((prev) => {
        // İlk yüklemede her şeyi "yeni" saymayalım
        if (prev) noteArrivals(data.earthquakes);
        else for (const e of data.earthquakes) known.current.add(e.id);
        return data;
      });
      setError(false);
      if (data.sources.some((s) => s.pending)) {
        clearTimeout(pendingTimer.current);
        pendingTimer.current = setTimeout(() => void loadRef.current(), PENDING_RETRY_MS);
      }
    } catch {
      setError(true);
    }
  }, [noteArrivals]);
  loadRef.current = load;

  useEffect(() => () => clearTimeout(pendingTimer.current), []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      timer = setInterval(load, POLL_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void load();
        start();
      } else {
        clearInterval(timer);
      }
    };

    const stale = !initial || Date.now() - Date.parse(initial.updatedAt) > POLL_MS;
    if (stale) void load();
    start();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [initial, load]);

  const live = useEmscLive(
    useCallback(
      (eq: Earthquake) => {
        if (!isValidEarthquake(eq)) return;
        setLiveEvents((prev) => [eq, ...prev.filter((e) => e.id !== eq.id)].slice(0, 500));
        noteArrivals([eq]);
      },
      [noteArrivals],
    ),
  );

  // Pencerenin dışına düşen canlı olayları ve eski "yeni" işaretlerini temizle
  useEffect(() => {
    const id = setInterval(() => {
      const cutoff = Date.now() - windowHours * 3600_000;
      setLiveEvents((prev) => {
        const next = prev.filter((e) => Date.parse(e.time) >= cutoff);
        return next.length === prev.length ? prev : next;
      });
      setArrivals((prev) => {
        const limit = Date.now() - 15 * 60_000;
        let changed = false;
        const next = new Map(prev);
        for (const [k, t] of next) if (t < limit) (next.delete(k), (changed = true));
        return changed ? next : prev;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, [windowHours]);

  const [earthquakes, setEarthquakes] = useState<Earthquake[]>(initial?.earthquakes ?? []);
  useEffect(() => {
    const base = feed?.earthquakes ?? [];
    setEarthquakes(liveEvents.length ? mergeEarthquakes([...base, ...liveEvents]) : base);
  }, [feed, liveEvents]);

  return {
    earthquakes,
    sources: feed?.sources ?? [],
    updatedAt: feed?.updatedAt ?? null,
    windowHours,
    live,
    arrivals,
    error,
  };
}
