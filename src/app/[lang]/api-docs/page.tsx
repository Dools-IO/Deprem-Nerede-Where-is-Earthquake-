import type { Metadata } from 'next';
import { SOURCES } from '@/lib/sourceInfo';
import { isLang, regionOf, type Lang } from '@/lib/i18n';
import { pageMetadata } from '@/lib/pageMetadata';

export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> =>
  pageMetadata(params, '/api-docs', (t) => t.apiTitle);

const Code = ({ children }: { children: string }) => (
  <pre className="mb-6 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-200">{children.trim()}</pre>
);

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-2 mt-8 text-2xl font-semibold text-white">{children}</h2>
);

const TEXT = {
  tr: {
    title: 'Deprem API',
    intro: (
      <>
        Tüm kaynaklar resmi API veya kurumların kendi yayınladığı beslemelerden sunucu tarafında çekilir, tek formata
        çevrilir ve aynı depremi raporlayan kayıtlar birleştirilir. API herkese açıktır.
      </>
    ),
    facts: [
      'Zaman penceresi: son 24 saat. Tüm zamanlar UTC, ISO 8601.',
      "Önbellek: kaynak başına 30–120 sn. Yanıtlar CDN'de 30 sn önbelleklenir.",
      'Hız sınırı: IP başına dakikada 60 istek (429 döner).',
    ],
    feed: 'Birleştirilmiş akış ve kaynak durumları. Haritanın kullandığı uç nokta budur.',
    params: {
      minmag: 'En küçük büyüklük',
      source: 'Virgülle ayrılmış kaynak kimlikleri (aşağıda)',
      since: 'Bu zamandan sonraki depremler (ISO 8601)',
    },
    sourceSegment: 'kaynak',
    single: (
      <>
        Tek bir kaynağın ham (birleştirilmemiş) verisi. <code>/api/v1/all</code> birleşik listeyi döndürür. Aynı filtre
        parametreleri geçerlidir.
      </>
    ),
    history: (
      <>
        Kalıcı arşivden geçmiş depremler (sunucuda <code>DATABASE_URL</code> tanımlıysa; değilse 503). Kaynakların ham
        kayıtları sorgu anında birleştirilir. Parametreler: <code>from</code>, <code>to</code> (ISO 8601, varsayılan son 24
        saat, en fazla 31 gün), <code>minmag</code>, <code>source</code>, <code>limit</code> (varsayılan 2000).
      </>
    ),
    sources: 'Kaynaklar',
    cols: ['Kimlik', 'Kurum', 'Bölge'],
    ws: (
      <>
        Haritadaki anlık akış ayrıca tarayıcıdan doğrudan EMSC&apos;nin WebSocket servisine
        (<code>wss://www.seismicportal.eu/standing_order/websocket</code>) bağlanır.
      </>
    ),
  },
  en: {
    title: 'Earthquake API',
    intro: (
      <>
        Every source is fetched on the server from official APIs or feeds published by the agencies themselves,
        converted to a single format, and records of the same earthquake are merged. The API is public.
      </>
    ),
    facts: [
      'Time window: last 24 hours. All times are UTC, ISO 8601.',
      'Cache: 30–120 s per source. Responses are cached on the CDN for 30 s.',
      'Rate limit: 60 requests per minute per IP (returns 429).',
    ],
    feed: 'Merged feed and source status. This is the endpoint the map uses.',
    params: {
      minmag: 'Minimum magnitude',
      source: 'Comma-separated source IDs (see below)',
      since: 'Earthquakes after this time (ISO 8601)',
    },
    sourceSegment: 'source',
    single: (
      <>
        Raw (unmerged) data of a single source. <code>/api/v1/all</code> returns the merged list. The same filter
        parameters apply.
      </>
    ),
    history: (
      <>
        Past earthquakes from the persistent archive (when <code>DATABASE_URL</code> is set on the server; otherwise 503).
        Raw source records are merged at query time. Parameters: <code>from</code>, <code>to</code> (ISO 8601, default
        last 24 hours, at most 31 days), <code>minmag</code>, <code>source</code>, <code>limit</code> (default 2000).
      </>
    ),
    sources: 'Sources',
    cols: ['ID', 'Agency', 'Region'],
    ws: (
      <>
        The live updates on the map also connect directly from the browser to EMSC&apos;s WebSocket service
        (<code>wss://www.seismicportal.eu/standing_order/websocket</code>).
      </>
    ),
  },
} satisfies Record<Lang, unknown>;

export default async function ApiDocsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : 'tr';
  const x = TEXT[lang];
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-slate-300">
      <h1 className="mb-4 text-3xl font-bold text-white">{x.title}</h1>
      <p className="mb-6">{x.intro}</p>

      <ul className="mb-8 list-disc space-y-1 pl-6">
        {x.facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      <H2>GET /api/earthquakes</H2>
      <p className="mb-3">{x.feed}</p>
      <Code>{`
GET /api/earthquakes?minmag=4&source=afad,kandilli&since=2026-10-30T12:00:00Z&limit=100

{
  "updatedAt": "2026-10-30T21:10:00.000Z",
  "windowHours": 24,
  "count": 12,
  "sources": [{ "id": "afad", "name": "AFAD", "ok": true, "count": 143, "updatedAt": "..." }],
  "earthquakes": [
    {
      "id": "afad:597830",
      "time": "2026-10-30T20:14:49.000Z",
      "latitude": 41.1115,
      "longitude": 35.1765,
      "depth": 7.5,
      "magnitude": 4.1,
      "magType": "ML",
      "location": "Vezirköprü (Samsun)",
      "source": "afad",
      "url": "https://deprem.afad.gov.tr/event-detail/597830",
      "alsoReportedBy": ["kandilli", "emsc"]
    }
  ]
}
`}</Code>
      <table className="mb-8 w-full text-sm">
        <tbody className="[&_td]:border-t [&_td]:border-slate-800 [&_td]:py-1.5 [&_td]:pr-4">
          <tr><td><code>minmag</code></td><td>{x.params.minmag}</td></tr>
          <tr><td><code>source</code></td><td>{x.params.source}</td></tr>
          <tr><td><code>since</code></td><td>{x.params.since}</td></tr>
          <tr><td><code>limit</code></td><td>1–10000</td></tr>
        </tbody>
      </table>

      <H2>GET /api/v1/&#123;{x.sourceSegment}&#125;</H2>
      <p className="mb-3">{x.single}</p>
      <Code>{`
{ "success": true, "source": "usgs", "count": 312, "lastUpdated": "...", "data": [ ... ] }
`}</Code>

      <H2>GET /api/history</H2>
      <p className="mb-3">{x.history}</p>
      <Code>{`
GET /api/history?from=2026-10-01&to=2026-10-08&minmag=4
{ "from": "...", "to": "...", "count": 812, "truncated": false, "earthquakes": [ ... ] }
`}</Code>

      <H2>{x.sources}</H2>
      <table className="w-full text-sm">
        <thead className="text-left text-slate-400">
          <tr><th className="py-1.5">{x.cols[0]}</th><th>{x.cols[1]}</th><th>{x.cols[2]}</th></tr>
        </thead>
        <tbody className="[&_td]:border-t [&_td]:border-slate-800 [&_td]:py-1.5 [&_td]:pr-4">
          {Object.values(SOURCES).map((s) => (
            <tr key={s.id}>
              <td><code>{s.id}</code></td>
              <td>
                <a href={s.homepage} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                  {s.fullName}
                </a>
              </td>
              <td>{regionOf(s, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm text-slate-500">{x.ws}</p>
    </div>
  );
}
