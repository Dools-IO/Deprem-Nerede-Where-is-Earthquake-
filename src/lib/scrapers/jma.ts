import axios from 'axios';
import { Earthquake } from '@/types';
import { generateId } from '@/utils/helpers';

// JMA API URL
const JMA_API_URL = 'https://www.jma.go.jp/bosai/quake/data/list.json';
const JMA_CITY_DICTIONARY_URL = 'https://www.data.jma.go.jp/multi/data/dictionary/city.json';
const MAX_EARTHQUAKES = 500;

// Japonca seismik yoğunluk ölçeği (JMA scale)
// https://en.wikipedia.org/wiki/Japan_Meteorological_Agency_seismic_intensity_scale
enum SeismicIntensity {
  ZERO = "0",
  ONE = "1",
  TWO = "2",
  THREE = "3",
  FOUR = "4",
  FIVE_MINUS = "5-",
  FIVE_PLUS = "5+",
  SIX_MINUS = "6-",
  SIX_PLUS = "6+",
  SEVEN = "7"
}

// JMA'dan gelen veri formatı
interface JmaQuakeData {
  id?: string;        // Deprem ID'si (opsiyonel)
  eid?: string;       // Event ID (ana tanımlayıcı)
  ctt?: string;       // Content timestamp (alternatif tanımlayıcı)
  anm: string;        // Deprem analiz numarası
  at: string;         // Deprem zamanı (ISO string)
  mag: number;        // Magnitüd
  maxi: string;       // Maksimum yoğunluk (Seismik yoğunluk ölçeği)
  tkhr?: string;      // Tsuanami tehlikesi? ("01" = evet, "00" = hayır)
  lat: number;        // Enlem
  lon: number;        // Boylam
  depth: number;      // Derinlik (km)
  type?: string;      // Deprem türü
  ttl: string;        // Başlık
  // Ek alanlar
  rdt?: string;       // Report datetime
  acd?: string;       // Area code
  cod?: string;       // Coordinates
  int?: any[];        // Intensity array
  json?: string;      // JSON dosya adı
  en_ttl?: string;    // İngilizce başlık
  en_anm?: string;    // İngilizce bölge adı
}

/**
 * JMA (Japonya Meteoroloji Ajansı) deprem verilerini çeker
 */
export async function fetchJMAEarthquakes(): Promise<Earthquake[]> {
  try {
    const response = await fetch('https://www.jma.go.jp/bosai/quake/data/list.json');
    const data = await response.json();

    const earthquakes: Earthquake[] = data.map((quake: JmaQuakeData) => {
      // Zaman değerini doğru formatta ayrıştır
      const time = new Date(quake.at);
      
      // Geçersiz zaman değerlerini kontrol et
      if (isNaN(time.getTime())) {
        console.warn('JMA: Geçersiz zaman değeri:', quake.at);
        return null;
      }

      return {
        id: generateId(`jma-${quake.eid || quake.id || quake.ctt || time.toISOString()}`),
        time: time,
        latitude: quake.lat,
        longitude: quake.lon,
        depth: quake.depth || 10, // Derinlik bilgisi yoksa varsayılan 10km
        magnitude: parseFloat(quake.mag?.toString() || '0'),
        location: quake.en_anm || quake.anm || quake.ttl || 'Japan',
        source: 'JMA',
        url: `https://www.jma.go.jp/bosai/map.html#5/${quake.lat}/${quake.lon}/&elem=int&contents=earthquake`
      };
    })
    .filter((quake: Earthquake | null): quake is Earthquake => quake !== null)
    .slice(0, MAX_EARTHQUAKES); // Maksimum deprem sayısını sınırla

    return earthquakes;
  } catch (error) {
    console.error('JMA deprem verileri çekilirken hata:', error);
    return [];
  }
}

/**
 * Magnitüd değerini JMA seismik yoğunluk ölçeğine dönüştürür
 * @param intensity JMA seismik yoğunluk ölçeği değeri
 * @return Tahmini magnitüd değeri
 */
function intensityToMagnitude(intensity: string): number {
  // JMA yoğunluk ölçeği yaklaşık magnitüd dönüşümü
  // Bu değerler kesin değil, yaklaşık değerlerdir.
  switch (intensity) {
    case SeismicIntensity.ZERO:
      return 2.0;
    case SeismicIntensity.ONE:
      return 2.5;
    case SeismicIntensity.TWO:
      return 3.0;
    case SeismicIntensity.THREE:
      return 3.5;
    case SeismicIntensity.FOUR:
      return 4.0;
    case SeismicIntensity.FIVE_MINUS:
      return 4.5;
    case SeismicIntensity.FIVE_PLUS:
      return 5.0;
    case SeismicIntensity.SIX_MINUS:
      return 5.5;
    case SeismicIntensity.SIX_PLUS:
      return 6.0;
    case SeismicIntensity.SEVEN:
      return 6.5;
    default:
      return 3.0; // Varsayılan değer
  }
} 