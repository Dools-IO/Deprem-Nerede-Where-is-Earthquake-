'use client';

import dynamic from 'next/dynamic';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { Earthquake, EarthquakeFeed, SourceId } from '@/types';
import { useEarthquakeFeed } from '@/hooks/useEarthquakeFeed';
import { useNow } from '@/hooks/useNow';
import { SOURCES, reporterNames } from '@/lib/sourceInfo';
import { formatDepth, MAG_SCALE } from '@/lib/format';
import { useI18n } from '@/i18n/I18nProvider';
import { IconClock, IconDepth, IconLayers, IconList, IconSearch, MagBadge, Segmented, inputClass } from './ui';

const LiveMap = dynamic(() => import('./LiveMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-ink-900" />,
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
  const [query, setQuery] = useState('');

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

  const latest = visible[0] ?? null;
  const shownList = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(locale);
    return q ? visible.filter((eq) => eq.location.toLocaleLowerCase(locale).includes(q)) : visible;
  }, [visible, query, locale]);

  return (
    <div className="relative flex h-[calc(100dvh-6.25rem)] w-full overflow-hidden bg-ink-950 text-slate-100">
      <div className="absolute inset-0">
        <LiveMap
          earthquakes={visible}
          arrivals={feed.arrivals}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Üst istatistik kartları; dar ekranda yatay kayar */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-[500] p-3 md:right-[424px]">
        <div className="pointer-events-auto flex snap-x gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
          <div className="glass flex shrink-0 snap-start items-center gap-3 rounded-2xl px-4 py-2.5">
            <LiveBadge status={feed.live} label={t.live.status[feed.live]} title={t.live.statusTitle[feed.live]} />
            <span className="h-8 w-px bg-white/10" />
            <div className="leading-tight">
              <p className="font-display text-xl font-bold tabular-nums text-white">{fmt.number(visible.length)}</p>
              <p className="text-[11px] text-slate-400">{t.live.statTotal(hours)}</p>
            </div>
          </div>

          {strongest && (
            <button
              className="glass flex min-w-0 max-w-[260px] shrink-0 snap-start items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:border-white/20"
              onClick={() => setSelectedId(strongest.id)}
              title={t.live.goToStrongest}
            >
              <MagBadge magnitude={strongest.magnitude} magType={strongest.magType} size="sm" />
              <span className="min-w-0 leading-tight">
                <span className="eyebrow block">{t.live.strongest}</span>
                <span className="block truncate text-sm font-semibold text-white">{strongest.location || t.common.unknownLocation}</span>
              </span>
            </button>
          )}

          {latest && (
            <button
              className="glass hidden min-w-0 max-w-[260px] shrink-0 snap-start items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:border-white/20 sm:flex"
              onClick={() => setSelectedId(latest.id)}
            >
              <MagBadge magnitude={latest.magnitude} magType={latest.magType} size="sm" />
              <span className="min-w-0 leading-tight">
                <span className="eyebrow block">
                  {t.live.latest}
                  {now && <span className="ml-1 normal-case tracking-normal text-slate-500">· {fmt.relative(latest.time, now)}</span>}
                </span>
                <span className="block truncate text-sm font-semibold text-white">{latest.location || t.common.unknownLocation}</span>
              </span>
            </button>
          )}

          <button
            className={`glass flex shrink-0 snap-start items-center gap-2.5 rounded-2xl px-4 py-2.5 text-left transition-colors hover:border-white/20 ${
              showSources ? 'border-quake-500/50' : ''
            }`}
            onClick={() => setShowSources((v) => !v)}
            aria-expanded={showSources}
          >
            <IconLayers className="h-5 w-5 text-sky-400" />
            <span className="leading-tight">
              <span className="block font-display text-xl font-bold tabular-nums text-white">
                {okSources}
                <span className="text-sm font-medium text-slate-500">/{feed.sources.length || Object.keys(SOURCES).length}</span>
              </span>
              <span className="block text-[11px] text-slate-400">{t.live.sourcesActive}</span>
            </span>
          </button>
        </div>
        {(feed.error || (feed.updatedAt && now)) && (
          <p className="pointer-events-auto mt-1 inline-block rounded-lg bg-ink-950/70 px-2 py-0.5 text-[11px] text-slate-400 backdrop-blur">
            {feed.error ? <span className="text-amber-400">{t.live.connectionProblem}</span> : t.live.updated(fmt.relative(feed.updatedAt!, now!))}
          </p>
        )}
      </div>

      {showSources && (
        <div className="glass absolute left-3 top-[5.5rem] z-[600] max-h-[65vh] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl p-4 text-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-white">{t.live.dataSources}</h2>
            <button className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => setShowSources(false)} aria-label={t.common.close}>
              ✕
            </button>
          </div>
          <p className="mb-3 text-xs text-slate-400">{t.live.hiddenSourceHint}</p>
          <ul className="space-y-1">
            {feed.sources.map((s) => (
              <li key={s.id}>
                <label
                  htmlFor={`src-${s.id}`}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#ff5a36]"
                    checked={!hidden.has(s.id)}
                    onChange={() => toggleSource(s.id)}
                    id={`src-${s.id}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-100">{s.name}</span>
                    <span className="block truncate text-xs text-slate-500">{SOURCES[s.id]?.region[locale]}</span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                      s.pending ? 'bg-white/5 text-slate-400' : s.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}
                    title={s.error ? `${t.live.errorPrefix}: ${s.error}` : s.updatedAt ? fmt.dateTime(s.updatedAt) : ''}
                  >
                    {s.pending ? t.live.sourceLoading : s.ok ? s.count : t.live.sourceError}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">{t.live.liveFooter}</p>
        </div>
      )}

      {/* Büyüklük ölçeği */}
      <div
        className="glass pointer-events-none absolute bottom-6 left-[52px] z-[500] hidden rounded-xl px-3 py-2 md:block"
        aria-label={t.live.legend}
      >
        <p className="eyebrow mb-1.5">{t.live.legend}</p>
        <div className="flex items-end gap-1">
          {[...MAG_SCALE].reverse().map((s, i) => (
            <span key={s.label} className="flex flex-col items-center gap-1">
              <span
                className="rounded-full"
                style={{ background: s.color, width: 8 + i * 2.5, height: 8 + i * 2.5, boxShadow: `0 0 10px ${s.color}80` }}
              />
              <span className="text-[10px] tabular-nums text-slate-400">{s.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Panel: geniş ekranda sağda yüzen kart, dar ekranda alttan açılan sayfa */}
      <aside
        className={`glass absolute inset-x-0 bottom-0 z-[700] flex h-[72%] flex-col rounded-t-3xl transition-transform duration-300 md:inset-x-auto md:bottom-3 md:right-3 md:top-3 md:z-[500] md:h-auto md:w-[400px] md:rounded-3xl ${
          panelOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-[calc(100%+1.5rem)] md:translate-y-0'
        }`}
        aria-hidden={!panelOpen && isMobile ? true : undefined}
      >
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="glass absolute -left-11 top-3 hidden h-9 w-9 items-center justify-center rounded-xl text-lg text-slate-300 hover:text-white md:flex"
          aria-label={panelOpen ? t.live.hidePanel : t.live.showPanel}
        >
          {panelOpen ? '›' : '‹'}
        </button>
        {/* Mobil tutamak: dokununca kapanır */}
        <button
          onClick={() => setPanelOpen(false)}
          className="flex w-full justify-center pb-1 pt-2.5 md:hidden"
          aria-label={t.live.hidePanel}
        >
          <span className="h-1.5 w-12 rounded-full bg-white/20" />
        </button>

        <div className="space-y-3 border-b border-white/[0.06] px-4 pb-4 pt-1 md:pt-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-bold text-white">{t.live.panelTitle}</h2>
            <span className="text-xs tabular-nums text-slate-400">{t.common.earthquakes(fmt.number(shownList.length))}</span>
          </div>
          <label className="relative block">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.live.searchPlaceholder}
              className={`${inputClass} w-full py-2 pl-9`}
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented
              label={t.common.magnitude}
              value={minMag}
              onChange={setMinMag}
              options={MAG_FILTERS.map((m) => ({ value: m, label: m === 0 ? t.common.all : `${m}+` }))}
            />
            <Segmented
              label={t.common.time}
              value={hours}
              onChange={setHours}
              options={TIME_FILTERS.map((h) => ({ value: h, label: t.live.hours(h) }))}
            />
          </div>
        </div>

        {panelOpen && (
          <EarthquakeList
            items={shownList}
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
          className="absolute bottom-8 left-1/2 z-[600] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-b from-quake-400 to-quake-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(255,90,54,0.8)] md:hidden"
        >
          <IconList className="h-4 w-4" />
          {t.live.openList}
          <span className="rounded-full bg-black/20 px-2 text-xs tabular-nums">{fmt.number(visible.length)}</span>
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
    <ol className="overscroll-contain flex-1 space-y-1.5 overflow-y-auto px-2.5 pb-8 pt-2.5">
      {items.slice(0, shown).map((eq) => {
        const isNew = arrivals.has(eq.id);
        const selected = selectedId === eq.id;
        return (
          <li key={eq.id}>
            <button
              onClick={() => onSelect(eq.id)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                selected ? 'border-quake-500/50 bg-quake-500/10' : 'border-transparent hover:border-white/[0.07] hover:bg-white/[0.04]'
              } ${isNew ? 'eq-new' : ''}`}
            >
              <MagBadge magnitude={eq.magnitude} magType={eq.magType} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-100">{eq.location || t.common.unknownLocation}</span>
                  {isNew && (
                    <span className="shrink-0 rounded-full bg-quake-500 px-1.5 py-px text-[9px] font-bold tracking-wide text-white">
                      {t.common.newBadge}
                    </span>
                  )}
                </span>
                <span className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <IconClock className="h-3.5 w-3.5 text-slate-500" />
                    <time dateTime={eq.time} title={fmt.dateTime(eq.time)}>
                      {now ? fmt.relative(eq.time, now) : fmt.dateTime(eq.time)}
                    </time>
                  </span>
                  <span className="flex items-center gap-1 tabular-nums">
                    <IconDepth className="h-3.5 w-3.5 text-slate-500" />
                    {formatDepth(eq.depth)}
                  </span>
                  <span className="truncate rounded-md bg-white/5 px-1.5 py-px text-[10px] font-semibold text-slate-300">{reporterNames(eq)}</span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
      {items.length === 0 && (
        <li className="p-8 text-center text-sm text-slate-400">
          {loaded ? t.common.noResults : t.common.loading}
        </li>
      )}
      {items.length > shown && shown < LIST_LIMIT && (
        <li className="p-1">
          <button
            onClick={onMore}
            className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] py-2.5 text-xs font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white"
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
