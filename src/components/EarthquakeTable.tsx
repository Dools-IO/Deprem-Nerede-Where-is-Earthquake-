'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { EarthquakeFeed } from '@/types';
import { useEarthquakeFeed } from '@/hooks/useEarthquakeFeed';
import { useNow } from '@/hooks/useNow';
import { useI18n } from '@/i18n/I18nProvider';
import { SOURCES, isSourceId } from '@/lib/sourceInfo';
import QuakeTable from './QuakeTable';
import { Chip, inputClass } from './ui';

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 text-slate-200">
      <h1 className="mb-4 text-2xl font-bold text-white">
        {t.list.heading(feed.windowHours, fmt.number(rows.length))}
      </h1>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.list.searchPlaceholder}
          className={`${inputClass} lg:w-64`}
        />
        <select value={source ?? ''} onChange={(e) => setSource(e.target.value)} className={inputClass} aria-label={t.common.source}>
          <option value="">{t.common.allSources}</option>
          {Object.values(SOURCES).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.region[locale]})
            </option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label={t.common.magnitude}>
          {MAG_FILTERS.map((m) => (
            <Chip key={m} active={minMag === m} onClick={() => setMinMag(m)}>
              {m === 0 ? t.common.all : `M${m}+`}
            </Chip>
          ))}
        </div>
        <div className="flex items-center gap-1 lg:ml-auto" role="group" aria-label={t.common.sortBy}>
          <Chip active={sort === 'time'} onClick={() => setSort('time')}>
            {t.common.sortNewest}
          </Chip>
          <Chip active={sort === 'magnitude'} onClick={() => setSort('magnitude')}>
            {t.common.sortStrongest}
          </Chip>
        </div>
      </div>

      <QuakeTable rows={rows} now={now} showLinks emptyText={feed.updatedAt ? t.list.empty : t.common.loading} />
    </div>
  );
}
