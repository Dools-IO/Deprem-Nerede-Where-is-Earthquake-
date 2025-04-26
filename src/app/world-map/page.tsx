'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Loading from '@/components/Loading';
import { Earthquake } from '@/types';

// Leaflet'i client-side'da yüklemek için dynamic import kullanıyoruz
const WorldEarthquakeMap = dynamic(() => import('@/components/WorldEarthquakeMap'), {
  ssr: false,
  loading: () => <Loading />
});

// Mükerrer deprem kayıtlarını analiz eden fonksiyon
const analyzeDuplicateEarthquakes = (earthquakes: Earthquake[]) => {
  const coordGroups: Record<string, Earthquake[]> = {};
  
  // Koordinat bazlı grupla
  earthquakes.forEach((eq) => {
    if (eq.latitude && eq.longitude && !isNaN(eq.latitude) && !isNaN(eq.longitude)) {
      const coordKey = `${eq.latitude},${eq.longitude}`;
      if (!coordGroups[coordKey]) {
        coordGroups[coordKey] = [];
      }
      coordGroups[coordKey].push(eq);
    }
  });

  // Kaynak sayısına göre grupla
  const sourceCountGroups: Record<number, number> = {};
  
  Object.values(coordGroups).forEach(group => {
    const uniqueSources = new Set(group.map(eq => eq.source));
    if (uniqueSources.size > 1) {
      if (!sourceCountGroups[uniqueSources.size]) {
        sourceCountGroups[uniqueSources.size] = 0;
      }
      sourceCountGroups[uniqueSources.size]++;
    }
  });

  return sourceCountGroups;
};

export default function WorldMapPage() {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invalidCoordinatesCount, setInvalidCoordinatesCount] = useState(0);
  const [duplicateStats, setDuplicateStats] = useState<Record<number, number>>({});

  useEffect(() => {
    const fetchAllEarthquakes = async () => {
      try {
        const response = await fetch('/api/v1/all');
        if (!response.ok) {
          throw new Error('API yanıtı başarısız');
        }
        
        const result = await response.json();
        
        if (result.success) {
          setEarthquakes(result.data);
          // Mükerrer analizi yap
          const stats = analyzeDuplicateEarthquakes(result.data);
          setDuplicateStats(stats);
        } else {
          setError(result.error || 'Veriler alınırken bir hata oluştu');
        }
      } catch (err) {
        console.error('Veri çekme hatası:', err);
        setError('Veriler alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllEarthquakes();
  }, []);

  if (loading) return <Loading />;
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-center">
          <h2 className="text-xl font-bold mb-2">Hata</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Dünya Geneli Deprem Haritası
        </h1>
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="h-[800px] w-full">
            <WorldEarthquakeMap 
              earthquakes={earthquakes} 
              onInvalidCoordinatesCount={setInvalidCoordinatesCount}
            />
          </div>
        </div>
        <div className="mt-4 bg-white rounded-lg shadow-lg p-4">
          <h2 className="text-xl font-bold mb-2">Harita Bilgileri</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Toplam Deprem Sayısı: {earthquakes.length}</li>
            <li>Son Güncelleme: {new Date().toLocaleString('tr-TR')}</li>
            {invalidCoordinatesCount > 0 && (
              <li className="text-yellow-700">
                {invalidCoordinatesCount} adet kayıt enlem ve boylam bilgisi olmadığı için gösterilemiyor
              </li>
            )}
            {Object.entries(duplicateStats).map(([sourceCount, earthquakeCount]) => (
              <li key={sourceCount} className="text-blue-700">
                {earthquakeCount} deprem, {sourceCount} farklı kaynaktan gelmektedir.
              </li>
            ))}
            <li>Siyah borderli depremler çoklu kaynaklı depremlerdir.</li>
          </ul>
          <div className="mt-4">
            <h3 className="font-bold mb-2">Büyüklük Göstergeleri:</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                <span>0.0 - 0.9</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-yellow-300 mr-2"></div>
                <span>1.0 - 1.9</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                <span>2.0 - 2.9</span>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-yellow-500 mr-2"></div>
                <span>3.0 - 3.9</span>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-orange-700 mr-2"></div>
                <span>4.0 - 4.9</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-orange-500 mr-2"></div>
                <span>5.0 - 5.9</span>
              </div>
              <div className="flex items-center">
                <div className="w-7 h-7 rounded-full bg-red-500 mr-2"></div>
                <span>6.0 - 7.0</span>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-black mr-2"></div>
                <span>7.1+</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 