# Deprem Nerede (Where's the Earthquake)

A real-time earthquake monitoring application that aggregates data from multiple international seismic data sources with interactive visualization capabilities.

![Deprem Nerede Screenshot](./public/screenshot.png)

## 🌍 Features

- **Comprehensive Multi-Source Data**: Aggregates earthquake data from 9 different international sources:
  - **EMSC**: European-Mediterranean Seismological Centre
  - **KOERI**: Kandilli Observatory and Earthquake Research Institute (Turkey)
  - **USGS**: United States Geological Survey
  - **IRIS**: Incorporated Research Institutions for Seismology
  - **ESM**: European Strong-Motion Database
  - **JMA**: Japan Meteorological Agency
  - **GeoNet**: New Zealand Geological Hazard Information
  - **Geoscience Australia**: Australian Earthquake Data
  - **SSN**: Servicio Sismológico Nacional (Mexico)
  - **INGV**: Istituto Nazionale di Geofisica e Vulcanologia (Italy)

- **Real-Time Updates**: WebSocket integration for instant earthquake notifications
- **Interactive Map Visualization**: Visualize earthquakes on an interactive map with magnitude-based markers
- **Detailed Information**: View magnitude, location, depth, coordinates, and other critical data
- **Chronological Organization**: All earthquake events sorted by time for easy tracking
- **Mobile Responsive**: Fully responsive design optimized for all device sizes

## 🚀 Technology Stack

- **Framework**: Next.js 14 (React)
- **Styling**: TailwindCSS
- **Maps**: Leaflet / React-Leaflet
- **Data Fetching**: Axios
- **HTML Parsing**: Cheerio
- **XML Parsing**: fast-xml-parser
- **Date Handling**: date-fns
- **Scheduled Tasks**: node-cron
- **ID Generation**: uuid

## 🔧 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/deprem-nerede.git
   cd deprem-nerede
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📊 Data Sources

The application fetches earthquake data from the following sources:

- **EMSC**: [European-Mediterranean Seismological Centre](https://www.emsc-csem.org)
  - **API URL**: https://www.seismicportal.eu/fdsnws/event/1/query
  - **Format**: JSON/XML
  - **Features**: WebSocket real-time data available

- **KOERI**: [Kandilli Observatory and Earthquake Research Institute](http://www.koeri.boun.edu.tr)
  - **URL**: http://www.koeri.boun.edu.tr/scripts/lst0.asp
  - **Format**: HTML (scraped)
  - **Features**: Focused on Turkey and surrounding regions

- **USGS**: [United States Geological Survey](https://earthquake.usgs.gov)
  - **API URL**: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson
  - **Format**: GeoJSON
  - **Features**: Comprehensive global coverage with detailed metadata

- **IRIS**: [Incorporated Research Institutions for Seismology](https://www.iris.edu)
  - **API URL**: http://service.iris.edu/fdsnws/event/1/query
  - **Format**: XML/QuakeML
  - **Features**: Academic-focused with research-grade data

- **ESM**: [European Strong-Motion Database](https://esm-db.eu)
  - **API URL**: https://esm-db.eu/fdsnws/event/1/query
  - **Format**: JSON/XML
  - **Features**: Specialized in strong-motion recordings in Europe

- **JMA**: [Japan Meteorological Agency](https://www.jma.go.jp)
  - **API URL**: https://www.jma.go.jp/bosai/quake/data/list.json
  - **Format**: JSON
  - **Features**: Specialized in Japanese earthquakes and tsunami warnings

- **GeoNet**: [New Zealand Geological Hazard Information](https://www.geonet.org.nz)
  - **API URL**: https://api.geonet.org.nz
  - **Format**: JSON
  - **Features**: Focused on New Zealand and Pacific region

- **Geoscience Australia**: [Australian Earthquake Data](https://earthquakes.ga.gov.au)
  - **API URL**: https://earthquakes.ga.gov.au/geoserver/earthquakes/wfs
  - **Format**: WFS/GeoJSON
  - **Features**: Australian and regional earthquake monitoring

- **SSN México**: [Servicio Sismológico Nacional](http://www.ssn.unam.mx)
  - **API URL**: http://www.ssn.unam.mx/rss/ultimos-sismos.xml
  - **Format**: RSS/XML
  - **Features**: Mexican seismic activity monitoring

- **INGV**: [Istituto Nazionale di Geofisica e Vulcanologia](https://terremoti.ingv.it)
  - **URL**: https://terremoti.ingv.it
  - **Format**: Web/JSON
  - **Features**: Italian and Mediterranean seismic monitoring

## 🌐 API Endpoint'leri

Tüm API endpoint'leri `/api/v1/` altında toplanmıştır ve her biri aynı JSON formatında veri döner.

### Temel Endpoint'ler

| Endpoint             | Açıklama                                 |
|----------------------|------------------------------------------|
| `/api/v1/emsc`       | EMSC verileri                            |
| `/api/v1/koeri`      | KOERI verileri                           |
| `/api/v1/usgs`       | USGS verileri                            |
| `/api/v1/iris`       | IRIS verileri                            |
| `/api/v1/esm`        | ESM verileri                             |
| `/api/v1/jma`        | JMA verileri                             |
| `/api/v1/fdsnws`     | FDSNWS verileri                          |
| `/api/v1/ga`         | GA verileri                              |
| `/api/v1/geonet`     | GeoNet verileri                          |
| `/api/v1/ssn`        | SSN verileri                             |
| `/api/v1/ingv`       | INGV verileri                            |
| `/api/v1/all`        | Tüm kaynakların birleşik verisi          |

---

## 📦 API v1 Nasıl Kullanılır? (How to Use)

Her endpoint için örnek fetch kullanımı ve açıklama:

### 1. Tüm Depremleri Çekmek (`/api/v1/all`)
```js
fetch('/api/v1/all')
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('Tüm depremler:', data.data);
    }
  });
```

### 2. Belirli Bir Kaynaktan Deprem Verisi Çekmek
Örneğin KOERI (Kandilli) için:
```js
fetch('/api/v1/koeri')
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('KOERI depremleri:', data.data);
    }
  });
```
Aynı şekilde diğer kaynaklar için de `/api/v1/{kaynak}` endpoint'ini kullanabilirsiniz.

### 3. JSON Yanıt Formatı
Her endpoint aşağıdaki gibi bir JSON döner:
```json
{
  "success": true,
  "source": "KAYNAK_ADI",
  "data": [
    {
      "id": "string",
      "time": "ISO8601_DATETIME",
      "latitude": number,
      "longitude": number,
      "depth": number,
      "magnitude": number,
      "location": "string",
      "source": "string",
      "url": "string"
    }
  ],
  "lastUpdated": "ISO8601_DATETIME"
}
```

### 4. Rate Limiting
Her IP adresi için dakikada 60 istek sınırı vardır. Limit aşıldığında 429 HTTP hatası döner.

### 5. Hata Durumu
```json
{
  "success": false,
  "error": "Hata mesajı",
  "source": "KAYNAK_ADI",
  "lastUpdated": "ISO8601_DATETIME"
}
```

---

## 🛠️ Project Structure

```
deprem-nerede/
├── public/                    # Statik dosyalar (görseller, favicon, vs.)
├── src/
│   ├── app/                   # Next.js app router ve sayfalar
│   │   ├── api/               # API endpoint'leri
│   │   │   ├── v1/            # Tüm yeni REST API endpoint'leri (her kaynak için ayrı klasör)
│   │   │   ├── proxy/         # Proxy endpoint'i
│   │   │   ├── iris/          # Eski IRIS endpoint'i
│   │   │   ├── earthquakes/   # Eski toplu deprem endpoint'i
│   │   │   ├── test-jma/      # JMA test endpoint'i
│   │   │   ├── test-esm/      # ESM test endpoint'i
│   │   ├── api-docs/          # API dokümantasyon sayfası
│   │   ├── source/            # Kaynak bazlı sayfalar
│   │   ├── esm/               # ESM özel sayfası
│   │   ├── jma/               # JMA özel sayfası
│   │   ├── api-test/          # Test sayfaları
│   │   ├── layout.tsx         # Genel layout ve menü
│   │   ├── page.tsx           # Ana uygulama sayfası
│   │   └── globals.css        # Global stiller
│   ├── components/            # React bileşenleri (ör. EarthquakeList, EarthquakeMap)
│   ├── lib/                   # Kütüphane ve yardımcı modüller
│   │   └── scrapers/          # Her veri kaynağı için veri çekme modülleri
│   ├── types/                 # TypeScript tip tanımlamaları
│   ├── utils/                 # Yardımcı fonksiyonlar
│   ├── scripts/               # Otomasyon ve veri güncelleme scriptleri
│   └── services/              # (Boş veya iş mantığı servisleri için ayrılmış)
├── package.json               # Proje bağımlılıkları ve scriptler
├── tsconfig.json              # TypeScript yapılandırması
├── tailwind.config.js         # TailwindCSS yapılandırması
├── README.md                  # Proje dokümantasyonu
└── ...                        # Diğer yapılandırma ve yardımcı dosyalar
```

## 🔄 Data Flow

1. The application fetches earthquake data from all sources in parallel
2. Data is normalized into a common format defined in `src/types/index.ts`
3. Duplicates are removed based on ID (generated from metadata)
4. Results are sorted chronologically (newest first)
5. Data is cached on the server to minimize external API calls
6. Real-time updates are received via WebSocket when available

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- All the seismological institutes providing open data:
  - [EMSC](https://www.emsc-csem.org)
  - [Kandilli Observatory](http://www.koeri.boun.edu.tr)
  - [USGS](https://www.usgs.gov/programs/earthquake-hazards)
  - [IRIS](https://www.iris.edu)
  - [ESM](https://esm-db.eu)
  - [JMA](https://www.jma.go.jp)
  - [GeoNet NZ](https://www.geonet.org.nz)
  - [Geoscience Australia](https://earthquakes.ga.gov.au)
  - [SSN México](http://www.ssn.unam.mx)
  - [INGV](https://terremoti.ingv.it)
- [FDSN Web Services](https://www.fdsn.org/webservices/) for standardized seismic data access
- The open source community for the amazing tools and libraries

---

Made with ❤️ for earthquake awareness and monitoring 