'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import type { EarthquakeFeed, SourceId } from '@/types';
import { useEarthquakeFeed } from '@/hooks/useEarthquakeFeed';
import { useNow } from '@/hooks/useNow';
import { SOURCES } from '@/lib/sourceInfo';
import { formatDateTime, formatDepth, formatMagnitude, formatRelative, MAG_SCALE, magnitudeColor } from '@/lib/format';

const LiveMap = dynamic(() => import('./LiveMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-900" />,
});

const MAG_FILTERS = [0, 2.5, 4, 5, 6];
const TIME_FILTERS = [
  { hours: 1, label: '1 sa' },
  { hours: 6, label: '6 sa' },
  { hours: 24, label: '24 sa' },
];
const LIST_LIMIT = 200;

export default function LiveDashboard({ initial }: { initial: EarthquakeFeed | null }) {
  const feed = useEarthquakeFeed(initial);
  const now = useNow();
  const [minMag, setMinMag] = useState(0);
  const [hours, setHours] = useState(24);
  const [hidden, setHidden] = useState<Set<SourceId>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [showSources, setShowSources] = useState(false);

  // Dar ekranda harita görünsün diye panel kapalı başlar
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setPanelOpen(false);
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
            <strong className="text-white">{visible.length.toLocaleString('tr-TR')}</strong> deprem
          </span>
          {strongest && (
            <button
              className="hidden text-slate-300 hover:text-white sm:inline"
              onClick={() => setSelectedId(strongest.id)}
              title="En büyük depreme git"
            >
              En büyük: <strong style={{ color: magnitudeColor(strongest.magnitude) }}>M{formatMagnitude(strongest.magnitude)}</strong>
            </button>
          )}
          <button
            className="text-slate-300 hover:text-white"
            onClick={() => setShowSources((v) => !v)}
            aria-expanded={showSources}
          >
            {okSources}/{feed.sources.length || Object.keys(SOURCES).length} kaynak
          </button>
          {feed.updatedAt && now && (
            <span className="hidden text-xs text-slate-400 md:inline">güncellendi {formatRelative(feed.updatedAt, now)}</span>
          )}
          {feed.error && <span className="text-xs text-amber-400">bağlantı sorunu, yeniden deneniyor</span>}
        </div>
      </div>

      {showSources && (
        <div className="absolute left-3 top-16 z-[600] max-h-[70vh] w-80 overflow-y-auto rounded-lg bg-slate-900/95 p-3 text-sm shadow-xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Veri kaynakları</h2>
            <button className="text-slate-400 hover:text-white" onClick={() => setShowSources(false)} aria-label="Kapat">
              ✕
            </button>
          </div>
          <p className="mb-2 text-xs text-slate-400">İşareti kaldırılan kaynağın yalnız raporladığı depremler gizlenir.</p>
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
                  <span className="text-xs text-slate-400">{SOURCES[s.id]?.region}</span>
                </label>
                <span
                  className={`text-xs ${s.pending ? 'text-slate-400' : s.ok ? 'text-emerald-400' : 'text-rose-400'}`}
                  title={s.error ? `Hata: ${s.error}` : s.updatedAt ? formatDateTime(s.updatedAt) : ''}
                >
                  {s.pending ? 'yükleniyor' : s.ok ? s.count : 'hata'}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Canlı akış: EMSC WebSocket. Diğer kaynaklar sunucuda 30–120 sn aralıkla yenilenir.
          </p>
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
          aria-label={panelOpen ? 'Paneli gizle' : 'Paneli göster'}
        >
          {panelOpen ? '›' : '‹'}
        </button>

        <div className="space-y-3 border-b border-slate-800 p-3">
          <FilterRow label="Büyüklük">
            {MAG_FILTERS.map((m) => (
              <Chip key={m} active={minMag === m} onClick={() => setMinMag(m)}>
                {m === 0 ? 'Tümü' : `${m}+`}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Zaman">
            {TIME_FILTERS.map((t) => (
              <Chip key={t.hours} active={hours === t.hours} onClick={() => setHours(t.hours)}>
                {t.label}
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

        <ol className="flex-1 overflow-y-auto">
          {visible.slice(0, LIST_LIMIT).map((eq) => {
            const isNew = feed.arrivals.has(eq.id);
            return (
              <li key={eq.id}>
                <button
                  onClick={() => setSelectedId(eq.id)}
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
                    <span className="block truncate text-sm font-medium">{eq.location || 'Konum belirtilmemiş'}</span>
                    <span className="block text-xs text-slate-400">
                      <time dateTime={eq.time} title={formatDateTime(eq.time)}>
                        {now ? formatRelative(eq.time, now) : formatDateTime(eq.time)}
                      </time>
                      {' · '}
                      {formatDepth(eq.depth)}
                      {' · '}
                      {[eq.source, ...(eq.alsoReportedBy ?? [])].map((s) => SOURCES[s]?.name ?? s).join(', ')}
                    </span>
                  </span>
                  {isNew && <span className="rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">YENİ</span>}
                </button>
              </li>
            );
          })}
          {visible.length === 0 && (
            <li className="p-6 text-center text-sm text-slate-400">
              {feed.updatedAt ? 'Bu filtrelerle deprem yok.' : 'Veriler yükleniyor…'}
            </li>
          )}
          {visible.length > LIST_LIMIT && (
            <li className="p-3 text-center text-xs text-slate-500">
              İlk {LIST_LIMIT} kayıt listeleniyor; tamamı haritada.
            </li>
          )}
        </ol>
      </aside>
    </div>
  );
}

function LiveBadge({ status }: { status: 'connecting' | 'live' | 'offline' }) {
  const map = {
    live: { dot: 'bg-red-500', text: 'CANLI', title: 'EMSC canlı akışına bağlı' },
    connecting: { dot: 'bg-amber-400', text: 'Bağlanıyor', title: 'Canlı akışa bağlanılıyor' },
    offline: { dot: 'bg-slate-500', text: 'Canlı akış yok', title: 'Canlı akış koptu; 30 sn yenileme devam ediyor' },
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
