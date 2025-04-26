import React from 'react';

export default function ApiDocsPage() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-4">Deprem API Dokümantasyonu</h1>
      <p className="mb-6 text-gray-700">
        Bu sistem, farklı deprem veri kaynaklarından alınan verileri standart bir JSON formatında REST API olarak sunar. Her bir kaynak için ayrı endpoint bulunur ve tüm veriler aynı veri yapısında döner. API'ler herkese açıktır ve kolayca entegre edilebilir.
      </p>
      <h2 className="text-2xl font-semibold mt-8 mb-2">Sistem Hakkında</h2>
      <ul className="list-disc ml-6 mb-6 text-gray-700">
        <li>Veriler EMSC, KOERI, USGS, IRIS, ESM, JMA, FDSNWS, GA, GeoNet, SSN, INGV gibi güvenilir kaynaklardan alınır.</li>
        <li>Her kaynak için ayrı endpoint vardır ve tüm yanıtlar aynı JSON formatındadır.</li>
        <li>Veriler 5 dakikada bir güncellenir ve önbelleğe alınır.</li>
        <li>Her IP için dakikada 60 istek sınırı vardır (rate limiting).</li>
        <li>Tüm zamanlar UTC ve ISO 8601 formatındadır.</li>
      </ul>
      <h2 className="text-2xl font-semibold mt-8 mb-2">Ortak Yanıt Formatı</h2>
      <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto mb-6">
{`
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
`}
      </pre>
      <h2 className="text-2xl font-semibold mt-8 mb-2">Mevcut Endpoint'ler</h2>
      <ul className="list-disc ml-6 mb-6 text-gray-700">
        <li><b>/api/v1/emsc</b> - EMSC (Avrupa-Akdeniz)</li>
        <li><b>/api/v1/koeri</b> - KOERI (Kandilli)</li>
        <li><b>/api/v1/usgs</b> - USGS (ABD)</li>
        <li><b>/api/v1/iris</b> - IRIS (Akademik)</li>
        <li><b>/api/v1/esm</b> - ESM (Avrupa Kuvvetli Yer Hareketi)</li>
        <li><b>/api/v1/jma</b> - JMA (Japonya)</li>
        <li><b>/api/v1/fdsnws</b> - FDSNWS (Standart Web Servis)</li>
        <li><b>/api/v1/ga</b> - GA (Avustralya)</li>
        <li><b>/api/v1/geonet</b> - GeoNet (Yeni Zelanda)</li>
        <li><b>/api/v1/ssn</b> - SSN (Meksika)</li>
        <li><b>/api/v1/ingv</b> - INGV (İtalya)</li>
        <li><b>/api/v1/all</b> - Tüm kaynakların birleşimi</li>
      </ul>
      <h2 className="text-2xl font-semibold mt-8 mb-2">Kullanım Örnekleri</h2>
      <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto mb-6">
{`// KOERI verilerini çekme
fetch('/api/v1/koeri')
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('Depremler:', data.data);
      console.log('Son güncelleme:', data.lastUpdated);
    }
  });

// Tüm kaynaklardan veri çekme
fetch('/api/v1/all')
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('Tüm depremler:', data.data);
    }
  });
`}
      </pre>
      <h2 className="text-2xl font-semibold mt-8 mb-2">Rate Limiting ve Diğer Notlar</h2>
      <ul className="list-disc ml-6 mb-6 text-gray-700">
        <li>Her IP adresi için dakikada 60 istek sınırı vardır. Aşıldığında 429 hatası döner.</li>
        <li>Veriler 5 dakikada bir güncellenir, hızlı yanıt için önbellek kullanılır.</li>
        <li>Her kaynak için son 500 deprem verisi sunulur.</li>
        <li>Yanıtlar her zaman JSON formatındadır.</li>
      </ul>
      <h2 className="text-2xl font-semibold mt-8 mb-2">Hata Durumları</h2>
      <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto mb-6">
{`
{
  "success": false,
  "error": "Hata mesajı",
  "source": "KAYNAK_ADI",
  "lastUpdated": "ISO8601_DATETIME"
}
`}
      </pre>
      <h2 className="text-2xl font-semibold mt-8 mb-2">Sıkça Sorulanlar</h2>
      <ul className="list-disc ml-6 mb-6 text-gray-700">
        <li><b>Veriler ne kadar güncel?</b> - Maksimum 5 dakika öncesine kadar günceldir.</li>
        <li><b>API'yi ticari olarak kullanabilir miyim?</b> - Açık kaynak ve serbestçe kullanılabilir, ancak kaynak belirtmeniz önerilir.</li>
        <li><b>Veri formatı değişir mi?</b> - Tüm endpoint'ler aynı veri formatını döner.</li>
      </ul>
    </div>
  );
} 