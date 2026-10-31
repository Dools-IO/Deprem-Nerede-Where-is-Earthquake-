'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import type { Earthquake } from '@/types';
import { SOURCES } from '@/lib/sourceInfo';
import { formatDateTime, formatDepth, formatMagnitude, magnitudeColor } from '@/lib/format';

const LiveMap = dynamic(() => import('./LiveMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-900" />,
});

const PAGE = 50;
const NO_ARRIVALS = new Map<string, number>();

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
  const [from, setFrom] = useState(() => day(new Date(Date.now() - 6 * 86_400_000)));
  const [to, setTo] = useState(() => day(new Date()));
  const [minMag, setMinMag] = useState(2.5);
  const [source, setSource] = useState('');
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Seçilen günler yerel saatle; bitiş gününün tamamı dahil
      const start = new Date(`${from}T00:00:00`);
      const end = new Date(`${to}T00:00:00`);
      end.setDate(end.getDate() + 1);
      const q = new URLSearchParams({
        from: start.toISOString(),
        to: end.toISOString(),
        limit: '10000',
      });
      if (minMag > 0) q.set('minmag', String(minMag));
      if (source) q.set('source', source);
      const res = await fetch(`/api/history?${q}`);
      const json: HistoryResponse = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
      setShown(PAGE);
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  }, [from, to, minMag, source]);

  // İlk açılışta son 7 günü getir
  const [initialLoad] = useState(() => load);
  useEffect(() => {
    void initialLoad();
  }, [initialLoad]);

  const rows = data?.earthquakes ?? [];
  const input = 'rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm';

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 text-slate-200">
      <form
        className="mb-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <h1 className="mr-auto text-2xl font-bold text-white">Geçmiş depremler</h1>
        <label className="text-xs text-slate-400">
          Başlangıç
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={`${input} block`} />
        </label>
        <label className="text-xs text-slate-400">
          Bitiş
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={`${input} block`} />
        </label>
        <select value={minMag} onChange={(e) => setMinMag(Number(e.target.value))} className={input} aria-label="En küçük büyüklük">
          {[0, 2, 2.5, 3, 4, 5, 6].map((m) => (
            <option key={m} value={m}>
              {m === 0 ? 'Tüm büyüklükler' : `M${m}+`}
            </option>
          ))}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} className={input} aria-label="Kaynak">
          <option value="">Tüm kaynaklar</option>
          {Object.values(SOURCES).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.region})
            </option>
          ))}
        </select>
        <button type="submit" disabled={loading} className="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60">
          {loading ? 'Yükleniyor…' : 'Getir'}
        </button>
      </form>

      {error && <p className="mb-4 rounded-md bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}
      {data && !error && (
        <p className="mb-3 text-sm text-slate-400">
          <strong className="text-white">{data.count.toLocaleString('tr-TR')}</strong> deprem
          {data.truncated && ' (aralık çok geniş, en yeni 10.000 kayıt gösteriliyor; aralığı daraltın veya büyüklük filtresi seçin)'}
          . Arşiv, sunucunun kayda başladığı andan itibaren dolar.
        </p>
      )}

      <div className="mb-4 h-[50vh] overflow-hidden rounded-lg border border-slate-800">
        <LiveMap earthquakes={rows} arrivals={NO_ARRIVALS} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">Büyüklük</th>
              <th className="px-3 py-2">Konum</th>
              <th className="px-3 py-2">Zaman</th>
              <th className="px-3 py-2">Derinlik</th>
              <th className="px-3 py-2">Kaynak</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, shown).map((eq) => (
              <tr
                key={eq.id}
                onClick={() => setSelectedId(eq.id)}
                className={`cursor-pointer border-t border-slate-800 hover:bg-slate-900/60 ${selectedId === eq.id ? 'bg-slate-800' : ''}`}
              >
                <td className="px-3 py-2">
                  <span
                    className="inline-flex h-7 w-11 items-center justify-center rounded font-bold text-slate-950"
                    style={{ background: magnitudeColor(eq.magnitude) }}
                    title={eq.magType}
                  >
                    {formatMagnitude(eq.magnitude)}
                  </span>
                </td>
                <td className="px-3 py-2">{eq.location || '-'}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <time dateTime={eq.time}>{formatDateTime(eq.time)}</time>
                </td>
                <td className="whitespace-nowrap px-3 py-2">{formatDepth(eq.depth)}</td>
                <td className="px-3 py-2 text-xs">
                  {[eq.source, ...(eq.alsoReportedBy ?? [])].map((s) => SOURCES[s]?.name ?? s).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && rows.length === 0 && <p className="p-6 text-center text-slate-400">Bu aralıkta kayıt yok.</p>}
      </div>
      {rows.length > shown && (
        <button
          onClick={() => setShown((n) => n + PAGE)}
          className="mx-auto mt-4 block rounded-md bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
        >
          Daha fazla göster ({rows.length.toLocaleString('tr-TR')} kayıttan {shown})
        </button>
      )}
    </div>
  );
}
