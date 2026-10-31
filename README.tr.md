# Deprem Nerede?

[English](README.md) · **Türkçe**

Dünyadaki tüm depremleri tek bir haritada, olabildiğince anlık gösteren Next.js uygulaması. Veriler yalnızca kurumların resmi API'lerinden ve kendi yayınladıkları beslemelerden alınır. Arayüz Türkçe ve İngilizce kullanılabilir.

## Özellikler

- **Canlı harita:** Tarayıcı EMSC'nin resmi WebSocket servisine bağlanır; yeni depremler saniyeler içinde haritaya düşer. Diğer 16 kaynak sunucuda 30–120 sn aralıkla yenilenir.
- **Birleştirme:** Aynı depremi raporlayan kayıtlar zaman, mesafe ve büyüklük toleransıyla tek kayda indirilir; bölgesel resmi kurumlar kendi bölgelerinde önceliklidir.
- **Liste:** Konum araması, kaynak ve büyüklük filtresi, en yeni / en büyük sıralaması. Mobilde kart görünümü.
- **Geçmiş:** PostgreSQL arşivi (isteğe bağlı) ile en fazla 31 günlük aralıkta harita ve liste.
- **İki dil:** Türkçe adresler öneksiz (`/liste`), İngilizce `/en` altında (`/en/liste`). İlk ziyarette tarayıcı Türkçe istemiyorsa İngilizceye yönlendirilir; dil seçimi hatırlanır.
- **Herkese açık API:** Katı hız sınırları, lisans bilgisiyle birlikte. Ayrıntılar aşağıda ve uygulamadaki `/api-docs` sayfasında.

## Kaynaklar ve lisanslar

Her kayıt kendi kaynağının lisansına tabidir; bu proje veriyi yeniden lisanslamaz. Yeniden dağıtım izni doğrulanamayan kaynaklar sitedeki haritada gösterilir ama herkese açık API çıktısına girmez (`publicApi: false`). İzin alındığında `src/lib/sourceInfo.ts` içinde tek satırla açılır.

| Kimlik | Kurum | Bölge | Yöntem | Lisans | API |
|---|---|---|---|---|---|
| `afad` | [AFAD Deprem Dairesi Başkanlığı](https://deprem.afad.gov.tr) | Türkiye | apiv2 JSON | [No open licence published](https://deprem.afad.gov.tr) | İzin bekleniyor |
| `kandilli` | [Boğaziçi Üni. Kandilli Rasathanesi (KOERI)](http://www.koeri.boun.edu.tr) | Türkiye | lst0.asp düz metin (resmi API yok) | [No open licence; © KOERI](http://www.koeri.boun.edu.tr) | İzin bekleniyor |
| `ingv` | [Istituto Nazionale di Geofisica e Vulcanologia](https://terremoti.ingv.it) | İtalya | FDSN | [CC BY 4.0](https://www.ingv.it/it/note-legali) | Var |
| `geonet` | [GeoNet](https://www.geonet.org.nz) | Yeni Zelanda | GeoJSON API | [CC BY 3.0 NZ](https://www.geonet.org.nz/policy) | Var |
| `ga` | [Geoscience Australia](https://earthquakes.ga.gov.au) | Avustralya | WFS GeoJSON | [CC BY 4.0](https://researchdata.edu.au/earthquakesga) | Var |
| `jma` | [Japan Meteorological Agency](https://www.jma.go.jp) | Japonya | bosai JSON | [Public Data License (Japan) 1.0, CC BY 4.0 compatible](https://www.jma.go.jp/jma/kishou/info/coment.html) | Var |
| `ssn` | [Servicio Sismológico Nacional](http://www.ssn.unam.mx) | Meksika | RSS | [Unverified (no licence page found)](http://www.ssn.unam.mx) | İzin bekleniyor |
| `sed` | [Swiss Seismological Service (ETH Zürich)](http://www.seismo.ethz.ch) | İsviçre ve Alpler | FDSN | [opendata.swiss: open use, source must be given](https://opendata.swiss/en/terms-of-use) | Var |
| `renass` | [EPOS-France / RéNaSS](https://renass.unistra.fr) | Fransa ve denizaşırı bölgeler | FDSN | [Unverified](https://renass.unistra.fr/en/legale-notice) | İzin bekleniyor |
| `ign` | [Instituto Geográfico Nacional](https://www.ign.es/web/ign/portal/sis-catalogo-terremotos) | İspanya, Fas, Kanarya | GeoRSS | [Orden FOM/2807/2015, CC BY 4.0 compatible](https://www.ign.es/web/en/politica-datos) | Var |
| `ipma` | [Instituto Português do Mar e da Atmosfera](https://www.ipma.pt) | Portekiz, Azorlar | Açık veri JSON | [IPMA terms: non-commercial use only](https://api.ipma.pt/) | Var |
| `bmkg` | [Badan Meteorologi, Klimatologi, dan Geofisika](https://www.bmkg.go.id) | Endonezya | Açık veri JSON | [BMKG terms: written permission required to redistribute](https://www.bmkg.go.id/ketentuan-penggunaan) | İzin bekleniyor |
| `usp` | [Centro de Sismologia da USP (RSBR)](https://www.moho.iag.usp.br) | Brezilya | FDSN | [No licence published](https://www.moho.iag.usp.br) | İzin bekleniyor |
| `noa` | [National Observatory of Athens, Geodynamics Institute](https://www.gein.noa.gr) | Yunanistan ve Ege | FDSN | [CC BY 4.0](https://eida.gein.noa.gr) | Var |
| `emsc` | [European-Mediterranean Seismological Centre](https://www.emsc-csem.org) | Dünya | FDSN JSON + WebSocket | [CC BY 4.0 (no bulk mirroring)](https://seismicportal.eu/terms.html) | Var |
| `usgs` | [United States Geological Survey](https://earthquake.usgs.gov) | Dünya | GeoJSON özet beslemesi | [Public domain (U.S. Government)](https://www.usgs.gov/faqs/how-should-i-cite-a-usgs-website) | Var |
| `geofon` | [GFZ GEOFON](https://geofon.gfz.de) | Dünya | FDSN | [CC BY 4.0](https://geofon.gfz.de/eqinfo/faq/) | Var |

Atıf metinleri `src/lib/sourceInfo.ts` içinde ve `/api-docs` sayfasındadır; API yanıtlarındaki `licenses` alanında da döner.

Kanada (NRCan) FDSN servisi otomatik isteklere bot koruması (HTTP 403) uyguladığı için eklenmedi; Kanada depremleri USGS ve EMSC üzerinden gelir. Grönland (GEUS) yalnızca iş günlerinde güncellenen tarihsel bir liste yayınlıyor, Rusya (GS RAS) için herkese açık makine API'si yok; bu bölgeler USGS, EMSC ve GEOFON üzerinden gelir.

## API

- `GET /api/earthquakes?minmag=&source=&since=&limit=` birleşik akış ve kaynak durumları
- `GET /api/v1/{kaynak}` tek kaynağın ham verisi, `GET /api/v1/all` birleşik liste
- `GET /api/history?from=&to=&minmag=&source=&limit=` kalıcı arşivden geçmiş depremler (arşiv etkin değilse 503)

Her yanıtta `licenses` (katkı veren kaynakların lisansı ve atıf metni) ve `terms` alanları bulunur.

### Sınırlar

| | Dakikada | Günde | Diğer |
|---|---|---|---|
| `/api/earthquakes`, `/api/v1/*` | 10 | 300 | yanıt başına en fazla 500 kayıt |
| `/api/history` | 3 | 50 | en fazla 7 günlük aralık, 500 kayıt |

Sınırlar IP başınadır; aşılınca `429`, `Retry-After` ve `X-RateLimit-*` başlıkları döner. Canlı yanıtlar 60 sn, geçmişte kalmış aralıklar 10 dk önbelleklenir. Değerler tek yerde, `src/lib/apiPolicy.ts` içinde. Sitenin kendi sayfaları ayrı `/api/app/*` uçlarını kullanır; bunlar yalnız sitenin sayfalarından çağrılabilir.

Sunucuyu daha da korumak için Coolify'ın önüne ücretsiz Cloudflare koymanız önerilir (önbellek, DDoS koruması, kenar hız sınırı).

### Kullanım şartları

1. Veri yalnız ticari olmayan amaçlarla kullanılabilir. **Ticari kullanım kesinlikle yasaktır.**
2. Veriyi kullanan herkes her kaydın kaynağının lisansına uymak ve atıf metnini korumak zorundadır.
3. Veri birden çok kaynaktan birleştirilerek düzenlenmiştir; olduğu gibi, hiçbir garanti olmadan verilir.
4. Bu veri resmi bir deprem uyarısı değildir ve öyle sunulamaz. Resmi bilgi için ilgili kurumu izleyin.
5. Canlı veriyi 60 saniyeden sık yoklamayın. Şartlara veya sınırlara uymayan istemcilerin erişimi bildirimsiz kesilir.

## Kurulum

Node.js 22 veya üzeri gerekir (24 LTS önerilir).

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run typecheck
npm test
```

Ortam değişkeni veya API anahtarı gerekmez. `npm test`, `TEST_DATABASE_URL` verilirse veritabanı testini de çalıştırır; bu test `earthquake_reports` tablosunu silip yeniden oluşturur, boş bir test veritabanı kullanın.

## Geçmiş arşivi (isteğe bağlı)

`DATABASE_URL` tanımlanırsa sunucu her kaynaktan gelen ham kayıtları PostgreSQL'e yazar (yalnızca yeni veya değişen kayıtlar); `earthquake_reports` tablosu ilk bağlantıda otomatik oluşur ve kayıtlar sorgu anında birleştirilir. Tanımlı değilse uygulama eskisi gibi çalışır ve geçmiş uçları 503 döner. Arşiv, sunucunun kayda başladığı andan itibaren dolar.

### Coolify ile kurulum (veritabanı otomatik)

Depodaki `docker-compose.yml` uygulamayı ve PostgreSQL'i birlikte tanımlar; Coolify veritabanını, şifresini ve `DATABASE_URL`'i kendisi oluşturur.

1. Coolify'da **+ New > Public/Private Repository** ile bu depoyu seçin, branch `main`.
2. Build Pack olarak **Docker Compose** seçin (dosya: `/docker-compose.yml`).
3. `app` servisine alan adınızı girin; `db` servisine dokunmayın.
4. **Deploy**. Veritabanı verisi `deprem-db` kalıcı biriminde durur.
5. `/gecmis` sayfasını açarak kontrol edin.

## Proje yapısı

```
Dockerfile, docker-compose.yml   Üretim imajı (Node 24) ve uygulama + PostgreSQL
src/
  app/[lang]/                    Sayfalar (tr öneksiz, en /en altında): harita, liste, gecmis, api-docs, 404
  app/api/                       Herkese açık API: earthquakes, v1/[source], history
  app/api/app/                   Sitenin kendi uçları (feed, history), dışarıya kapalı
  components/                    LiveDashboard, LiveMap, QuakeTable, SiteHeader, ortak ui parçaları
  hooks/                         useEarthquakeFeed (30 sn yenileme + canlı), useEmscLive (WebSocket)
  i18n/                          Dil ayarları, tr/en sözlükleri, I18nProvider
  lib/sources/                   Ayrıştırıcılar (saf), çekiciler, önbellek ve birleştirme
  lib/sourceInfo.ts              Kaynak kayıt defteri: ad, bölge, öncelik, lisans, atıf, publicApi
  lib/apiPolicy.ts               API hız sınırları, kayıt sınırı, önbellek süreleri
  lib/archive.ts                 PostgreSQL arşivi
  middleware.ts                  Dil yönlendirmesi ve API hız sınırı
tests/                           Ayrıştırıcı, birleştirme, filtre, dil ve arşiv testleri
```

## Geliştirme

**Yeni kaynak:** `src/lib/sourceInfo.ts` içindeki `DEFINITIONS`'a bir girdi (ad, bölge adları, öncelik, lisans, atıf, `publicApi`), `src/lib/sources/fetchers.ts` içindeki `FETCHERS`'a çekicisi ve `tests/parsers.test.ts`'e bir test. Eksik alan veya çekici `npm run typecheck`'te hata verir.

**Yeni dil:** `src/i18n/config.ts` içindeki `LOCALES`'a kodu, `src/i18n/dictionaries/` altına sözlüğü ekleyin ve kaynakların bölge adlarını tamamlayın. Eksik çeviri derlemede hata verir.

## Lisans

Kod MIT lisanslıdır. Deprem verileri bu lisansa dahil değildir; her kayıt kendi kaynağının lisansına tabidir (yukarıdaki tablo).
