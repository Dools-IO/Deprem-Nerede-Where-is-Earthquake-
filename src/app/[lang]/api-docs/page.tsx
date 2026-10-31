import type { Metadata } from 'next';
import { SOURCES } from '@/lib/sourceInfo';
import { MIN_POLL_SECONDS, PUBLIC_HISTORY_MAX_DAYS, PUBLIC_MAX_RECORDS, RATE_LIMITS } from '@/lib/apiPolicy';
import { getDictionary } from '@/i18n';
import { pageMetadata, resolveLocale } from '@/i18n/metadata';
import { PageHeader } from '@/components/ui';

type Params = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return pageMetadata(locale, '/api-docs', getDictionary(locale).meta.apiTitle);
}

const Code = ({ children }: { children: string }) => (
  <pre className="mb-6 overflow-x-auto rounded-xl border border-white/[0.06] bg-ink-950 p-4 font-mono text-[13px] leading-relaxed text-sky-100/90">{children.trim()}</pre>
);

const H2 = ({ id, children }: { id?: string; children: React.ReactNode }) => (
  <h2 id={id} className="mb-3 mt-12 scroll-mt-24 font-display text-2xl font-bold tracking-tight text-white">{children}</h2>
);

/** Uç nokta başlığı: GET rozeti + yol */
const Endpoint = ({ path }: { path: string }) => (
  <h2 className="mb-3 mt-12 flex items-center gap-3 font-mono text-lg font-semibold text-white">
    <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-xs font-bold tracking-wide text-emerald-400">GET</span>
    {path}
  </h2>
);

export default async function ApiDocsPage({ params }: Params) {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).api;
  return (
    <div className="page-bg">
    <div className="mx-auto max-w-4xl px-4 py-8 leading-relaxed text-slate-300 md:py-12">
      <PageHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.intro} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="card p-4 text-sm">{t.window}</div>
        <div className="card p-4 text-sm">{t.cache}</div>
      </div>

      <H2>{t.limitsHeading}</H2>
      <ul className="card mb-8 space-y-2 p-5 text-sm marker:text-quake-500 [&>li]:ml-4 [&>li]:list-disc [&>li]:pl-1">
        <li>{t.limitPublic(RATE_LIMITS.public.perMinute, RATE_LIMITS.public.perDay)}</li>
        <li>{t.limitHistory(RATE_LIMITS.publicHistory.perMinute, RATE_LIMITS.publicHistory.perDay, PUBLIC_HISTORY_MAX_DAYS)}</li>
        <li>{t.limitRecords(PUBLIC_MAX_RECORDS)}</li>
        <li>{t.limitPoll(MIN_POLL_SECONDS)}</li>
        <li>{t.limit429}</li>
        <li>{t.responseLicenses}</li>
      </ul>

      <Endpoint path="/api/earthquakes" />
      <p className="mb-3">{t.earthquakesDesc}</p>
      <Code>{`
GET /api/earthquakes?minmag=4&source=emsc,usgs&since=2026-10-30T12:00:00Z&limit=100

{
  "updatedAt": "2026-10-30T21:10:00.000Z",
  "windowHours": 24,
  "count": 12,
  "sources": [{ "id": "usgs", "name": "USGS", "ok": true, "count": 143, "updatedAt": "..." }],
  "truncated": false,
  "earthquakes": [
    {
      "id": "usgs:us7000abcd",
      "time": "2026-10-30T20:14:49.000Z",
      "latitude": 41.1115,
      "longitude": 35.1765,
      "depth": 7.5,
      "magnitude": 4.1,
      "magType": "mb",
      "location": "northern Turkey",
      "source": "usgs",
      "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abcd",
      "alsoReportedBy": ["emsc"]
    }
  ],
  "licenses": [{ "id": "usgs", "name": "...", "license": "...", "licenseUrl": "...", "attribution": "..." }],
  "terms": { "url": "/api-docs#terms", "summary": "..." }
}
`}</Code>
      <table className="card mb-8 w-full overflow-hidden text-sm [&_code]:text-quake-400 [&_td]:px-4">
        <tbody className="[&_td]:border-t [&_td]:border-white/[0.04] [&_td]:py-2.5">
          <tr><td><code>minmag</code></td><td>{t.params.minmag}</td></tr>
          <tr><td><code>source</code></td><td>{t.params.source}</td></tr>
          <tr><td><code>since</code></td><td>{t.params.since}</td></tr>
          <tr><td><code>limit</code></td><td>1–{PUBLIC_MAX_RECORDS}</td></tr>
        </tbody>
      </table>

      <Endpoint path={`/api/v1/{${t.sourcePath}}`} />
      <p className="mb-3">{t.v1Desc}</p>
      <Code>{`
{ "success": true, "source": "usgs", "count": 312, "lastUpdated": "...", "data": [ ... ] }
`}</Code>

      <Endpoint path="/api/history" />
      <p className="mb-3">{t.historyDesc}</p>
      <Code>{`
GET /api/history?from=2026-10-01&to=2026-10-08&minmag=4
{ "from": "...", "to": "...", "count": 812, "truncated": false, "earthquakes": [ ... ] }
`}</Code>

      <H2 id="licenses">{t.licensesHeading}</H2>
      <p className="mb-3">{t.licensesIntro}</p>
      <div className="card mb-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-white/[0.06] bg-white/[0.02] text-left text-[11px] uppercase tracking-[0.12em] text-slate-500 [&_th]:px-4">
            <tr>
              <th className="py-2 pr-4 font-medium">{t.colId}</th>
              <th className="py-2 pr-4 font-medium">{t.colAgency}</th>
              <th className="py-2 pr-4 font-medium">{t.colLicense}</th>
              <th className="py-2 pr-4 font-medium">{t.colAttribution}</th>
              <th className="py-2 font-medium">{t.colApi}</th>
            </tr>
          </thead>
          <tbody className="align-top [&_td]:border-t [&_td]:border-white/[0.04] [&_td]:px-4 [&_td]:py-2.5">
            {Object.values(SOURCES).map((s) => (
              <tr key={s.id}>
                <td><code>{s.id}</code></td>
                <td>
                  <a href={s.homepage} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                    {s.fullName}
                  </a>
                  <span className="block text-xs text-slate-500">{s.region[locale]}</span>
                </td>
                <td>
                  <a href={s.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                    {s.license}
                  </a>
                </td>
                <td className="text-xs text-slate-400">{s.attribution}</td>
                <td>
                  {s.publicApi ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">{t.apiYes}</span>
                  ) : (
                    <span className="whitespace-nowrap rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400">{t.apiNo}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mb-8 text-sm text-slate-400">{t.restrictedSourceNote}</p>

      <H2 id="terms">{t.termsHeading}</H2>
      <ol className="card mb-4 list-decimal space-y-2 p-5 pl-10 text-sm marker:font-bold marker:text-quake-400">
        {t.terms.map((term) => (
          <li key={term}>{term}</li>
        ))}
      </ol>
      <p className="mb-8 text-sm text-slate-400">{t.ourAttribution}</p>

      <p className="mt-4 text-sm text-slate-500">
        {t.wsNote} <code>wss://www.seismicportal.eu/standing_order/websocket</code>
      </p>
    </div>
    </div>
  );
}
