# Deprem Nerede? (Where's the Earthquake?)

Dünyadaki tüm depremleri tek bir haritada, olabildiğince anlık gösteren Next.js uygulaması.
Veriler yalnızca kurumların resmi API'lerinden ve kendi yayınladıkları beslemelerden alınır.

## Nasıl çalışır

- **Canlı akış:** Tarayıcı, EMSC'nin resmi WebSocket servisine bağlanır; dünyadaki her yeni deprem saniyeler içinde haritaya düşer.
- **Birleşik akış:** Sunucu 16 kaynağı kendi aralıklarıyla (30–120 sn) çeker, tek formata çevirir ve aynı depremi raporlayan kayıtları birleştirir (zaman, mesafe ve büyüklük toleransıyla). Tarayıcı bu akışı 30 sn'de bir yeniler; sekme arka plandayken durur.
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

Kanada (NRCan) FDSN servisi otomatik isteklere bot koruması (HTTP 403) uyguladığı için eklenmedi; Kanada depremleri USGS ve EMSC üzerinden gelir.

Yeni bir FDSN servisi eklemek için `src/lib/sources/fetchers.ts` içinde `fdsnSource(...)` satırı ve
`src/lib/sourceInfo.ts` içinde bir kayıt yeterlidir. FDSN kayıt listesi: https://www.fdsn.org/datacenters/

## Kurulum

Node.js 18.18 veya üzeri gerekir (20+ önerilir).

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run typecheck
```

Ortam değişkeni veya API anahtarı gerekmez.

## API

- `GET /api/earthquakes?minmag=&source=&since=&limit=` birleşik akış ve kaynak durumları
- `GET /api/v1/{kaynak}` tek kaynağın ham verisi, `GET /api/v1/all` birleşik liste

Ayrıntılar uygulamadaki `/api-docs` sayfasında. IP başına dakikada 60 istek sınırı vardır.

## Proje yapısı

```
src/
  app/
    page.tsx                 Canlı dünya haritası
    liste/page.tsx           Filtrelenebilir liste
    api-docs/page.tsx
    api/earthquakes/route.ts
    api/v1/[source]/route.ts
  components/                LiveDashboard, LiveMap, EarthquakeTable
  hooks/                     useEarthquakeFeed (30 sn yenileme + canlı), useEmscLive (WebSocket)
  lib/
    sources/parsers.ts       Her kaynağın yanıtını ortak tipe çeviren saf fonksiyonlar
    sources/fetchers.ts      Kaynak URL'leri, zaman aşımı, TTL
    sources/index.ts         Önbellek, ilk açılış ısıtması ve birleştirme (yalnız sunucu)
    sourceInfo.ts            Kaynak adları, bölgeleri ve birleştirme öncelikleri
    merge.ts                 Kaynaklar arası tekrar birleştirme
    filters.ts               API sorgu parametreleri (minmag, source, since, limit)
    format.ts                Tarih, büyüklük ve harita işaret renk/boyut yardımcıları
  instrumentation.ts         Sunucu açılışında önbelleği ısıtır
  middleware.ts              /api hız sınırı
```

Harita altlığı: © Esri (Esri, HERE, Garmin), © OpenStreetMap katkıcıları.

## Lisans

MIT
