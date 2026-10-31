/* Sayfalar arasında ortak küçük arayüz parçaları */
import { formatMagnitude, magnitudeColor } from '@/lib/format';

/** Büyüklük rozeti: renkli daire + hafif hale; 6 ve üstü beyaz yazı */
export function MagBadge({ magnitude, magType, size = 'md' }: { magnitude: number; magType?: string; size?: 'sm' | 'md' | 'lg' }) {
  const color = magnitudeColor(magnitude);
  const dims = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' }[size];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold tabular-nums ${dims} ${
        magnitude >= 6 ? 'text-white' : 'text-ink-950'
      }`}
      style={{ background: color, boxShadow: `0 0 0 4px ${color}26, 0 0 18px ${color}40` }}
      title={magType}
    >
      {formatMagnitude(magnitude)}
    </span>
  );
}

/** Bölümlü seçim düğmeleri (büyüklük, zaman, sıralama) */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-xl border border-white/[0.07] bg-ink-950/70 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
            value === o.value
              ? 'bg-gradient-to-b from-quake-400 to-quake-500 text-white shadow-[0_4px_14px_-4px_rgba(255,90,54,0.7)]'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? 'border-quake-500/60 bg-quake-500/15 text-quake-400'
          : 'border-white/[0.08] bg-ink-950/60 text-slate-400 hover:border-white/20 hover:text-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

/** Sayfa başlığı: küçük üst etiket, büyük başlık, açıklama ve sağda isteğe bağlı içerik */
export function PageHeader({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="eyebrow mb-2 flex items-center gap-2 text-quake-400">
          <span className="h-1.5 w-1.5 rounded-full bg-quake-500" />
          {eyebrow}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-slate-400 md:text-base">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** Sayı kutusu: istatistik şeritlerinde */
export function Stat({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: React.ReactNode; accent?: string }) {
  return (
    <div className="card min-w-0 px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 truncate font-display text-lg font-bold tabular-nums text-white sm:text-2xl" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export const inputClass =
  'rounded-xl border border-white/[0.08] bg-ink-950/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-quake-500/70 focus:ring-2 focus:ring-quake-500/20';

/* Küçük çizgi ikonlar (bağımlılık eklememek için elle) */
type IconProps = { className?: string };
const icon = (d: React.ReactNode) =>
  function Icon({ className = 'h-4 w-4' }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        {d}
      </svg>
    );
  };
export const IconMap = icon(<><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></>);
export const IconList = icon(<><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>);
export const IconHistory = icon(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>);
export const IconCode = icon(<><path d="m8 6-6 6 6 6M16 6l6 6-6 6" /></>);
export const IconClock = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const IconDepth = icon(<><path d="M12 3v14M6 11l6 6 6-6" /><path d="M4 21h16" /></>);
export const IconSearch = icon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const IconLayers = icon(<><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>);
export const IconBolt = icon(<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />);
export const IconExternal = icon(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>);
