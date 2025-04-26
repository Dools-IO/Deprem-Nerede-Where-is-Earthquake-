'use client';

import { useState, useEffect } from 'react';
import { Earthquake } from '@/types';

export default function JMAPage() {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verileri getirme fonksiyonu
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetch(`/api/test-jma`).then(res => res.json());
      
      if (!data.success) {
        throw new Error(data.error || 'Veri alınamadı');
      }
      
      setEarthquakes(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
      console.error('JMA verileri alınırken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sayfa yüklendiğinde verileri getir
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">JMA (Japonya) Deprem Verileri</h1>
      
      {/* Yükleniyor durumu */}
      {loading && <div className="text-center py-8">Veriler yükleniyor...</div>}
      
      {/* Hata durumu */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {/* Deprem listesi */}
      {!loading && !error && (
        <div>
          <p className="mb-4">Toplam {earthquakes.length} deprem bulundu.</p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border">Tarih</th>
                  <th className="py-2 px-4 border">Büyüklük</th>
                  <th className="py-2 px-4 border">Konum</th>
                  <th className="py-2 px-4 border">Derinlik (km)</th>
                  <th className="py-2 px-4 border">Koordinatlar</th>
                  <th className="py-2 px-4 border">Kaynak</th>
                </tr>
              </thead>
              <tbody>
                {earthquakes.map((eq) => (
                  <tr key={eq.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border">{eq.time.toLocaleString()}</td>
                    <td className="py-2 px-4 border text-center font-bold">
                      {eq.magnitude.toFixed(1)}
                    </td>
                    <td className="py-2 px-4 border">{eq.location}</td>
                    <td className="py-2 px-4 border text-center">{eq.depth.toFixed(1)}</td>
                    <td className="py-2 px-4 border text-center">
                      {eq.latitude.toFixed(4)}, {eq.longitude.toFixed(4)}
                    </td>
                    <td className="py-2 px-4 border">
                      {eq.url ? (
                        <a 
                          href={eq.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {eq.source}
                        </a>
                      ) : (
                        eq.source
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 