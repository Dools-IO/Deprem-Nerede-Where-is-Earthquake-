import { locale, type Lang } from '@/lib/i18n';

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};
const FORMATTERS = {
  tr: { rtf: new Intl.RelativeTimeFormat('tr', { numeric: 'auto' }), dtf: new Intl.DateTimeFormat(locale('tr'), DATE_OPTIONS) },
  en: { rtf: new Intl.RelativeTimeFormat('en', { numeric: 'auto' }), dtf: new Intl.DateTimeFormat(locale('en'), DATE_OPTIONS) },
};

export function formatRelative(iso: string, now: number, lang: Lang): string {
  const { rtf } = FORMATTERS[lang];
  // Sunucu saati istemciden biraz ileride olabilir; gelecek zamanı "şimdi" say
  const diff = Math.min(0, (Date.parse(iso) - now) / 1000);
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

export function formatDateTime(iso: string, lang: Lang): string {
  return FORMATTERS[lang].dtf.format(new Date(iso));
}

export const formatMagnitude = (m: number) => m.toFixed(1);
export const formatDepth = (d: number) => `${d.toFixed(1)} km`;

/** Büyüklük ölçeği: harita, liste ve lejant aynı renkleri kullanır */
export const MAG_SCALE = [
  { min: 7, color: '#7f1d1d', label: '7+' },
  { min: 6, color: '#dc2626', label: '6–6.9' },
  { min: 5, color: '#f97316', label: '5–5.9' },
  { min: 4, color: '#f59e0b', label: '4–4.9' },
  { min: 3, color: '#eab308', label: '3–3.9' },
  { min: 2, color: '#84cc16', label: '2–2.9' },
  { min: -Infinity, color: '#22c55e', label: '<2' },
] as const;

export function magnitudeColor(m: number): string {
  return (MAG_SCALE.find((s) => m >= s.min) ?? MAG_SCALE[MAG_SCALE.length - 1]).color;
}

/** Piksel cinsinden işaret yarıçapı; enerji logaritmik olduğu için büyüklükle üstel artar */
export function magnitudeRadius(m: number): number {
  return Math.max(3, Math.min(40, 2.5 * Math.pow(1.45, Math.max(0, m))));
}
