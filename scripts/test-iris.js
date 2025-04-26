const axios = require('axios');

// IRIS API URL
const IRIS_API_URL = 'https://service.iris.edu/fdsnws/event/1/query';

async function testIRISAPI() {
  try {
    console.log('IRIS API test ediliyor...');
    
    // Son 30 gündeki depremleri getir
    const endtime = new Date().toISOString();
    const starttime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const response = await axios.get(IRIS_API_URL, {
      params: {
        format: 'text',
        orderby: 'time', // Geçerli değer: "time", "time-asc", "magnitude" veya "magnitude-asc"
        limit: 10,
        starttime: starttime,
        endtime: endtime,
        minmagnitude: 1.0 // Minimum 1.0 büyüklüğündeki depremleri getir
      },
    });

    console.log('API yanıtı:');
    console.log(response.data);
    
    // Yanıt metnini satır satır ayrıştır
    const lines = response.data.split('\n');
    console.log(`Toplam ${lines.length} satır alındı.`);
    
    // Başlık satırlarını atla (ilk satır yorum satırı "#" ile başlar)
    const dataLines = lines.filter(line => line && !line.startsWith('#'));
    console.log(`Veri satırı sayısı: ${dataLines.length}`);
    
    if (dataLines.length > 0) {
      console.log('İlk veri satırı:', dataLines[0]);
    }
  } catch (error) {
    console.error('IRIS API test edilirken hata oluştu:', error);
    
    if (error.response) {
      console.log('Hata yanıtı:', error.response.data);
    }
  }
}

testIRISAPI(); 