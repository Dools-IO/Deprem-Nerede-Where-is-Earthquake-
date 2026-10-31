# Deprem Nerede? (Where is the Earthquake?)

**English** · [Türkçe](README.tr.md)

A Next.js app that shows every earthquake in the world on one map, as close to real time as possible. Data comes only from the official APIs and feeds published by the agencies themselves. The interface is available in Turkish and English.

## Features

- **Live map:** the browser connects to EMSC's official WebSocket service, so new earthquakes appear within seconds. The other 16 sources refresh on the server every 30–120 s.
- **Merging:** reports of the same earthquake are merged into one record by time, distance and magnitude tolerance; regional official agencies take priority in their own region.
- **List:** location search, source and magnitude filters, newest / strongest sorting, card layout on mobile.
- **History:** with the optional PostgreSQL archive, map and list for ranges of up to 31 days.
- **Two languages:** Turkish URLs have no prefix (`/liste`), English lives under `/en` (`/en/liste`). On a first visit, browsers that do not ask for Turkish are sent to English; the choice is remembered.
- **Public API:** strict rate limits, with licence information. Details below and on the app's `/api-docs` page.

## Sources and licences

Every record stays under its own source licence; this project does not relicense the data. Sources whose redistribution permission is not confirmed are shown on the website map but left out of the public API (`publicApi: false`). Once permission is granted, it is a one-line change in `src/lib/sourceInfo.ts`.

| Id | Agency | Region | Method | Licence | API |
|---|---|---|---|---|---|
| `afad` | [AFAD Deprem Dairesi Başkanlığı](https://deprem.afad.gov.tr) | Türkiye | apiv2 JSON | [No open licence published](https://deprem.afad.gov.tr) | Permission pending |
| `kandilli` | [Boğaziçi Üni. Kandilli Rasathanesi (KOERI)](http://www.koeri.boun.edu.tr) | Türkiye | lst0.asp plain text (no official API) | [No open licence; © KOERI](http://www.koeri.boun.edu.tr) | Permission pending |
| `ingv` | [Istituto Nazionale di Geofisica e Vulcanologia](https://terremoti.ingv.it) | Italy | FDSN | [CC BY 4.0](https://www.ingv.it/it/note-legali) | Yes |
| `geonet` | [GeoNet](https://www.geonet.org.nz) | New Zealand | GeoJSON API | [CC BY 3.0 NZ](https://www.geonet.org.nz/policy) | Yes |
| `ga` | [Geoscience Australia](https://earthquakes.ga.gov.au) | Australia | WFS GeoJSON | [CC BY 4.0](https://researchdata.edu.au/earthquakesga) | Yes |
| `jma` | [Japan Meteorological Agency](https://www.jma.go.jp) | Japan | bosai JSON | [Public Data License (Japan) 1.0, CC BY 4.0 compatible](https://www.jma.go.jp/jma/kishou/info/coment.html) | Yes |
| `ssn` | [Servicio Sismológico Nacional](http://www.ssn.unam.mx) | Mexico | RSS | [Unverified (no licence page found)](http://www.ssn.unam.mx) | Permission pending |
| `sed` | [Swiss Seismological Service (ETH Zürich)](http://www.seismo.ethz.ch) | Switzerland and the Alps | FDSN | [opendata.swiss: open use, source must be given](https://opendata.swiss/en/terms-of-use) | Yes |
| `renass` | [EPOS-France / RéNaSS](https://renass.unistra.fr) | France and overseas | FDSN | [Unverified](https://renass.unistra.fr/en/legale-notice) | Permission pending |
| `ign` | [Instituto Geográfico Nacional](https://www.ign.es/web/ign/portal/sis-catalogo-terremotos) | Spain, Morocco, Canaries | GeoRSS | [Orden FOM/2807/2015, CC BY 4.0 compatible](https://www.ign.es/web/en/politica-datos) | Yes |
| `ipma` | [Instituto Português do Mar e da Atmosfera](https://www.ipma.pt) | Portugal, Azores | Open data JSON | [IPMA terms: non-commercial use only](https://api.ipma.pt/) | Yes |
| `bmkg` | [Badan Meteorologi, Klimatologi, dan Geofisika](https://www.bmkg.go.id) | Indonesia | Open data JSON | [BMKG terms: written permission required to redistribute](https://www.bmkg.go.id/ketentuan-penggunaan) | Permission pending |
| `usp` | [Centro de Sismologia da USP (RSBR)](https://www.moho.iag.usp.br) | Brazil | FDSN | [No licence published](https://www.moho.iag.usp.br) | Permission pending |
| `noa` | [National Observatory of Athens, Geodynamics Institute](https://www.gein.noa.gr) | Greece and the Aegean | FDSN | [CC BY 4.0](https://eida.gein.noa.gr) | Yes |
| `emsc` | [European-Mediterranean Seismological Centre](https://www.emsc-csem.org) | World | FDSN JSON + WebSocket | [CC BY 4.0 (no bulk mirroring)](https://seismicportal.eu/terms.html) | Yes |
| `usgs` | [United States Geological Survey](https://earthquake.usgs.gov) | World | GeoJSON summary feed | [Public domain (U.S. Government)](https://www.usgs.gov/faqs/how-should-i-cite-a-usgs-website) | Yes |
| `geofon` | [GFZ GEOFON](https://geofon.gfz.de) | World | FDSN | [CC BY 4.0](https://geofon.gfz.de/eqinfo/faq/) | Yes |

Attribution texts are in `src/lib/sourceInfo.ts` and on the `/api-docs` page, and are returned in the `licenses` field of API responses.

Canada (NRCan) is not included because its FDSN service applies bot protection (HTTP 403) to automated requests; Canadian earthquakes come through USGS and EMSC. Greenland (GEUS) only publishes a historical list updated on workdays, and Russia (GS RAS) has no public machine API; these regions come through USGS, EMSC and GEOFON.

## API

- `GET /api/earthquakes?minmag=&source=&since=&limit=` merged feed and source status
- `GET /api/v1/{source}` raw data of a single source, `GET /api/v1/all` merged list
- `GET /api/history?from=&to=&minmag=&source=&limit=` past earthquakes from the archive (503 when the archive is off)

Every response includes `licenses` (licence and attribution of the contributing sources) and `terms`.

### Limits

| | Per minute | Per day | Other |
|---|---|---|---|
| `/api/earthquakes`, `/api/v1/*` | 10 | 300 | at most 500 records per response |
| `/api/history` | 3 | 50 | range of at most 7 days, 500 records |

Limits are per IP; over the limit you get `429` with `Retry-After` and `X-RateLimit-*` headers. Live responses are cached for 60 s, settled history ranges for 10 minutes. All values live in one place, `src/lib/apiPolicy.ts`. The website's own pages use separate `/api/app/*` endpoints, which can only be called from the site's pages.

To protect the server further, putting free Cloudflare in front of Coolify is recommended (caching, DDoS protection, edge rate limiting).

### Terms of use

1. The data may be used for non-commercial purposes only. **Commercial use is strictly prohibited.**
2. Everyone using the data must follow each record's source licence and keep its attribution.
3. The data is merged and processed from several sources and provided as is, without any warranty.
4. This data is not an official earthquake warning and must not be presented as one. Follow the responsible agency for official information.
5. Do not poll live data more often than every 60 seconds. Access is cut off without notice for clients that break these terms or limits.

## Setup

Requires Node.js 22 or later (24 LTS recommended).

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run typecheck
npm test
```

No environment variables or API keys are needed. With `TEST_DATABASE_URL` set, `npm test` also runs the database test; it drops and recreates the `earthquake_reports` table, so use an empty test database.

## History archive (optional)

When `DATABASE_URL` is set, the server writes every source's raw reports to PostgreSQL (only new or changed ones); the `earthquake_reports` table is created on first connection and reports are merged at query time. Without it the app works as before and the history endpoints return 503. The archive fills from the moment the server starts recording.

### Deploying on Coolify (database created automatically)

`docker-compose.yml` defines the app and PostgreSQL together; Coolify creates the database, its password and `DATABASE_URL` by itself.

1. In Coolify, **+ New > Public/Private Repository**, pick this repository, branch `main`.
2. Choose the **Docker Compose** build pack (file: `/docker-compose.yml`).
3. Set your domain on the `app` service; leave `db` alone.
4. **Deploy**. Database data lives in the persistent `deprem-db` volume.
5. Open `/gecmis` to check.

## Project structure

```
Dockerfile, docker-compose.yml   Production image (Node 24) and app + PostgreSQL
src/
  app/[lang]/                    Pages (tr without prefix, en under /en): map, list, history, api-docs, 404
  app/api/                       Public API: earthquakes, v1/[source], history
  app/api/app/                   The website's own endpoints (feed, history), closed to outside callers
  components/                    LiveDashboard, LiveMap, QuakeTable, SiteHeader, shared ui pieces
  hooks/                         useEarthquakeFeed (30 s refresh + live), useEmscLive (WebSocket)
  i18n/                          Language config, tr/en dictionaries, I18nProvider
  lib/sources/                   Parsers (pure), fetchers, cache and merging
  lib/sourceInfo.ts              Source registry: name, regions, priority, licence, attribution, publicApi
  lib/apiPolicy.ts               API rate limits, record cap, cache durations
  lib/archive.ts                 PostgreSQL archive
  middleware.ts                  Language routing and API rate limiting
tests/                           Parser, merge, filter, language and archive tests
```

## Development

**New source:** one entry in `DEFINITIONS` in `src/lib/sourceInfo.ts` (name, region names, priority, licence, attribution, `publicApi`), its fetcher in `FETCHERS` in `src/lib/sources/fetchers.ts`, and a test in `tests/parsers.test.ts`. A missing field or fetcher fails `npm run typecheck`.

**New language:** add the code to `LOCALES` in `src/i18n/config.ts`, a dictionary under `src/i18n/dictionaries/`, and the region names of the sources. A missing translation fails the build.

## Licence

The code is MIT licensed. The earthquake data is not covered by this licence; every record stays under its own source licence (table above).
