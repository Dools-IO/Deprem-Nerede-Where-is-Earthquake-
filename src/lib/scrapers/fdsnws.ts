import { Earthquake } from '@/types';

/**
 * FDSN Web Services'ten son 500 deprem verisini çeker
 */
export async function fetchFDSNEarthquakes(): Promise<Earthquake[]> {
  try {
    console.log('FDSN Web Services veri çekme başlıyor...');
    
    // Tarih parametreleri için şu anki tarihi ve geçen yılın tarihini hesapla
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1); // Geçen yılın aynı günü
    
    // Tarihleri ISO formatına dönüştür (YYYY-MM-DDTHH:MM:SS)
    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();
    
    // FDSN Web Services endpoint - tarih parametreleri eklendi
    const url = `https://service.iris.edu/fdsnws/event/1/query?format=text&orderby=time&limit=500&starttime=${startTime}&endtime=${endTime}`;
    
    console.log(`FDSNWS API URL: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`FDSN Web Services yanıt kodu: ${response.status}`);
    }
    
    const text = await response.text();
    const lines = text.trim().split('\n');
    
    // Başlık satırını atlayarak verileri işleme (# ile başlayan satırlar)
    const dataLines = lines.filter(line => !line.startsWith('#'));
    
    console.log(`FDSNWS API'den ${dataLines.length} satır deprem verisi alındı.`);
    
    const earthquakes = dataLines.map(line => {
      const parts = line.trim().split('|');
      
      // FDSN formatındaki verileri projemizin formatına dönüştürme
      return {
        id: parts[0], // Event ID
        time: new Date(parts[1]),
        latitude: parseFloat(parts[2]),
        longitude: parseFloat(parts[3]),
        depth: parseFloat(parts[4]) / 1000, // km cinsinden derinlik (FDSN metre olarak verir)
        magnitude: parseFloat(parts[10]),
        location: parts[12] || "Bilinmiyor",
        source: "FDSNWS",
        url: `https://service.iris.edu/fdsnws/event/1/query?eventid=${parts[0]}&format=xml`
      };
    });
    
    console.log(`✅ FDSNWS'ten ${earthquakes.length} deprem verisi başarıyla işlendi.`);
    return earthquakes;
  } catch (error) {
    console.error('FDSNWS veri çekme hatası:', error);
    return [];
  }
} 