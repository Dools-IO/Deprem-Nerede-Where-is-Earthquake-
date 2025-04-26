'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Earthquake } from '@/types';
import 'leaflet/dist/leaflet.css';

const MapComponent = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
    </div>
  ),
});

interface WorldEarthquakeMapProps {
  earthquakes: Earthquake[];
  onInvalidCoordinatesCount?: (count: number) => void;
}

export default function WorldEarthquakeMap({ earthquakes, onInvalidCoordinatesCount }: WorldEarthquakeMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Geçersiz koordinat sayısını hesapla ve callback ile gönder
    const invalidCount = earthquakes.filter(eq => 
      !eq.latitude || !eq.longitude || isNaN(eq.latitude) || isNaN(eq.longitude)
    ).length;
    
    // Mükerrer koordinatları tespit et
    const coordMap = new Map<string, Earthquake>();
    const duplicateCoords = new Map<string, Earthquake[]>();
    
    earthquakes.forEach(eq => {
      if (eq.latitude && eq.longitude && !isNaN(eq.latitude) && !isNaN(eq.longitude)) {
        const coordKey = `${eq.latitude},${eq.longitude}`;
        if (coordMap.has(coordKey)) {
          // Mükerrer koordinat bulundu
          if (!duplicateCoords.has(coordKey)) {
            duplicateCoords.set(coordKey, [coordMap.get(coordKey)!, eq]);
          } else {
            duplicateCoords.get(coordKey)?.push(eq);
          }
        } else {
          coordMap.set(coordKey, eq);
        }
      }
    });

    const duplicateCount = Array.from(duplicateCoords.values()).reduce((acc, arr) => acc + arr.length - 1, 0);
    console.log(`Toplam mükerrer koordinat sayısı: ${duplicateCount}`);
    console.log('Mükerrer koordinatlar ve deprem detayları:', duplicateCoords);
    
    onInvalidCoordinatesCount?.(invalidCount);
  }, [earthquakes, onInvalidCoordinatesCount]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <MapComponent earthquakes={earthquakes} />;
} 