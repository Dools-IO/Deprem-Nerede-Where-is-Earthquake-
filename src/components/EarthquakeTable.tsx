'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { EarthquakeFeed } from '@/types';
import { useEarthquakeFeed } from '@/hooks/useEarthquakeFeed';
import { useNow } from '@/hooks/useNow';
import { useI18n } from '@/i18n/I18nProvider';
import { SOURCES, isSourceId } from '@/lib/sourceInfo';
import QuakeTable from './QuakeTable';
import { IconSearch, PageHeader, Segmented, Stat, inputClass } from './ui';
import { formatMagnitude, magnitudeColor } from '@/lib/format';

const MAG_FILTERS = [0, 2, 3, 4, 5, 6];
type Sort = 'time' | 'magnitude';

export default function EarthquakeTable({ initial }: { initial: EarthquakeFeed | null }) {
  const { t, fmt, locale, href } = useI18n();
  const feed = useEarthquakeFeed(initial);
  const now = useNow();
  const router = useRouter();
  const params = useSearchParams();
  const kaynak = params.get('kaynak');
  const source = kaynak && isSourceId(kaynak) ? kaynak : null;
  const [minMag, setMinMag] = useState(0);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('time');

  const rows = useMemo(() => {
    // Konum adları çoğunlukla Türkçe/yerel; büyük-küçük harf eşleşmesi Türkçe kurallarla
    const q = query.trim().toLocaleLowerCase('tr');
    const list = feed.earthquakes.filter(
      (eq) =>
        eq.magnitude >= minMag &&
        (!source || eq.source === source || eq.alsoReportedBy?.includes(source)) &&
        (!q || eq.location.toLocaleLowerCase('tr').includes(q)),
    );
    // Akış zaten en yeni önce gelir
    return sort === 'magnitude' ? [...list].sort((a, b) => b.magnitude - a.magnitude) : list;
  }, [feed.earthquakes, minMag, source, query, sort]);

  const setSource = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set('kaynak', value);
    else next.delete('kaynak');
    router.replace(`${href('/liste')}${next.size ? `?${next}` : ''}`, { scroll: false });
  };

  const strongest = rows.reduce<(typeof rows)[number] | null>((m, eq) => (!m || eq.magnitude > m.magnitude ? eq : m), null);
  const latest = feed.earthquakes[0] ?? null;

  return (
    <div className="page-bg">
    <div className="mx-auto max-w-6xl px-4 py-8 text-slate-200 md:py-12">
      <PageHeader eyebrow={t.list.eyebrow} title={t.list.title} subtitle={t.list.subtitle(feed.windowHours)} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t.list.statShown} value={fmt.number(rows.length)} hint={t.live.statTotal(feed.windowHours)} />
        <Stat
          label={t.list.statStrongest}
          value={strongest ? `M${formatMagnitude(strongest.magnitude)}` : '–'}
          accent={strongest ? magnitudeColor(strongest.magnitude) : undefined}
          hint={strongest?.location}
        />
        <Stat
          label={t.list.statLatest}
          value={latest && now ? fmt.relative(latest.time, now) : '–'}
          hint={latest?.location}
        />
        <Stat label={t.live.sourcesLabel} value={`${feed.sources.filter((s) => s.ok).length}/${feed.sources.length || Object.keys(SOURCES).length}`} hint={t.live.sourcesActive} />
      </div>

      <div className="card mb-5 flex flex-col gap-3 p-3 lg:flex-row lg:flex-wrap lg:items-center">
        <label className="relative block lg:w-72">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.list.searchPlaceholder}
            className={`${inputClass} w-full pl-9`}
          />
        </label>
        <select value={source ?? ''} onChange={(e) => setSource(e.target.value)} className={inputClass} aria-label={t.common.source}>
          <option value="">{t.common.allSources}</option>
          {Object.values(SOURCES).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.region[locale]})
            </option>
          ))}
        </select>
        <div className="overflow-x-auto">
          <Segmented
            label={t.common.magnitude}
            value={minMag}
            onChange={setMinMag}
            options={MAG_FILTERS.map((m) => ({ value: m, label: m === 0 ? t.common.all : `M${m}+` }))}
          />
        </div>
        <div className="lg:ml-auto">
          <Segmented
            label={t.common.sortBy}
            value={sort}
            onChange={setSort}
            options={[
              { value: 'time', label: t.common.sortNewest },
              { value: 'magnitude', label: t.common.sortStrongest },
            ]}
          />
        </div>
      </div>

      <QuakeTable rows={rows} now={now} showLinks emptyText={feed.updatedAt ? t.list.empty : t.common.loading} />
    </div>
    </div>
  );
}
