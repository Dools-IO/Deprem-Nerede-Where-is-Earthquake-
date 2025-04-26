import { Earthquake } from '@/types';

const KOERI_API = '/api/v1/koeri'; // Kendi API'miz
const USGS_API = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson';

// Geçerli deprem verisi kontrolü
function isValidEarthquake(eq: Earthquake): boolean {
  return (
    eq.latitude >= -90 && eq.latitude <= 90 &&
    eq.longitude >= -180 && eq.longitude <= 180 &&
    eq.magnitude >= 0 && eq.magnitude <= 10 &&
    eq.depth >= 0 && eq.depth <= 700 && // Dünya'nın en derin depremi ~700km
    !isNaN(eq.latitude) &&
    !isNaN(eq.longitude) &&
    !isNaN(eq.magnitude) &&
    !isNaN(eq.depth)
  );
}

async function fetchKoeriData(): Promise<Earthquake[]> {
  try {
    const response = await fetch(KOERI_API);
    const data = await response.json();
    
    if (!data.success || !Array.isArray(data.data)) {
      console.error('KOERI API yanıtı geçersiz format:', data);
      return [];
    }

    // Veriler zaten doğru formatta geliyor, sadece geçerlilik kontrolü yapalım
    return data.data.filter(isValidEarthquake);
  } catch (error) {
    console.error('KOERI verisi çekilirken hata oluştu:', error);
    return [];
  }
}

async function fetchUSGSData(): Promise<Earthquake[]> {
  try {
    const response = await fetch(USGS_API);
    const data = await response.json();
    
    if (!data.features) {
      console.error('USGS API yanıtında features alanı bulunamadı');
      return [];
    }

    // Geçerli depremleri filtrele
    return data.features
      .map((feature: any) => {
        const earthquake: Earthquake = {
          id: `usgs-${feature.id}`,
          time: new Date(feature.properties.time).toISOString(),
          latitude: feature.geometry?.coordinates?.[1] || 0,
          longitude: feature.geometry?.coordinates?.[0] || 0,
          depth: feature.geometry?.coordinates?.[2] || 0,
          magnitude: feature.properties.mag || 0,
          location: feature.properties.place,
          source: 'USGS' as const,
          url: feature.properties.url
        };
        return earthquake;
      })
      .filter(isValidEarthquake);
  } catch (error) {
    console.error('USGS verisi çekilirken hata oluştu:', error);
    return [];
  }
}

// Tekrar eden kayıtları temizle
function removeDuplicates(earthquakes: Earthquake[]): Earthquake[] {
  const seen = new Map<string, Earthquake>();
  
  earthquakes.forEach(eq => {
    // Sadece tam olarak aynı koordinat ve zamana sahip depremleri tekrar olarak kabul et
    const key = `${eq.time}-${eq.latitude}-${eq.longitude}-${eq.magnitude}`;
    
    // Eğer aynı deprem farklı kaynaklardan geldiyse, Kandilli'yi tercih et
    if (!seen.has(key) || (eq.source === 'Kandilli' && seen.get(key)?.source !== 'Kandilli')) {
      seen.set(key, eq);
    }
  });
  
  return Array.from(seen.values());
}

export async function fetchEarthquakes(): Promise<Earthquake[]> {
  try {
    // KOERI'den deprem verileri
    const koeriData = await fetchKoeriData();
    console.log('Ham KOERI deprem sayısı:', koeriData.length);
    
    // USGS'den son 7 günlük depremler
    const usgsData = await fetchUSGSData();
    console.log('Ham USGS deprem sayısı:', usgsData.length);

    // Tüm depremleri birleştir ve tekrar eden kayıtları temizle
    const allEarthquakes = removeDuplicates([...koeriData, ...usgsData]);
    console.log('Toplam deprem sayısı:', allEarthquakes.length);
    
    // Depremleri zamana göre sırala (en yeni en üstte)
    return allEarthquakes.sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    );
  } catch (error) {
    console.error('Deprem verileri birleştirilirken hata oluştu:', error);
    return [];
  }
} 