import type { Metadata } from 'next';
import { SOURCES } from '@/lib/sourceInfo';
import { MIN_POLL_SECONDS, PUBLIC_HISTORY_MAX_DAYS, PUBLIC_MAX_RECORDS, RATE_LIMITS } from '@/lib/apiPolicy';
import { getDictionary } from '@/i18n';
import { pageMetadata, resolveLocale } from '@/i18n/metadata';

type Params = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return pageMetadata(locale, '/api-docs', getDictionary(locale).meta.apiTitle);
}

const Code = ({ children }: { children: string }) => (
  <pre className="mb-6 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-200">{children.trim()}</pre>
);

export default async function ApiDocsPage({ params }: Params) {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).api;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-slate-300">
      <h1 className="mb-4 text-3xl font-bold text-white">{t.title}</h1>
      <p className="mb-6">{t.intro}</p>

      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>{t.window}</li>
        <li>{t.cache}</li>
      </ul>

      <h2 className="mb-2 mt-8 text-2xl font-semibold text-white">{t.limitsHeading}</h2>
      <ul className="mb-8 list-disc space-y-1 pl-6">
        <li>{t.limitPublic(RATE_LIMITS.public.perMinute, RATE_LIMITS.public.perDay)}</li>
        <li>{t.limitHistory(RATE_LIMITS.publicHistory.perMinute, RATE_LIMITS.publicHistory.perDay, PUBLIC_HISTORY_MAX_DAYS)}</li>
        <li>{t.limitRecords(PUBLIC_MAX_RECORDS)}</li>
        <li>{t.limitPoll(MIN_POLL_SECONDS)}</li>
        <li>{t.limit429}</li>
        <li>{t.responseLicenses}</li>
      </ul>

      <h2 className="mb-2 mt-8 text-2xl font-semibold text-white">GET /api/earthquakes</h2>
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
      <table className="mb-8 w-full text-sm">
        <tbody className="[&_td]:border-t [&_td]:border-slate-800 [&_td]:py-1.5 [&_td]:pr-4">
          <tr><td><code>minmag</code></td><td>{t.params.minmag}</td></tr>
          <tr><td><code>source</code></td><td>{t.params.source}</td></tr>
          <tr><td><code>since</code></td><td>{t.params.since}</td></tr>
          <tr><td><code>limit</code></td><td>1–{PUBLIC_MAX_RECORDS}</td></tr>
        </tbody>
      </table>

      <h2 className="mb-2 mt-8 text-2xl font-semibold text-white">GET /api/v1/&#123;{t.sourcePath}&#125;</h2>
      <p className="mb-3">{t.v1Desc}</p>
      <Code>{`
{ "success": true, "source": "usgs", "count": 312, "lastUpdated": "...", "data": [ ... ] }
`}</Code>

      <h2 className="mb-2 mt-8 text-2xl font-semibold text-white">GET /api/history</h2>
      <p className="mb-3">{t.historyDesc}</p>
      <Code>{`
GET /api/history?from=2026-10-01&to=2026-10-08&minmag=4
{ "from": "...", "to": "...", "count": 812, "truncated": false, "earthquakes": [ ... ] }
`}</Code>

      <h2 id="licenses" className="mb-2 mt-10 text-2xl font-semibold text-white">{t.licensesHeading}</h2>
      <p className="mb-3">{t.licensesIntro}</p>
      <div className="mb-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-2 pr-4 font-medium">{t.colId}</th>
              <th className="py-2 pr-4 font-medium">{t.colAgency}</th>
              <th className="py-2 pr-4 font-medium">{t.colLicense}</th>
              <th className="py-2 pr-4 font-medium">{t.colAttribution}</th>
              <th className="py-2 font-medium">{t.colApi}</th>
            </tr>
          </thead>
          <tbody className="align-top [&_td]:border-t [&_td]:border-slate-800 [&_td]:py-2 [&_td]:pr-4">
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
                    <span className="rounded bg-emerald-900/60 px-1.5 py-0.5 text-xs text-emerald-300">{t.apiYes}</span>
                  ) : (
                    <span className="whitespace-nowrap rounded bg-amber-900/50 px-1.5 py-0.5 text-xs text-amber-300">{t.apiNo}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mb-8 text-sm text-slate-400">{t.restrictedSourceNote}</p>

      <h2 id="terms" className="mb-2 mt-10 text-2xl font-semibold text-white">{t.termsHeading}</h2>
      <ol className="mb-4 list-decimal space-y-1.5 pl-6">
        {t.terms.map((term) => (
          <li key={term}>{term}</li>
        ))}
      </ol>
      <p className="mb-8 text-sm text-slate-400">{t.ourAttribution}</p>

      <p className="mt-4 text-sm text-slate-500">
        {t.wsNote} <code>wss://www.seismicportal.eu/standing_order/websocket</code>
      </p>
    </div>
  );
}
