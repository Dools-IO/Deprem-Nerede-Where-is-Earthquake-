import { ImageResponse } from 'next/og';
import { isLocale, type Locale } from '@/i18n';

/*
 * Paylaşım önizlemesi (Open Graph) görseli: /og/tr.png ve /og/en.png.
 * Derleme anında bir kez üretilir. Adreste nokta olduğu için dil middleware'i devreye girmez.
 */
export const dynamic = 'force-static';
export const generateStaticParams = () => [{ file: 'tr.png' }, { file: 'en.png' }];

const COPY: Record<Locale, { name: string; line1: string; line2: string; accent: string; chips: string[] }> = {
  tr: {
    name: 'Deprem Nerede?',
    line1: 'Dünyadaki tüm depremler,',
    line2: 'tek haritada,',
    accent: 'canlı.',
    chips: ['17 resmi kaynak', 'Anlık akış', 'Açık API'],
  },
  en: {
    name: 'Where is the Earthquake?',
    line1: 'Every earthquake on Earth,',
    line2: 'on one map,',
    accent: 'live.',
    chips: ['17 official sources', 'Real-time feed', 'Open API'],
  },
};

/** Google Fonts'tan TTF (satori woff2 okumaz) */
// Derleme ortamında ağ yoksa görsel varsayılan yazı tipiyle yine üretilir; derleme bozulmaz
async function font(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

// Haritadaki deprem noktalarını andıran sabit noktalar (x, y, yarıçap, renk)
const DOTS: [number, number, number, string][] = [
  [690, 160, 9, '#dc2626'], [740, 240, 7, '#f59e0b'], [880, 85, 9, '#22c55e'], [820, 125, 4, '#dc2626'],
  [960, 70, 4, '#84cc16'], [1005, 78, 6, '#dc2626'], [690, 350, 9, '#eab308'], [740, 370, 5, '#dc2626'],
  [670, 425, 9, '#f97316'], [675, 327, 4, '#22c55e'], [1105, 580, 12, '#f59e0b'], [995, 600, 6, '#f97316'],
];

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const lang = file.replace(/\.png$/, '');
  const locale: Locale = isLocale(lang) ? lang : 'tr';
  const c = COPY[locale];
  const [display, body] = await Promise.all([font('Space+Grotesk', 700), font('Inter', 600)]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: '#060b18',
          backgroundImage:
            'linear-gradient(135deg, rgba(255,90,54,0.22) 0%, rgba(6,11,24,0) 40%, rgba(6,11,24,0) 65%, rgba(56,189,248,0.16) 100%)',
          color: '#e2e8f0',
          fontFamily: 'Inter',
        }}
      >
        {DOTS.map(([x, y, r, color], i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: r * 2,
              height: r * 2,
              borderRadius: 999,
              backgroundColor: color,
              opacity: 0.8,
              boxShadow: `0 0 ${r * 2}px ${color}`,
            }}
          />
        ))}

        {/* Küre + merkez üssü (logo) */}
        <svg width="520" height="520" viewBox="0 0 64 64" style={{ position: 'absolute', right: -70, top: 65 }}>
          <defs>
            <radialGradient id="o" cx="0.35" cy="0.3" r="0.9">
              <stop offset="0" stopColor="#1e3a5f" />
              <stop offset="1" stopColor="#0b1220" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="32" r="29" fill="url(#o)" />
          <ellipse cx="32" cy="32" rx="12" ry="29" fill="none" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="1.6" />
          <path d="M4 22h56M4 42h56M32 3v58" fill="none" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="1.6" />
          <circle cx="38" cy="27" r="7" fill="none" stroke="#ff5a36" strokeWidth="3" />
          <circle cx="38" cy="27" r="13" fill="none" stroke="#ff5a36" strokeOpacity="0.6" strokeWidth="2.4" />
          <circle cx="38" cy="27" r="19" fill="none" stroke="#ff5a36" strokeOpacity="0.3" strokeWidth="1.8" />
          <circle cx="38" cy="27" r="3.4" fill="#ff5a36" />
          <circle cx="32" cy="32" r="29" fill="none" stroke="#38bdf8" strokeOpacity="0.5" strokeWidth="2" />
        </svg>

        <div style={{ position: 'absolute', left: 72, top: 64, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 60, height: 60, borderRadius: 999, backgroundColor: '#0f1d33', border: '2px solid rgba(56,189,248,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 26, height: 26, borderRadius: 999, border: '5px solid #ff5a36', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: '#ff5a36' }} />
            </div>
          </div>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 30, color: '#fff' }}>{c.name}</div>
        </div>

        <div style={{ position: 'absolute', left: 72, top: 175, display: 'flex', flexDirection: 'column', fontFamily: 'Space Grotesk', fontSize: 64, lineHeight: 1.1, letterSpacing: -1.5, color: '#fff', width: 680 }}>
          <div>{c.line1}</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>{c.line2}</span>
            <span style={{ color: '#ff5a36' }}>{c.accent}</span>
          </div>
        </div>

        <div style={{ position: 'absolute', left: 72, top: 455, display: 'flex', gap: 12 }}>
          {c.chips.map((chip) => (
            <div
              key={chip}
              style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.14)', backgroundColor: 'rgba(15,25,46,0.85)', borderRadius: 999, padding: '10px 20px', fontSize: 21, color: '#cbd5e1' }}
            >
              {chip}
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', left: 72, bottom: 58, display: 'flex', alignItems: 'center', gap: 12, fontSize: 22, color: '#94a3b8' }}>
          <div style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: '#ef4444', boxShadow: '0 0 0 6px rgba(239,68,68,0.25)' }} />
          earthquake.dools.co
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        ...(display ? [{ name: 'Space Grotesk', data: display, weight: 700 as const, style: 'normal' as const }] : []),
        ...(body ? [{ name: 'Inter', data: body, weight: 600 as const, style: 'normal' as const }] : []),
      ],
    },
  );
}
