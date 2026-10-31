'use client';

import { useState } from 'react';
import type { Earthquake } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { reporterNames } from '@/lib/sourceInfo';
import { formatDepth } from '@/lib/format';
import { MagBadge } from './ui';

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
      <a href={mapUrl(eq)} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
        {t.common.map}
      </a>
      {eq.url && (
        <>
          {' · '}
          <a href={eq.url} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
            {t.common.details}
          </a>
        </>
      )}
    </>
  );
  const rowClass = (eq: Earthquake) =>
    `${onSelect ? 'cursor-pointer' : ''} ${selectedId === eq.id ? 'bg-slate-800' : 'hover:bg-slate-900/60'}`;

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-slate-800">
        {/* Geniş ekran: tablo */}
        <table className="hidden w-full text-sm md:table">
          <thead className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">{t.common.magnitude}</th>
              <th className="px-3 py-2 font-medium">{t.common.location}</th>
              <th className="px-3 py-2 font-medium">{t.common.time}</th>
              <th className="px-3 py-2 font-medium">{t.common.depth}</th>
              <th className="px-3 py-2 font-medium">{t.common.source}</th>
              {showLinks && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {visible.map((eq) => (
              <tr key={eq.id} onClick={onSelect && (() => onSelect(eq.id))} className={`border-t border-slate-800 ${rowClass(eq)}`}>
                <td className="px-3 py-2">
                  <MagBadge magnitude={eq.magnitude} magType={eq.magType} />
                </td>
                <td className="px-3 py-2">{eq.location || t.common.unknownLocation}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <time dateTime={eq.time}>{fmt.dateTime(eq.time)}</time>
                  {now && <span className="block text-xs text-slate-500">{fmt.relative(eq.time, now)}</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatDepth(eq.depth)}</td>
                <td className="px-3 py-2 text-xs text-slate-300">{reporterNames(eq)}</td>
                {showLinks && <td className="whitespace-nowrap px-3 py-2 text-xs">{links(eq)}</td>}
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
              className={`flex items-start gap-3 border-t border-slate-800 px-3 py-2.5 first:border-t-0 ${rowClass(eq)}`}
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
                {showLinks && <div className="mt-0.5 text-xs">{links(eq)}</div>}
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
          className="mx-auto mt-4 block rounded-md bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          {t.common.showMore(fmt.number(rows.length), shown)}
        </button>
      )}
    </>
  );
}
