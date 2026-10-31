'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { EarthquakeFeed } from '@/types';
import { useEarthquakeFeed } from '@/hooks/useEarthquakeFeed';
import { useNow } from '@/hooks/useNow';
import { SOURCES, isSourceId } from '@/lib/sourceInfo';
import { formatDateTime, formatDepth, formatMagnitude, formatRelative, magnitudeColor } from '@/lib/format';
import { formatCount, locale, regionOf } from '@/lib/i18n';
import { useI18n } from './I18nProvider';

const PAGE = 50;

export default function EarthquakeTable({ initial }: { initial: EarthquakeFeed | null }) {
  const feed = useEarthquakeFeed(initial);
  const now = useNow();
  const { lang, t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const kaynak = params.get('kaynak');
  const source = kaynak && isSourceId(kaynak) ? kaynak : null;
  const [minMag, setMinMag] = useState(0);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => {
    const loc = locale(lang);
    const q = query.trim().toLocaleLowerCase(loc);
    return feed.earthquakes.filter(
      (eq) =>
        eq.magnitude >= minMag &&
        (!source || eq.source === source || eq.alsoReportedBy?.includes(source)) &&
        (!q || eq.location.toLocaleLowerCase(loc).includes(q)),
    );
  }, [feed.earthquakes, minMag, source, query, lang]);

  const setSource = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set('kaynak', value);
    else next.delete('kaynak');
    // usePathname statik sayfada iç yolu (/tr/liste) verebilir; görünen adres tarayıcıdan okunur
    router.replace(`${window.location.pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 text-slate-200">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <h1 className="mr-auto text-2xl font-bold text-white">
          {t.lastHours(feed.windowHours, formatCount(rows.length, lang))}
        </h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm outline-none focus:border-sky-500"
        />
        <select
          value={source ?? ''}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
          aria-label={t.source}
        >
          <option value="">{t.allSources}</option>
          {Object.values(SOURCES).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({regionOf(s, lang)})
            </option>
          ))}
        </select>
        <select
          value={minMag}
          onChange={(e) => setMinMag(Number(e.target.value))}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
          aria-label={t.minMagnitude}
        >
          {[0, 2, 3, 4, 5, 6].map((m) => (
            <option key={m} value={m}>
              {m === 0 ? t.allMagnitudes : `M${m}+`}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">{t.magnitude}</th>
              <th className="px-3 py-2">{t.location}</th>
              <th className="px-3 py-2">{t.time}</th>
              <th className="px-3 py-2">{t.depth}</th>
              <th className="px-3 py-2">{t.source}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, shown).map((eq) => (
              <tr key={eq.id} className="border-t border-slate-800 hover:bg-slate-900/60">
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
                  <time dateTime={eq.time}>{formatDateTime(eq.time, lang)}</time>
                  {now && <span className="block text-xs text-slate-500">{formatRelative(eq.time, now, lang)}</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{formatDepth(eq.depth)}</td>
                <td className="px-3 py-2 text-xs">
                  {[eq.source, ...(eq.alsoReportedBy ?? [])].map((s) => SOURCES[s]?.name ?? s).join(', ')}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${eq.latitude}&mlon=${eq.longitude}#map=8/${eq.latitude}/${eq.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:underline"
                  >
                    {t.mapLink}
                  </a>
                  {eq.url && (
                    <>
                      {' · '}
                      <a href={eq.url} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                        {t.details}
                      </a>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-slate-400">{t.noRecords}</p>}
      </div>
      {rows.length > shown && (
        <button
          onClick={() => setShown((n) => n + PAGE)}
          className="mx-auto mt-4 block rounded-md bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
        >
          {t.showMore(rows.length - shown)}
        </button>
      )}
    </div>
  );
}
