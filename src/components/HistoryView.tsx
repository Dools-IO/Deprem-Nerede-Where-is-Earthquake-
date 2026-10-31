'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import type { Earthquake } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { SOURCES } from '@/lib/sourceInfo';
import QuakeTable from './QuakeTable';
import { PageHeader, inputClass } from './ui';

const LiveMap = dynamic(() => import('./LiveMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-ink-900" />,
});

const NO_ARRIVALS = new Map<string, number>();
const MAGS = [0, 2, 2.5, 3, 4, 5, 6];

interface HistoryResponse {
  from: string;
  to: string;
  count: number;
  truncated: boolean;
  earthquakes: Earthquake[];
  error?: string;
}

/** Tarayıcının yerel günü, YYYY-MM-DD */
const day = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function HistoryView() {
  const { t, fmt, locale } = useI18n();
  const [from, setFrom] = useState(() => day(new Date(Date.now() - 6 * 86_400_000)));
  const [to, setTo] = useState(() => day(new Date()));
  const [minMag, setMinMag] = useState(2.5);
  const [source, setSource] = useState('');
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Her yeni sonuçta tablo sayfalaması baştan başlasın
  const [resultId, setResultId] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Seçilen günler yerel saatle; bitiş gününün tamamı dahil
      const start = new Date(`${from}T00:00:00`);
      const end = new Date(`${to}T00:00:00`);
      end.setDate(end.getDate() + 1);
      const q = new URLSearchParams({ from: start.toISOString(), to: end.toISOString(), limit: '10000' });
      if (minMag > 0) q.set('minmag', String(minMag));
      if (source) q.set('source', source);
      const res = await fetch(`/api/app/history?${q}`);
      if (res.status === 503) throw new Error(t.history.unavailable);
      const json: HistoryResponse = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
      setResultId((n) => n + 1);
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.history.unknownError);
    } finally {
      setLoading(false);
    }
  }, [from, to, minMag, source, t]);

  // İlk açılışta son 7 günü getir
  const [initialLoad] = useState(() => load);
  useEffect(() => {
    void initialLoad();
  }, [initialLoad]);

  const rows = data?.earthquakes ?? [];

  return (
    <div className="page-bg">
    <div className="mx-auto max-w-6xl px-4 py-8 text-slate-200 md:py-12">
      <PageHeader eyebrow={t.history.eyebrow} title={t.history.heading} subtitle={t.history.subtitle} />
      <form
        className="card mb-5 grid grid-cols-2 gap-3 p-4 sm:flex sm:flex-wrap sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label className="eyebrow">
          {t.history.from}
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={`${inputClass} mt-1 block w-full`} />
        </label>
        <label className="eyebrow">
          {t.history.to}
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={`${inputClass} mt-1 block w-full`} />
        </label>
        <select value={minMag} onChange={(e) => setMinMag(Number(e.target.value))} className={inputClass} aria-label={t.common.magnitude}>
          {MAGS.map((m) => (
            <option key={m} value={m}>
              {m === 0 ? t.common.allMagnitudes : `M${m}+`}
            </option>
          ))}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass} aria-label={t.common.source}>
          <option value="">{t.common.allSources}</option>
          {Object.values(SOURCES).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.region[locale]})
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="col-span-2 rounded-xl bg-gradient-to-b from-quake-400 to-quake-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(255,90,54,0.8)] hover:brightness-110 disabled:opacity-60 sm:col-span-1 sm:ml-auto"
        >
          {loading ? t.history.fetching : t.history.fetch}
        </button>
      </form>

      {error && <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      {data && !error && (
        <p className="mb-3 text-sm text-slate-400">
          <strong className="text-white">{t.common.earthquakes(fmt.number(data.count))}</strong>
          {data.truncated && t.history.truncated}. {t.history.archiveNote}
        </p>
      )}

      <div className="card mb-5 h-[45vh] min-h-[280px] overflow-hidden">
        <LiveMap earthquakes={rows} arrivals={NO_ARRIVALS} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      <QuakeTable
        key={resultId}
        rows={rows}
        selectedId={selectedId}
        onSelect={setSelectedId}
        emptyText={loading || !data ? t.common.loading : t.history.empty}
      />
    </div>
    </div>
  );
}
