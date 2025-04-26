'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Earthquake } from '@/types';
import { 
  fetchEMSCEarthquakes, 
  fetchIRISEarthquakes, 
  fetchKOERIEarthquakes, 
  fetchUSGSEarthquakes, 
  fetchESMEarthquakes,
  fetchJMAEarthquakes,
  fetchFDSNEarthquakes,
  fetchGAEarthquakes,
  fetchGeoNetEarthquakes,
  fetchSSNEarthquakes,
  fetchINGVEarthquakes
} from '@/lib/scrapers';

const sourceFunctions: { [key: string]: () => Promise<Earthquake[]> } = {
  'emsc': fetchEMSCEarthquakes,
  'iris': fetchIRISEarthquakes,
  'koeri': async () => {
    const response = await fetch('/api/koeri');
    if (!response.ok) {
      throw new Error('Koeri verilerini alma hatası');
    }
    return response.json();
  },
  'usgs': fetchUSGSEarthquakes,
  'esm': fetchESMEarthquakes,
  'jma': fetchJMAEarthquakes,
  'fdsnws': fetchFDSNEarthquakes,
  'ga': fetchGAEarthquakes,
  'geonet': fetchGeoNetEarthquakes,
  'ssn': fetchSSNEarthquakes,
  'ingv': fetchINGVEarthquakes
};

const sourceNames: { [key: string]: string } = {
  'emsc': 'European-Mediterranean Seismological Centre',
  'iris': 'Incorporated Research Institutions for Seismology',
  'koeri': 'Kandilli Rasathanesi ve Deprem Araştırma Enstitüsü',
  'usgs': 'United States Geological Survey',
  'esm': 'Engineering Strong-Motion Database',
  'jma': 'Japan Meteorological Agency',
  'fdsnws': 'International Federation of Digital Seismograph Networks',
  'ga': 'Geoscience Australia',
  'geonet': 'GeoNet New Zealand',
  'ssn': 'Servicio Sismológico Nacional (Mexico)',
  'ingv': 'Istituto Nazionale di Geofisica e Vulcanologia'
};

export default function SourcePage() {
  const params = useParams();
  const sourceId = params.id as string;
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        const fetchFunction = sourceFunctions[sourceId.toLowerCase()];
        if (!fetchFunction) {
          throw new Error('Geçersiz kaynak ID\'si');
        }

        const data = await fetchFunction();
        setEarthquakes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Veri çekme hatası oluştu');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [sourceId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Hata! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">{sourceNames[sourceId.toLowerCase()] || sourceId}</h1>
        <p className="text-gray-400 mb-8">Son {earthquakes.length} deprem kaydı</p>

        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Zaman</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Konum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Büyüklük</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Derinlik</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Detaylar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {earthquakes.map((quake) => (
                  <tr key={quake.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(quake.time).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{quake.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded ${
                        quake.magnitude >= 5 ? 'bg-red-500' :
                        quake.magnitude >= 4 ? 'bg-orange-500' :
                        'bg-yellow-500'
                      }`}>
                        {quake.magnitude.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{quake.depth.toFixed(1)} km</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        href={quake.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Detaylar →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 