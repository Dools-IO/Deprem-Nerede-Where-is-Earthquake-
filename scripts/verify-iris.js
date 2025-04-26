// IRIS veri kaynağından deprem verilerini test eden script
const axios = require('axios');

// IRIS API URL
const IRIS_API_URL = 'https://service.iris.edu/fdsnws/event/1/query';

async function testIRIS() {
  console.log('IRIS API testi başlıyor...');
  
  try {
    // Son 30 günün verilerini alalım
    const endtime = new Date().toISOString();
    const starttime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log(`Sorgu zamanları: ${starttime} - ${endtime}`);
    
    // API'dan verileri çek
    const response = await axios.get(IRIS_API_URL, {
      params: {
        format: 'text',
        orderby: 'time',
        limit: 100, // Örnek olarak sadece 100 deprem
        starttime,
        endtime,
        minmagnitude: 0.1 // Çok düşük bir magnitude değeri
      },
    });

    // Yanıt metnini satır satır ayrıştır
    const lines = response.data.split('\n');
    
    // Başlık satırlarını atla (ilk satır yorum satırı "#" ile başlar)
    const dataLines = lines.filter(line => line && !line.startsWith('#'));
    console.log(`Toplam satır sayısı: ${lines.length}, Veri satırı sayısı: ${dataLines.length}`);
    
    // Veriyi işle
    const earthquakes = dataLines.map(line => {
      const parts = line.split('|');
      
      if (parts.length < 12) {
        console.log(`Atlanan satır, yetersiz veri: ${line}`);
        return null;
      }
      
      try {
        const [eventId, timeStr, latitudeStr, longitudeStr, depthStr, 
               author, catalog, contributor, contributorId, 
               magType, magnitudeStr, magAuthor, locationName] = parts;
        
        const time = new Date(timeStr);
        const latitude = parseFloat(latitudeStr);
        const longitude = parseFloat(longitudeStr);
        const depth = parseFloat(depthStr);
        const magnitude = parseFloat(magnitudeStr);
        
        // Geçersiz değerler için kontrol
        if (isNaN(latitude) || isNaN(longitude) || isNaN(depth) || isNaN(magnitude) || !time) {
          console.log(`Atlanan satır, geçersiz değerler: ${line}`);
          return null;
        }
        
        return {
          id: `IRIS-${eventId}`,
          time,
          latitude,
          longitude,
          depth,
          magnitude,
          location: locationName || 'Bilinmeyen konum',
          source: 'IRIS'
        };
      } catch (error) {
        console.error('Veri satırı işlenirken hata:', line, error);
        return null;
      }
    }).filter(Boolean);
    
    console.log(`İşlenmiş deprem verisi sayısı: ${earthquakes.length}`);
    
    if (earthquakes.length > 0) {
      console.log('İlk 5 deprem verisi:');
      earthquakes.slice(0, 5).forEach((eq, index) => {
        console.log(`${index + 1}: Yer: ${eq.location}, Büyüklük: ${eq.magnitude}, Derinlik: ${eq.depth}km, Zaman: ${eq.time.toISOString()}`);
      });
    } else {
      console.log('Veri alınamadı!');
    }
  } catch (error) {
    console.error('IRIS API test hatası:', error);
    
    if (error.response) {
      console.log('Hata yanıtı:', error.response.data);
    }
  }
}

testIRIS(); 