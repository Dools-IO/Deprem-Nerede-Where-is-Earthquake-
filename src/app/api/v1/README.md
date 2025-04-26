# Deprem API Dokümantasyonu v1

Bu API, çeşitli deprem veri kaynaklarından alınan verileri standart bir formatta sunar.

## Genel Bilgiler

- Base URL: `/api/v1`
- Tüm endpoint'ler JSON formatında yanıt verir
- Veriler 5 dakikada bir güncellenir
- Her endpoint için önbellek kullanılır
- Tüm zamanlar ISO 8601 formatındadır

## Ortak Yanıt Formatı

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

## Endpoint'ler

### 1. EMSC (European-Mediterranean Seismological Centre)
- Endpoint: `/api/v1/emsc`
- Metod: GET
- Açıklama: Avrupa-Akdeniz bölgesi deprem verileri

### 2. KOERI (Kandilli Rasathanesi)
- Endpoint: `/api/v1/koeri`
- Metod: GET
- Açıklama: Türkiye ve çevresi deprem verileri

### 3. USGS (United States Geological Survey)
- Endpoint: `/api/v1/usgs`
- Metod: GET
- Açıklama: Global deprem verileri

### 4. IRIS (Incorporated Research Institutions for Seismology)
- Endpoint: `/api/v1/iris`
- Metod: GET
- Açıklama: Akademik odaklı deprem verileri

### 5. ESM (European Strong-Motion Database)
- Endpoint: `/api/v1/esm`
- Metod: GET
- Açıklama: Avrupa bölgesi kuvvetli yer hareketi verileri

### 6. JMA (Japan Meteorological Agency)
- Endpoint: `/api/v1/jma`
- Metod: GET
- Açıklama: Japonya bölgesi deprem verileri

### 7. FDSNWS (FDSN Web Service)
- Endpoint: `/api/v1/fdsnws`
- Metod: GET
- Açıklama: FDSN standardında deprem verileri

### 8. GA (Geoscience Australia)
- Endpoint: `/api/v1/ga`
- Metod: GET
- Açıklama: Avustralya bölgesi deprem verileri

### 9. GeoNet (New Zealand)
- Endpoint: `/api/v1/geonet`
- Metod: GET
- Açıklama: Yeni Zelanda bölgesi deprem verileri

### 10. SSN (Servicio Sismológico Nacional)
- Endpoint: `/api/v1/ssn`
- Metod: GET
- Açıklama: Meksika bölgesi deprem verileri

### 11. INGV (Istituto Nazionale di Geofisica e Vulcanologia)
- Endpoint: `/api/v1/ingv`
- Metod: GET
- Açıklama: İtalya bölgesi deprem verileri

## Hata Durumları

```json
{
  "success": false,
  "error": "Hata mesajı",
  "source": "KAYNAK_ADI",
  "lastUpdated": "ISO8601_DATETIME"
}
```

## Örnek Kullanım

```javascript
// KOERI verilerini çekme örneği
fetch('/api/v1/koeri')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Depremler:', data.data);
      console.log('Son güncelleme:', data.lastUpdated);
    } else {
      console.error('Hata:', data.error);
    }
  });
```

## Rate Limiting

- Her IP için dakikada 60 istek
- Aşım durumunda 429 Too Many Requests yanıtı

## Notlar

- Veriler her kaynak için 5 dakikada bir güncellenir
- Önbellekleme kullanıldığı için yanıt süreleri hızlıdır
- Her kaynak için son 500 deprem verisi sunulur
- Tüm zamanlar UTC'dir 