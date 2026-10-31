# Deprem Nerede? (Where's the Earthquake?)

Dünyadaki tüm depremleri tek bir haritada, olabildiğince anlık gösteren Next.js uygulaması.
Veriler yalnızca kurumların resmi API'lerinden ve kendi yayınladıkları beslemelerden alınır.

## Nasıl çalışır

- **Canlı akış:** Tarayıcı, EMSC'nin resmi WebSocket servisine bağlanır; dünyadaki her yeni deprem saniyeler içinde haritaya düşer.
- **Birleşik akış:** Sunucu 17 kaynağı kendi aralıklarıyla (30–120 sn) çeker, tek formata çevirir ve aynı depremi raporlayan kayıtları birleştirir (zaman, mesafe ve büyüklük toleransıyla). Tarayıcı bu akışı 30 sn'de bir yeniler; sekme arka plandayken durur.
- **Önbellek:** Kaynak başına bellek içi önbellek, eş zamanlı istekleri tek yukarı akış isteğinde toplar, hata olursa son sağlam veriyi göstermeye devam eder. API yanıtları CDN'de 30 sn önbelleklenir; dış kaynaklara giden istek sayısı ziyaretçi sayısından bağımsızdır.
- **Hızlı ilk açılış:** Sunucu açılır açılmaz (`instrumentation.ts`) tüm kaynakları çekmeye başlar. Önbellek henüz boşken gelen ilk istek yavaş bir kaynağı en fazla 1,5 sn bekler; yetişemeyen kaynak `pending: true` olarak işaretlenir ve hazır olan verilerle hemen yanıt verilir. Tarayıcı bekleyen kaynak varsa 3 sn sonra tekrar sorar. Hiç başarılı olamamış ama hata veren bir kaynak istekleri bekletmez, arka planda yeniden denenir. Ölçüm (production): soğuk ilk istek ~1,7 sn, sonraki istekler ~120 ms.
- **Harita:** Leaflet + canvas çizim (binlerce işaret akıcı), yalnızca değişen işaretler güncellenir. Altlık anahtarsız Esri koyu gri haritadır; kareler yüklenemezse otomatik olarak OpenStreetMap'e geçer.

## Kaynaklar

| Kimlik | Kurum | Bölge | Yöntem |
|---|---|---|---|
| `afad` | AFAD | Türkiye | apiv2 JSON |
| `kandilli` | Kandilli Rasathanesi | Türkiye | Kurumun yayınladığı `lst0.asp` düz metin listesi (resmi API yok) |
| `emsc` | EMSC | Dünya | FDSN JSON + WebSocket |
| `usgs` | USGS | Dünya | GeoJSON özet beslemesi |
| `geofon` | GFZ GEOFON | Dünya | FDSN |
| `ingv` | INGV | İtalya | FDSN |
| `sed` | ETH Zürich SED | İsviçre/Alpler | FDSN |
| `renass` | EPOS-France RéNaSS | Fransa ve denizaşırı | FDSN |
| `ign` | IGN | İspanya, Fas, Kanarya | GeoRSS |
| `ipma` | IPMA | Portekiz, Azorlar | Açık veri JSON |
| `geonet` | GeoNet | Yeni Zelanda | GeoJSON API |
| `ga` | Geoscience Australia | Avustralya | WFS GeoJSON |
| `jma` | JMA | Japonya | bosai JSON |
| `bmkg` | BMKG | Endonezya | Açık veri JSON |
| `ssn` | SSN | Meksika | RSS |
| `usp` | USP Sismologia | Brezilya | FDSN |
| `noa` | Atina Ulusal Gözlemevi (NOA) | Yunanistan ve Ege | FDSN |

Kanada (NRCan) FDSN servisi otomatik isteklere bot koruması (HTTP 403) uyguladığı için eklenmedi; Kanada depremleri USGS ve EMSC üzerinden gelir.

Değerlendirilip eklenmeyenler: Grönland (GEUS) yalnızca iş günlerinde güncellenen tarihsel bir liste yayınlıyor, Rusya (GS RAS) için herkese açık makine API'si yok. Bu bölgeler USGS, EMSC ve GEOFON üzerinden gelir.

FDSN veri merkezleri listesi: https://www.fdsn.org/datacenters/

## Kurulum

Node.js 22 veya üzeri gerekir (24 LTS önerilir).

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run typecheck
npm test           # ayrıştırıcı, birleştirme ve filtre testleri
```

Ortam değişkeni veya API anahtarı gerekmez.

`npm test`, `TEST_DATABASE_URL` verilirse veritabanı (arşiv) testini de çalıştırır. Bu test `earthquake_reports` tablosunu silip yeniden oluşturur; boş bir test veritabanı kullanın:

```bash
TEST_DATABASE_URL=postgres://kullanici:sifre@localhost:5432/deprem_test npm test
```

## API

- `GET /api/earthquakes?minmag=&source=&since=&limit=` birleşik akış ve kaynak durumları
- `GET /api/v1/{kaynak}` tek kaynağın ham verisi, `GET /api/v1/all` birleşik liste
- `GET /api/history?from=&to=&minmag=&source=&limit=` kalıcı arşivden geçmiş depremler (arşiv etkin değilse 503)

Ayrıntılar uygulamadaki `/api-docs` sayfasında. IP başına dakikada 60 istek sınırı vardır.

## Geçmiş arşivi (isteğe bağlı)

`DATABASE_URL` ortam değişkeni tanımlanırsa sunucu her kaynaktan gelen ham kayıtları PostgreSQL'e yazar (yalnızca yeni veya değişen kayıtlar). `earthquake_reports` tablosu ilk bağlantıda otomatik oluşur. Kaynakların ham kayıtları saklanır ve sorgu anında birleştirilir.

`DATABASE_URL` tanımlı değilse uygulama eskisi gibi çalışır ve `/api/history` 503 döner.

`/gecmis` sayfası tarih aralığı (en fazla 31 gün), büyüklük ve kaynak filtresiyle harita ve liste gösterir. Arşiv, sunucunun kayda başladığı andan itibaren dolar; daha eski depremler arşivde bulunmaz.

### Coolify ile kurulum (veritabanı otomatik)

Depoda uygulama ve PostgreSQL'i birlikte tanımlayan bir `docker-compose.yml` var. Coolify veritabanını, şifresini ve `DATABASE_URL`'i kendisi oluşturur:

1. Coolify'da **+ New > Public/Private Repository** ile bu depoyu seçin.
2. Build Pack olarak **Docker Compose** seçin (dosya: `/docker-compose.yml`).
3. `app` servisine alan adınızı girin (boş bırakırsanız Coolify otomatik bir adres verir).
4. **Deploy**. PostgreSQL ayağa kalkar, `earthquake_reports` tablosu ilk bağlantıda oluşur.
5. `/gecmis` ve `/api/history` adreslerini açarak kontrol edin.

Veritabanı verisi `deprem-db` adlı kalıcı birimde durur; yeniden dağıtımda silinmez.

Mevcut bir Nixpacks kurulumuna arşiv eklemek isterseniz: ayrı bir PostgreSQL kaynağı ekleyip **Postgres URL (internal)** değerini uygulamaya `DATABASE_URL` olarak girin ve yeniden dağıtın.

## Proje yapısı

```
Dockerfile                   Üretim imajı (Node 24)
docker-compose.yml           Uygulama + PostgreSQL (Coolify)
src/
  app/
    page.tsx                 Canlı dünya haritası
    liste/page.tsx           Filtrelenebilir liste
    gecmis/page.tsx          Geçmiş sayfası (arşivden harita + liste)
    api-docs/page.tsx
    api/earthquakes/route.ts
    api/v1/[source]/route.ts
    api/history/route.ts     Geçmiş API'si
  components/                LiveDashboard, LiveMap, EarthquakeTable
  hooks/                     useEarthquakeFeed (30 sn yenileme + canlı), useEmscLive (WebSocket)
  lib/
    sources/parsers.ts       Her kaynağın yanıtını ortak tipe çeviren saf fonksiyonlar
    sources/fetchers.ts      Kaynak URL'leri, zaman aşımı, TTL
    sources/index.ts         Önbellek, ilk açılış ısıtması ve birleştirme (yalnız sunucu)
    sourceInfo.ts            Kaynak kayıt defteri (ad, bölge, öncelik); SourceId buradan türetilir
    merge.ts                 Kaynaklar arası tekrar birleştirme
    filters.ts               API sorgu parametreleri (minmag, source, since, limit)
    archive.ts               PostgreSQL arşivi (DATABASE_URL ile isteğe bağlı)
    format.ts                Tarih, büyüklük ve harita işaret renk/boyut yardımcıları
  instrumentation.ts         Sunucu açılışında önbelleği ısıtır
  middleware.ts              /api hız sınırı
tests/                       Ayrıştırıcı, birleştirme ve filtre testleri (npm test)
  archive.test.ts            Geçmiş parametreleri; TEST_DATABASE_URL ile veritabanı testi
```

## Yeni kaynak ekleme

1. `src/lib/sourceInfo.ts` içindeki `DEFINITIONS` nesnesine bir girdi ekleyin (ad, bölge, öncelik).
2. `src/lib/sources/fetchers.ts` içindeki `FETCHERS` nesnesine çekicisini ekleyin. FDSN servisi varsa tek bir `fdsnSource(...)` çağrısı yeterli; yoksa `parsers.ts`'e saf bir ayrıştırıcı yazın.
3. Ayrıştırıcı için `tests/parsers.test.ts`'e örnek yanıtlı bir test ekleyin ve `npm test` çalıştırın.

Harita, liste, API, kaynak paneli ve birleştirme yeni kaynağı kendiliğinden kullanır. Çekici unutulursa `npm run typecheck` hata verir. Kayıt defteri tarayıcıya da gider, çekiciler yalnızca sunucuda kalır; iki dosya olmasının nedeni bu.

Harita altlığı: © Esri (Esri, HERE, Garmin), © OpenStreetMap katkıcıları.

## Lisans

MIT
