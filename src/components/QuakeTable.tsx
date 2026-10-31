'use client';

import { useState } from 'react';
import type { Earthquake } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { reporterNames } from '@/lib/sourceInfo';
import { formatDepth } from '@/lib/format';
import { IconExternal, MagBadge } from './ui';

const PAGE = 50;

interface Props {
  rows: Earthquake[];
  /** Göreli zaman için şimdiki an (yoksa yalnız tarih gösterilir) */
  now?: number | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Harita/kaynak bağlantıları sütunu */
  showLinks?: boolean;
  emptyText: string;
}

/**
 * Deprem tablosu: geniş ekranda tablo, dar ekranda kart listesi. Uzun listeler
 * 50'şer satır çizilir. Yeni bir veri kümesinde sayfalamayı sıfırlamak için `key` verin.
 */
export default function QuakeTable({ rows, now, selectedId, onSelect, showLinks, emptyText }: Props) {
  const { t, fmt } = useI18n();
  const [shown, setShown] = useState(PAGE);
  const visible = rows.slice(0, shown);

  const mapUrl = (eq: Earthquake) =>
    `https://www.openstreetmap.org/?mlat=${eq.latitude}&mlon=${eq.longitude}#map=8/${eq.latitude}/${eq.longitude}`;
  const links = (eq: Earthquake) => (
    <>
      <a href={mapUrl(eq)} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/[0.08] px-2 py-1 text-slate-300 hover:border-white/20 hover:text-white">
        {t.common.map}
      </a>
      {eq.url && (
        <>
          <a href={eq.url} target="_blank" rel="noopener noreferrer" className="ml-1.5 inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2 py-1 text-slate-300 hover:border-white/20 hover:text-white">
            {t.common.details}
            <IconExternal className="h-3 w-3" />
          </a>
        </>
      )}
    </>
  );
  const rowClass = (eq: Earthquake) =>
    `${onSelect ? 'cursor-pointer' : ''} ${selectedId === eq.id ? 'bg-quake-500/10' : 'hover:bg-white/[0.03]'}`;

  return (
    <>
      <div className="card overflow-hidden">
        {/* Geniş ekran: tablo */}
        <table className="hidden w-full text-sm md:table">
          <thead className="border-b border-white/[0.06] bg-white/[0.02] text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">{t.common.magnitude}</th>
              <th className="px-4 py-3 font-semibold">{t.common.location}</th>
              <th className="px-4 py-3 font-semibold">{t.common.time}</th>
              <th className="px-4 py-3 font-semibold">{t.common.depth}</th>
              <th className="px-4 py-3 font-semibold">{t.common.source}</th>
              {showLinks && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {visible.map((eq) => (
              <tr key={eq.id} onClick={onSelect && (() => onSelect(eq.id))} className={`border-t border-white/[0.04] transition-colors ${rowClass(eq)}`}>
                <td className="px-4 py-2.5">
                  <MagBadge magnitude={eq.magnitude} magType={eq.magType} size="sm" />
                </td>
                <td className="px-4 py-2.5 font-medium text-slate-100">{eq.location || t.common.unknownLocation}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-300">
                  <time dateTime={eq.time}>{fmt.dateTime(eq.time)}</time>
                  {now && <span className="block text-xs text-slate-500">{fmt.relative(eq.time, now)}</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-300">{formatDepth(eq.depth)}</td>
                <td className="px-4 py-2.5"><span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] font-semibold text-slate-300">{reporterNames(eq)}</span></td>
                {showLinks && <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs">{links(eq)}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Dar ekran: kartlar */}
        <ol className="md:hidden">
          {visible.map((eq) => (
            <li
              key={eq.id}
              onClick={onSelect && (() => onSelect(eq.id))}
              className={`flex items-start gap-3 border-t border-white/[0.05] px-4 py-3 first:border-t-0 ${rowClass(eq)}`}
            >
              <MagBadge magnitude={eq.magnitude} magType={eq.magType} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-100">{eq.location || t.common.unknownLocation}</div>
                <div className="text-xs text-slate-400">
                  <time dateTime={eq.time} title={fmt.dateTime(eq.time)}>
                    {now ? fmt.relative(eq.time, now) : fmt.dateTime(eq.time)}
                  </time>
                  {' · '}
                  {formatDepth(eq.depth)}
                  {' · '}
                  {reporterNames(eq)}
                </div>
                {showLinks && <div className="mt-2 text-xs">{links(eq)}</div>}
              </div>
            </li>
          ))}
        </ol>

        {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-400">{emptyText}</p>}
      </div>
      {rows.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="mx-auto mt-5 block rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/[0.07]"
        >
          {t.common.showMore(fmt.number(rows.length), shown)}
        </button>
      )}
    </>
  );
}
