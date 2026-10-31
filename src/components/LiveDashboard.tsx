'use client';

import dynamic from 'next/dynamic';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { Earthquake, EarthquakeFeed, SourceId } from '@/types';
import { useEarthquakeFeed } from '@/hooks/useEarthquakeFeed';
import { useNow } from '@/hooks/useNow';
import { SOURCES, reporterNames } from '@/lib/sourceInfo';
import { formatDepth, formatMagnitude, MAG_SCALE, magnitudeColor } from '@/lib/format';
import { useI18n } from '@/i18n/I18nProvider';
import { Chip, MagBadge } from './ui';

const LiveMap = dynamic(() => import('./LiveMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-900" />,
});

const MAG_FILTERS = [0, 2.5, 4, 5, 6];
const TIME_FILTERS = [1, 6, 24];
const LIST_LIMIT = 200;
// Liste önce kısa çizilir; mobilde açılışı hızlandırır, istenirse genişletilir
const LIST_STEP = 50;

export default function LiveDashboard({ initial }: { initial: EarthquakeFeed | null }) {
  const { t, fmt, locale } = useI18n();
  const feed = useEarthquakeFeed(initial);
  const now = useNow();
  const [minMag, setMinMag] = useState(0);
  const [hours, setHours] = useState(24);
  const [hidden, setHidden] = useState<Set<SourceId>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Panel kapalı başlar, geniş ekranda açılır: dar ekranda liste hiç çizilmez
  const [panelOpen, setPanelOpen] = useState(false);
  const [listCount, setListCount] = useState(LIST_STEP);
  const showMore = useCallback(() => setListCount((c) => Math.min(c + LIST_STEP, LIST_LIMIT)), []);
  const [showSources, setShowSources] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 768px)').matches;
    setIsMobile(!wide);
    if (wide) setPanelOpen(true);
  }, []);
  // Dar ekranda listeden seçilince panel kapanır; harita ve açılır kutu görünsün
  const selectFromList = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (isMobile) setPanelOpen(false);
    },
    [isMobile],
  );

  const visible = useMemo(() => {
    const ref = now ?? (feed.updatedAt ? Date.parse(feed.updatedAt) : NaN);
    const cutoff = Number.isFinite(ref) ? ref - hours * 3600_000 : -Infinity;
    return feed.earthquakes.filter(
      (eq) =>
        eq.magnitude >= minMag &&
        Date.parse(eq.time) >= cutoff &&
        (!hidden.size || !hidden.has(eq.source) || eq.alsoReportedBy?.some((s) => !hidden.has(s))),
    );
  }, [feed.earthquakes, feed.updatedAt, minMag, hours, hidden, now]);

  const strongest = useMemo(
    () => visible.reduce<(typeof visible)[number] | null>((m, eq) => (!m || eq.magnitude > m.magnitude ? eq : m), null),
    [visible],
  );
  const okSources = feed.sources.filter((s) => s.ok && s.count > 0).length;

  const toggleSource = (id: SourceId) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] w-full overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0">
        <LiveMap
          earthquakes={visible}
          arrivals={feed.arrivals}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Üst durum çubuğu */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-[500] flex flex-wrap items-start gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-3 rounded-lg bg-slate-900/85 px-3 py-2 text-sm shadow-lg backdrop-blur">
          <LiveBadge status={feed.live} label={t.live.status[feed.live]} title={t.live.statusTitle[feed.live]} />
          <span className="text-slate-300">
            <strong className="text-white">{t.common.earthquakes(fmt.number(visible.length))}</strong>
          </span>
          {strongest && (
            <button
              className="hidden text-slate-300 hover:text-white sm:inline"
              onClick={() => setSelectedId(strongest.id)}
              title={t.live.goToStrongest}
            >
              {t.live.strongest}: <strong style={{ color: magnitudeColor(strongest.magnitude) }}>M{formatMagnitude(strongest.magnitude)}</strong>
            </button>
          )}
          <button
            className="text-slate-300 hover:text-white"
            onClick={() => setShowSources((v) => !v)}
            aria-expanded={showSources}
          >
            {t.live.sourcesCount(okSources, feed.sources.length || Object.keys(SOURCES).length)}
          </button>
          {feed.updatedAt && now && (
            <span className="hidden text-xs text-slate-400 md:inline">{t.live.updated(fmt.relative(feed.updatedAt, now))}</span>
          )}
          {feed.error && <span className="text-xs text-amber-400">{t.live.connectionProblem}</span>}
        </div>
      </div>

      {showSources && (
        <div className="absolute left-3 top-16 z-[600] max-h-[70vh] w-80 overflow-y-auto rounded-lg bg-slate-900/95 p-3 text-sm shadow-xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">{t.live.dataSources}</h2>
            <button className="text-slate-400 hover:text-white" onClick={() => setShowSources(false)} aria-label={t.common.close}>
              ✕
            </button>
          </div>
          <p className="mb-2 text-xs text-slate-400">{t.live.hiddenSourceHint}</p>
          <ul className="space-y-1">
            {feed.sources.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-sky-500"
                  checked={!hidden.has(s.id)}
                  onChange={() => toggleSource(s.id)}
                  id={`src-${s.id}`}
                />
                <label htmlFor={`src-${s.id}`} className="flex-1 cursor-pointer">
                  <span className="font-medium">{s.name}</span>{' '}
                  <span className="text-xs text-slate-400">{SOURCES[s.id]?.region[locale]}</span>
                </label>
                <span
                  className={`text-xs ${s.pending ? 'text-slate-400' : s.ok ? 'text-emerald-400' : 'text-rose-400'}`}
                  title={s.error ? `${t.live.errorPrefix}: ${s.error}` : s.updatedAt ? fmt.dateTime(s.updatedAt) : ''}
                >
                  {s.pending ? t.live.sourceLoading : s.ok ? s.count : t.live.sourceError}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            {t.live.liveFooter}
          </p>
        </div>
      )}

      {/* Panel: geniş ekranda sağda, dar ekranda alttan açılan sayfa */}
      <aside
        className={`absolute inset-x-0 bottom-0 z-[700] flex h-[68%] flex-col rounded-t-2xl bg-slate-900/95 shadow-2xl backdrop-blur transition-transform duration-300 md:inset-x-auto md:right-0 md:top-0 md:z-[500] md:h-auto md:w-[85vw] md:max-w-sm md:rounded-none md:bg-slate-900/90 ${
          panelOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full md:translate-y-0'
        }`}
        aria-hidden={!panelOpen && isMobile ? true : undefined}
      >
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="absolute -left-9 top-3 hidden rounded-l-md bg-slate-900/90 px-2 py-2 text-slate-300 hover:text-white md:block"
          aria-label={panelOpen ? t.live.hidePanel : t.live.showPanel}
        >
          {panelOpen ? '›' : '‹'}
        </button>
        {/* Mobil tutamak: dokununca kapanır */}
        <button
          onClick={() => setPanelOpen(false)}
          className="flex w-full justify-center pb-1 pt-2 md:hidden"
          aria-label={t.live.hidePanel}
        >
          <span className="h-1.5 w-12 rounded-full bg-slate-600" />
        </button>

        <div className="space-y-3 border-b border-slate-800 p-3 pt-1 md:pt-3">
          <FilterRow label={t.common.magnitude}>
            {MAG_FILTERS.map((m) => (
              <Chip key={m} active={minMag === m} onClick={() => setMinMag(m)}>
                {m === 0 ? t.common.all : `${m}+`}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label={t.common.time}>
            {TIME_FILTERS.map((h) => (
              <Chip key={h} active={hours === h} onClick={() => setHours(h)}>
                {t.live.hours(h)}
              </Chip>
            ))}
          </FilterRow>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400" aria-label={t.live.legend}>
            {[...MAG_SCALE].reverse().map((s) => (
              <span key={s.label} className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {panelOpen && (
          <EarthquakeList
            items={visible}
            count={listCount}
            onMore={showMore}
            now={now}
            arrivals={feed.arrivals}
            selectedId={selectedId}
            onSelect={selectFromList}
            loaded={!!feed.updatedAt}
          />
        )}
      </aside>

      {/* Mobil: paneli açan düğme */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="absolute bottom-8 left-1/2 z-[600] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-xl hover:bg-sky-500 md:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 6h14M3 10h14M3 14h9" />
          </svg>
          {t.live.openList}
          <span className="rounded-full bg-white/20 px-2 text-xs tabular-nums">{fmt.number(visible.length)}</span>
        </button>
      )}
    </div>
  );
}

function LiveBadge({ status, label, title }: { status: 'connecting' | 'live' | 'offline'; label: string; title: string }) {
  const dot = { live: 'bg-red-500', connecting: 'bg-amber-400', offline: 'bg-slate-500' }[status];
  return (
    <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide" title={title}>
      <span className="relative flex h-2.5 w-2.5">
        {status === 'live' && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dot} opacity-75`} />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dot}`} />
      </span>
      {label}
    </span>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

interface ListProps {
  items: Earthquake[];
  count: number;
  onMore: () => void;
  now: number | null;
  arrivals: Map<string, number>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  loaded: boolean;
}

const EarthquakeList = memo(function EarthquakeList({
  items,
  count,
  onMore,
  now,
  arrivals,
  selectedId,
  onSelect,
  loaded,
}: ListProps) {
  const { t, fmt } = useI18n();
  const shown = Math.min(count, LIST_LIMIT);
  // pb-8: harita atıf şeridi listenin son satırını örtmesin
  return (
    <ol className="overscroll-contain flex-1 overflow-y-auto pb-8">
      {items.slice(0, shown).map((eq) => {
        const isNew = arrivals.has(eq.id);
        return (
          <li key={eq.id}>
            <button
              onClick={() => onSelect(eq.id)}
              className={`flex w-full items-center gap-3 border-b border-slate-800/70 px-3 py-2 text-left hover:bg-slate-800/70 ${
                selectedId === eq.id ? 'bg-slate-800' : ''
              } ${isNew ? 'eq-new' : ''}`}
            >
              <MagBadge magnitude={eq.magnitude} magType={eq.magType} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{eq.location || t.common.unknownLocation}</span>
                <span className="block text-xs text-slate-400">
                  <time dateTime={eq.time} title={fmt.dateTime(eq.time)}>
                    {now ? fmt.relative(eq.time, now) : fmt.dateTime(eq.time)}
                  </time>
                  {' · '}
                  {formatDepth(eq.depth)}
                  {' · '}
                  {reporterNames(eq)}
                </span>
              </span>
              {isNew && <span className="rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{t.common.newBadge}</span>}
            </button>
          </li>
        );
      })}
      {items.length === 0 && (
        <li className="p-6 text-center text-sm text-slate-400">
          {loaded ? t.common.noResults : t.common.loading}
        </li>
      )}
      {items.length > shown && shown < LIST_LIMIT && (
        <li className="p-2">
          <button
            onClick={onMore}
            className="w-full rounded-md bg-slate-800 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            {t.common.showMore(fmt.number(items.length), shown)}
          </button>
        </li>
      )}
      {items.length > LIST_LIMIT && shown >= LIST_LIMIT && (
        <li className="p-3 text-center text-xs text-slate-500">{t.live.listCapped(LIST_LIMIT)}</li>
      )}
    </ol>
  );
});
