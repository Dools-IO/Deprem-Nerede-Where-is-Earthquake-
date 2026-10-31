import type { Metadata } from 'next';
import { SOURCES } from '@/lib/sourceInfo';

export const metadata: Metadata = { title: 'API · Deprem Nerede?' };

const Code = ({ children }: { children: string }) => (
  <pre className="mb-6 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-200">{children.trim()}</pre>
);

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-slate-300">
      <h1 className="mb-4 text-3xl font-bold text-white">Deprem API</h1>
      <p className="mb-6">
        Tüm kaynaklar resmi API veya kurumların kendi yayınladığı beslemelerden sunucu tarafında çekilir, tek formata
        çevrilir ve aynı depremi raporlayan kayıtlar birleştirilir. API herkese açıktır.
      </p>

      <ul className="mb-8 list-disc space-y-1 pl-6">
        <li>Zaman penceresi: son 24 saat. Tüm zamanlar UTC, ISO 8601.</li>
        <li>Önbellek: kaynak başına 30–120 sn. Yanıtlar CDN'de 30 sn önbelleklenir.</li>
        <li>Hız sınırı: IP başına dakikada 60 istek (429 döner).</li>
      </ul>

      <h2 className="mb-2 mt-8 text-2xl font-semibold text-white">GET /api/earthquakes</h2>
      <p className="mb-3">Birleştirilmiş akış ve kaynak durumları. Haritanın kullandığı uç nokta budur.</p>
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
          <tr><td><code>minmag</code></td><td>En küçük büyüklük</td></tr>
          <tr><td><code>source</code></td><td>Virgülle ayrılmış kaynak kimlikleri (aşağıda)</td></tr>
          <tr><td><code>since</code></td><td>Bu zamandan sonraki depremler (ISO 8601)</td></tr>
          <tr><td><code>limit</code></td><td>1–10000</td></tr>
        </tbody>
      </table>

      <h2 className="mb-2 mt-8 text-2xl font-semibold text-white">GET /api/v1/&#123;kaynak&#125;</h2>
      <p className="mb-3">
        Tek bir kaynağın ham (birleştirilmemiş) verisi. <code>/api/v1/all</code> birleşik listeyi döndürür. Aynı filtre
        parametreleri geçerlidir.
      </p>
      <Code>{`
{ "success": true, "source": "usgs", "count": 312, "lastUpdated": "...", "data": [ ... ] }
`}</Code>

      <h2 className="mb-2 mt-8 text-2xl font-semibold text-white">GET /api/history</h2>
      <p className="mb-3">
        Kalıcı arşivden geçmiş depremler (sunucuda <code>DATABASE_URL</code> tanımlıysa; değilse 503). Kaynakların ham
        kayıtları sorgu anında birleştirilir. Parametreler: <code>from</code>, <code>to</code> (ISO 8601, varsayılan son 24
        saat, en fazla 31 gün), <code>minmag</code>, <code>source</code>, <code>limit</code> (varsayılan 2000).
      </p>
      <Code>{`
GET /api/history?from=2026-10-01&to=2026-10-08&minmag=4
{ "from": "...", "to": "...", "count": 812, "truncated": false, "earthquakes": [ ... ] }
`}</Code>

      <h2 className="mb-2 mt-8 text-2xl font-semibold text-white">Kaynaklar</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-slate-400">
          <tr><th className="py-1.5">Kimlik</th><th>Kurum</th><th>Bölge</th></tr>
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
              <td>{s.region}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm text-slate-500">
        Haritadaki anlık akış ayrıca tarayıcıdan doğrudan EMSC&apos;nin WebSocket servisine
        (<code>wss://www.seismicportal.eu/standing_order/websocket</code>) bağlanır.
      </p>
    </div>
  );
}
