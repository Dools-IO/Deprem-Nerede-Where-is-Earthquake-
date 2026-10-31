/* Sayfalar arasında ortak küçük arayüz parçaları */
import { formatMagnitude, magnitudeColor } from '@/lib/format';

export function MagBadge({ magnitude, magType, size = 'md' }: { magnitude: number; magType?: string; size?: 'md' | 'lg' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-bold tabular-nums text-slate-950 ${
        size === 'lg' ? 'h-10 w-10 text-sm' : 'h-7 w-11 text-sm'
      }`}
      style={{ background: magnitudeColor(magnitude) }}
      title={magType}
    >
      {formatMagnitude(magnitude)}
    </span>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
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

export const inputClass =
  'rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500';
