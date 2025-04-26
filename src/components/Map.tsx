'use client';

import { useEffect, useState } from 'react';
import L from 'leaflet';
import { Earthquake } from '@/types';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  earthquakes: Earthquake[];
}

const getMarkerProperties = (magnitude: number, isMultiSource: boolean = false) => {
  let props = {
    color: '#3b82f6',  // Border rengi
    radius: 10,
    fillOpacity: 0.2,
    weight: 1,         // Çizgi kalınlığı
    fillColor: '#3b82f6'  // İç renk
  };

  // Büyüklüğe göre renk belirle
  let fillColor = '#3b82f6'; // Varsayılan mavi

  if (magnitude >= 7.1) {
    fillColor = '#000000'; // Siyah
    props = { ...props, radius: 18, fillOpacity: 0.9 };
  } else if (magnitude >= 6.0) {
    fillColor = '#ef4444'; // Kırmızı
    props = { ...props, radius: 16, fillOpacity: 0.8 };
  } else if (magnitude >= 5.0) {
    fillColor = '#f97316'; // Turuncu
    props = { ...props, radius: 14, fillOpacity: 0.7 };
  } else if (magnitude >= 4.0) {
    fillColor = '#ea580c'; // Koyu Turuncu
    props = { ...props, radius: 12, fillOpacity: 0.6 };
  } else if (magnitude >= 3.0) {
    fillColor = '#eab308'; // Sarı
    props = { ...props, radius: 10, fillOpacity: 0.5 };
  } else if (magnitude >= 2.0) {
    fillColor = '#84cc16'; // Yeşil
    props = { ...props, radius: 8, fillOpacity: 0.4 };
  } else if (magnitude >= 1.0) {
    fillColor = '#facc15'; // Açık Sarı
    props = { ...props, radius: 6, fillOpacity: 0.3 };
  }

  // Önce iç ve dış rengi aynı yap
  props.color = fillColor;
  props.fillColor = fillColor;

  // Eğer çoklu kaynak varsa SADECE border'ı siyah yap
  if (isMultiSource) {
    props.color = '#000000'; // SADECE border siyah
  }

  return props;
};

export default function EarthquakeMap({ earthquakes }: MapProps) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Harita zaten varsa temizle
    if (mapInstance) {
      mapInstance.remove();
    }

    // Yeni harita oluştur
    const newMap = L.map('map', {
      center: [39, 35], // Türkiye'nin merkezi
      zoom: 6,
      minZoom: 2,
      maxBounds: [[-90, -180], [90, 180]]
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(newMap);

    setMapInstance(newMap);

    return () => {
      if (newMap) {
        newMap.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance) return;

    // Mevcut işaretçileri temizle
    mapInstance.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        layer.remove();
      }
    });

    // Koordinat bazlı deprem gruplarını oluştur
    const coordGroups: Record<string, Earthquake[]> = {};
    
    earthquakes.forEach((eq) => {
      if (eq.latitude && eq.longitude && !isNaN(eq.latitude) && !isNaN(eq.longitude)) {
        const coordKey = `${eq.latitude},${eq.longitude}`;
        if (!coordGroups[coordKey]) {
          coordGroups[coordKey] = [];
        }
        coordGroups[coordKey].push(eq);
      }
    });

    // Yeni işaretçileri ekle
    earthquakes.forEach((earthquake) => {
      // Koordinat kontrolü
      if (!earthquake.latitude || !earthquake.longitude || 
          isNaN(earthquake.latitude) || isNaN(earthquake.longitude)) {
        return; // Geçersiz koordinatları atla
      }

      const coordKey = `${earthquake.latitude},${earthquake.longitude}`;
      const sameLocationEarthquakes = coordGroups[coordKey] || [];
      const uniqueSources = Array.from(new Set(sameLocationEarthquakes.map(eq => eq.source)));
      const isMultiSource = uniqueSources.length > 1;
      const { color, radius, fillOpacity, weight, fillColor } = getMarkerProperties(earthquake.magnitude, isMultiSource);

      // Aynı konumdaki deprem kayıtlarını formatla
      const earthquakeDetails = sameLocationEarthquakes
        .map((eq: Earthquake) => `
          <div class="border-b border-gray-200 py-2 last:border-b-0">
            <p><strong>Büyüklük:</strong> ${eq.magnitude}</p>
            <p><strong>Derinlik:</strong> ${eq.depth} km</p>
            <p><strong>Tarih:</strong> ${new Date(eq.time).toLocaleString('tr-TR')}</p>
            <p><strong>Kaynak:</strong> ${eq.source}</p>
            ${eq.url ? `<a href="${eq.url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline mt-1 block">Detaylı Bilgi</a>` : ''}
          </div>
        `).join('');

      L.circleMarker([earthquake.latitude, earthquake.longitude], {
        color,
        radius,
        fillColor,
        fillOpacity,
        weight
      })
        .bindPopup(`
          <div class="text-sm">
            <h3 class="font-bold mb-2">${earthquake.location}</h3>
            <p class="mb-2"><strong>Koordinatlar:</strong> ${earthquake.latitude.toFixed(4)}, ${earthquake.longitude.toFixed(4)}</p>
            ${isMultiSource ? 
              `<p class="mb-2 text-orange-600 font-semibold">Bu konumda ${uniqueSources.length} farklı kaynaktan ${sameLocationEarthquakes.length} deprem kaydı bulundu!</p>
               <p class="mb-2"><strong>Kaynaklar:</strong> ${uniqueSources.join(', ')}</p>` : 
              ''
            }
            <div class="mt-2 max-h-60 overflow-y-auto">
              ${earthquakeDetails}
            </div>
          </div>
        `, {
          maxWidth: 300,
          className: 'custom-popup'
        })
        .addTo(mapInstance);
    });

    // Haritayı marker'ları kapsayacak şekilde ayarla
    if (earthquakes.length > 0) {
      // Geçerli koordinatları olan depremleri filtrele
      const validEarthquakes = earthquakes.filter(eq => 
        eq.latitude && eq.longitude && !isNaN(eq.latitude) && !isNaN(eq.longitude)
      );

      const markers = validEarthquakes.map((eq) => {
        const coordKey = `${eq.latitude},${eq.longitude}`;
        const sameLocationEarthquakes = coordGroups[coordKey] || [];
        const uniqueSources = Array.from(new Set(sameLocationEarthquakes.map(eq => eq.source)));
        const isMultiSource = uniqueSources.length > 1;
        const props = getMarkerProperties(eq.magnitude, isMultiSource);
        
        return L.circleMarker([eq.latitude, eq.longitude], {
          color: props.color,
          radius: props.radius,
          fillColor: props.fillColor,
          fillOpacity: props.fillOpacity,
          weight: props.weight
        });
      });
      
      if (markers.length > 0) {
        const group = L.featureGroup(markers);
        mapInstance.fitBounds(group.getBounds(), { padding: [50, 50] });
        
        return () => {
          group.clearLayers();
        };
      }
    }
  }, [mapInstance, earthquakes]);

  return <div id="map" style={{ height: '100%', width: '100%' }} />;
}