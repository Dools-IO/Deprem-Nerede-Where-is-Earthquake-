'use client';

import React, { useEffect, useState } from 'react';
import { Earthquake } from '@/types';
import { formatDateTime, formatDepth, formatMagnitude, getMagnitudeColor } from '@/utils/helpers';

// Leaflet'i ve bileşenlerini yalnızca istemci tarafında dinamik olarak içe aktar
// Bu, sunucu tarafı oluşturma sorunlarını önleyecektir

interface EarthquakeMapProps {
  earthquakes: Earthquake[];
}

export default function EarthquakeMap({ earthquakes }: EarthquakeMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [MapComponent, setMapComponent] = useState<any>(null);
  
  // SSR ve client-side render arasındaki uyumsuzluğu önlemek için
  useEffect(() => {
    // Leaflet'i ve bileşenlerini istemci tarafında yükle
    const loadLeaflet = async () => {
      try {
        // Leaflet ve bileşenlerini dinamik olarak içe aktar
        const L = await import('leaflet');
        const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet');
        
        // Leaflet CSS
        await import('leaflet/dist/leaflet.css');
        
        // Özel ikon oluşturma fonksiyonu
        const createIcon = (magnitude: number) => {
          const size = Math.max(20, magnitude * 5); // Büyüklüğe göre ikon boyutu
          
          return new L.Icon({
            iconUrl: '/img/earthquake.png',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            popupAnchor: [0, -size / 2],
          });
        };
        
        // Harita varsayılan merkezi
        const defaultCenter = [39.0, 35.0]; // Türkiye'nin yaklaşık merkezi
        const defaultZoom = 4;
        
        // Bileşeni isteğe bağlı olarak ayarla
        setMapComponent({
          MapContainer,
          TileLayer,
          Marker,
          Popup,
          createIcon,
          defaultCenter,
          defaultZoom
        });
        
        setIsMounted(true);
      } catch (error) {
        console.error('Leaflet yüklenirken hata oluştu:', error);
      }
    };
    
    loadLeaflet();
  }, []);

  // Eğer harita henüz yüklenmediyse, yükleniyor göstergesi göster
  if (!isMounted || !MapComponent) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Harita yükleniyor...</p>
      </div>
    );
  }
  
  // MapComponent'ten gerekli bileşenleri ve değerleri çıkar
  const { 
    MapContainer, 
    TileLayer, 
    Marker, 
    Popup, 
    createIcon, 
    defaultCenter, 
    defaultZoom 
  } = MapComponent;

  return (
    <div className="h-[600px] w-full border rounded-lg overflow-hidden shadow-md">
      <MapContainer 
        center={defaultCenter as [number, number]} 
        zoom={defaultZoom} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {earthquakes.map(earthquake => (
          earthquake.latitude && earthquake.longitude ? (
            <Marker 
              key={earthquake.id}
              position={[earthquake.latitude, earthquake.longitude]}
              icon={createIcon(earthquake.magnitude)}
            >
              <Popup>
                <div className="text-sm">
                  <h3 className="font-semibold mb-1">{earthquake.location}</h3>
                  <p className="mb-1">
                    <strong>Zaman:</strong> {formatDateTime(earthquake.time)}
                  </p>
                  <p className="mb-1">
                    <strong>Büyüklük:</strong>{' '}
                    <span className={`${getMagnitudeColor(earthquake.magnitude).replace('bg-', 'text-')} font-bold`}>
                      {formatMagnitude(earthquake.magnitude)}
                    </span>
                  </p>
                  <p className="mb-1">
                    <strong>Derinlik:</strong> {formatDepth(earthquake.depth)}
                  </p>
                  <p className="mb-1">
                    <strong>Koordinatlar:</strong> {earthquake.latitude.toFixed(4)}, {earthquake.longitude.toFixed(4)}
                  </p>
                  <p className="mb-1">
                    <strong>Kaynak:</strong> {earthquake.source}
                  </p>
                  {earthquake.url && (
                    <a
                      href={earthquake.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline block mt-2"
                    >
                      Detayları Gör
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>
    </div>
  );
} 