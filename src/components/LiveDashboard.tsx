'use client';

import dynamic from 'next/dynamic';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { Earthquake, EarthquakeFeed, SourceId } from '@/types';
import { useEarthquakeFeed } from '@/hooks/useEarthquakeFeed';
import { useNow } from '@/hooks/useNow';
import { SOURCES } from '@/lib/sourceInfo';
import { formatDateTime, formatDepth, formatMagnitude, formatRelative, MAG_SCALE, magnitudeColor } from '@/lib/format';
import { formatCount, regionOf } from '@/lib/i18n';
import { useI18n } from './I18nProvider';

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
  const feed = useEarthquakeFeed(initial);
  const now = useNow();
  const { lang, t } = useI18n();
  const [minMag, setMinMag] = useState(0);
  const [hours, setHours] = useState(24);
  const [hidden, setHidden] = useState<Set<SourceId>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Panel kapalı başlar, geniş ekranda açılır: dar ekranda liste hiç çizilmez
  const [panelOpen, setPanelOpen] = useState(false);
  const [listCount, setListCount] = useState(LIST_STEP);
  const showMore = useCallback(() => setListCount((c) => Math.min(c + LIST_STEP, LIST_LIMIT)), []);
  const [showSources, setShowSources] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) setPanelOpen(true);
  }, []);

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
          <LiveBadge status={feed.live} />
          <span className="text-slate-300">
            <strong className="text-white">{formatCount(visible.length, lang)}</strong> {t.quakes}
          </span>
          {strongest && (
            <button
              className="hidden text-slate-300 hover:text-white sm:inline"
              onClick={() => setSelectedId(strongest.id)}
              title={t.strongestTitle}
            >
              {t.strongest} <strong style={{ color: magnitudeColor(strongest.magnitude) }}>M{formatMagnitude(strongest.magnitude)}</strong>
            </button>
          )}
          <button
            className="text-slate-300 hover:text-white"
            onClick={() => setShowSources((v) => !v)}
            aria-expanded={showSources}
          >
            {okSources}/{feed.sources.length || Object.keys(SOURCES).length} {t.sources}
          </button>
          {feed.updatedAt && now && (
            <span className="hidden text-xs text-slate-400 md:inline">{t.updated(formatRelative(feed.updatedAt, now, lang))}</span>
          )}
          {feed.error && <span className="text-xs text-amber-400">{t.connError}</span>}
        </div>
      </div>

      {showSources && (
        <div className="absolute left-3 top-16 z-[600] max-h-[70vh] w-80 overflow-y-auto rounded-lg bg-slate-900/95 p-3 text-sm shadow-xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">{t.dataSources}</h2>
            <button className="text-slate-400 hover:text-white" onClick={() => setShowSources(false)} aria-label={t.close}>
              ✕
            </button>
          </div>
          <p className="mb-2 text-xs text-slate-400">{t.sourcesHint}</p>
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
                  <span className="text-xs text-slate-400">{SOURCES[s.id] && regionOf(SOURCES[s.id], lang)}</span>
                </label>
                <span
                  className={`text-xs ${s.pending ? 'text-slate-400' : s.ok ? 'text-emerald-400' : 'text-rose-400'}`}
                  title={s.error ? `${t.errorPrefix}: ${s.error}` : s.updatedAt ? formatDateTime(s.updatedAt, lang) : ''}
                >
                  {s.pending ? t.pending : s.ok ? s.count : t.failed}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">{t.liveNote}</p>
        </div>
      )}

      {/* Sağ panel: filtreler + liste */}
      <aside
        className={`absolute bottom-0 right-0 top-0 z-[500] flex w-[85vw] max-w-sm flex-col bg-slate-900/90 shadow-2xl backdrop-blur transition-transform duration-300 ${
          panelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="absolute -left-9 top-3 rounded-l-md bg-slate-900/90 px-2 py-2 text-slate-300 hover:text-white"
          aria-label={panelOpen ? t.hidePanel : t.showPanel}
        >
          {panelOpen ? '›' : '‹'}
        </button>

        <div className="space-y-3 border-b border-slate-800 p-3">
          <FilterRow label={t.magnitude}>
            {MAG_FILTERS.map((m) => (
              <Chip key={m} active={minMag === m} onClick={() => setMinMag(m)}>
                {m === 0 ? t.all : `${m}+`}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label={t.time}>
            {TIME_FILTERS.map((h) => (
              <Chip key={h} active={hours === h} onClick={() => setHours(h)}>
                {t.hoursShort(h)}
              </Chip>
            ))}
          </FilterRow>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
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
            onSelect={setSelectedId}
            loaded={!!feed.updatedAt}
          />
        )}
      </aside>
    </div>
  );
}

function LiveBadge({ status }: { status: 'connecting' | 'live' | 'offline' }) {
  const { t } = useI18n();
  const map = {
    live: { dot: 'bg-red-500', text: t.live, title: t.liveTitle },
    connecting: { dot: 'bg-amber-400', text: t.connecting, title: t.connectingTitle },
    offline: { dot: 'bg-slate-500', text: t.offline, title: t.offlineTitle },
  }[status];
  return (
    <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide" title={map.title}>
      <span className="relative flex h-2.5 w-2.5">
        {status === 'live' && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${map.dot} opacity-75`} />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${map.dot}`} />
      </span>
      {map.text}
    </span>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        active ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
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
  const { lang, t } = useI18n();
  const shown = Math.min(count, LIST_LIMIT);
  // pb-12: harita atıf şeridi (mobilde iki satır) listenin son satırını örtmesin
  return (
    <ol className="flex-1 overflow-y-auto pb-12">
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
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-bold text-slate-950"
                style={{ background: magnitudeColor(eq.magnitude) }}
              >
                {formatMagnitude(eq.magnitude)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{eq.location || t.noLocation}</span>
                <span className="block text-xs text-slate-400">
                  <time dateTime={eq.time} title={formatDateTime(eq.time, lang)}>
                    {now ? formatRelative(eq.time, now, lang) : formatDateTime(eq.time, lang)}
                  </time>
                  {' · '}
                  {formatDepth(eq.depth)}
                  {' · '}
                  {[eq.source, ...(eq.alsoReportedBy ?? [])].map((s) => SOURCES[s]?.name ?? s).join(', ')}
                </span>
              </span>
              {isNew && <span className="rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{t.newBadge}</span>}
            </button>
          </li>
        );
      })}
      {items.length === 0 && (
        <li className="p-6 text-center text-sm text-slate-400">
          {loaded ? t.noMatches : t.loading}
        </li>
      )}
      {items.length > shown && shown < LIST_LIMIT && (
        <li className="p-2">
          <button
            onClick={onMore}
            className="w-full rounded-md bg-slate-800 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            {t.showMoreOf(formatCount(items.length, lang), shown)}
          </button>
        </li>
      )}
      {items.length > LIST_LIMIT && shown >= LIST_LIMIT && (
        <li className="p-3 text-center text-xs text-slate-500">{t.firstN(LIST_LIMIT)}</li>
      )}
    </ol>
  );
});
