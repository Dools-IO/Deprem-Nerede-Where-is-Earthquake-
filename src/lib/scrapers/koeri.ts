import { Earthquake } from '@/types';
import { generateId } from '@/utils/helpers';

const KOERI_URL = 'http://www.koeri.boun.edu.tr/scripts/lst0.asp';

interface KoeriEarthquake {
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  depth: number;
  md: number | null;
  ml: number | null;
  mw: number | null;
  location: string;
  status: string;
  revize_timestamp?: string | null;
}

/**
 * Ham veriyi parse ederek KoeriEarthquake[] formatına dönüştürür
 * @param rawData Ham veri
 * @returns {KoeriEarthquake[]} Parse edilmiş deprem verileri
 */
function parseKOERIData(rawData: string): KoeriEarthquake[] {
  try {
    // PRE tag içeriğini al
    const preMatch = rawData.match(/<pre>([\s\S]*?)<\/pre>/i);
    if (!preMatch) {
      throw new Error('PRE tag bulunamadı');
    }

    const preContent = preMatch[1].trim();
    
    // Veri formatını kontrol et - tarih formatını ara
    if (!preContent.match(/\d{4}\.\d{2}\.\d{2}/)) {
      throw new Error('Geçersiz veri formatı - tarih bulunamadı');
    }

    // Satırlara ayır
    const lines = preContent.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('-'));

    // Header satırını atla ve veri satırlarını işle
    const earthquakes: KoeriEarthquake[] = [];
    
    // İlk 6 satırı atla (başlık bilgileri)
    for (let i = 6; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.length < 65) continue;

      try {
        // Tarih ve Saat (19 karakter)
        const date = line.substring(0, 10);
        const time = line.substring(11, 19);

        // 2 boşluk sonrası
        // Enlem(N) (7 karakter)
        const latitude = parseFloat(line.substring(21, 28));

        // 3 boşluk sonrası
        // Boylam(E) (7 karakter)
        const longitude = parseFloat(line.substring(31, 38));

        // 3 boşluk sonrası
        // Derinlik(km) (10 karakter)
        const depth = parseFloat(line.substring(41, 51).trim());

        // 4 boşluk sonrası
        // MD ML Mw kolonları (3 + 7 + 3 karakter)
        const magnitudeStr = line.substring(55, 68);
        const [md, ml, mw] = magnitudeStr.trim().split(/\s+/)
          .map(mag => mag === '-.-' ? null : parseFloat(mag));

        // 3 boşluk sonrası
        // Yer Kolonu (48 karakter)
        const location = line.substring(71, 119).trim();

        // Kalan kısım Status
        const status = line.substring(119).trim();

        earthquakes.push({
          date,
          time,
          latitude,
          longitude,
          depth,
          md,
          ml,
          mw,
          location,
          status
        });
      } catch (err) {
        console.error('KOERI: Satır parse hatası:', err, 'Satır:', line);
      }
    }

    return earthquakes;
  } catch (error) {
    console.error('KOERI veri parse hatası:', error);
    return [];
  }
}

/**
 * Kandilli Rasathanesi web sitesinden deprem verilerini çeker
 */
export async function fetchKOERIEarthquakes(): Promise<Earthquake[]> {
  try {
    console.log('KOERI: Deprem verileri çekiliyor...');
    
    const proxyUrl = `http://localhost:3000/api/proxy?url=${encodeURIComponent(KOERI_URL)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Ham veriyi parse et
    const koeriEarthquakes = parseKOERIData(html);

    // KoeriEarthquake formatından Earthquake formatına dönüştür
    const earthquakes: Earthquake[] = koeriEarthquakes.map(quake => {
      const [day, month, year] = quake.date.split('.');
      const [hour, minute, second] = quake.time.split(':');
      
      const time = new Date(
        parseInt('20' + year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );

      // En büyük magnitude değerini bul
      const magnitude = Math.max(
        ...[quake.md, quake.ml, quake.mw]
          .filter((m): m is number => m !== null)
          .concat(0)
      );

      const id = generateId(`kandilli-${time.toISOString()}-${quake.latitude}-${quake.longitude}-${magnitude}`);

      return {
        id,
        time: time.toISOString(),
        latitude: quake.latitude,
        longitude: quake.longitude,
        depth: quake.depth,
        magnitude,
        location: quake.location,
        source: 'Kandilli',
        url: KOERI_URL
      };
    });

    console.log(`KOERI: ${earthquakes.length} deprem verisi başarıyla çekildi`);
    return earthquakes;
  } catch (error) {
    console.error('KOERI veri çekme hatası:', error);
    return [];
  }
} 