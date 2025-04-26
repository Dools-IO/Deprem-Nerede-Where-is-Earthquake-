'use client';

import React, { useState } from 'react';
import { Earthquake } from '@/types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface EarthquakeListProps {
  earthquakes: Earthquake[];
}

export default function EarthquakeList({ earthquakes }: EarthquakeListProps) {
  const [selectedMagnitude, setSelectedMagnitude] = useState<number | null>(null);

  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude >= 6.0) return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
    if (magnitude >= 5.0) return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white';
    if (magnitude >= 4.0) return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white';
    return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
  };

  const getDepthColor = (depth: number) => {
    if (depth >= 100) return 'text-purple-600 border-purple-200';
    if (depth >= 50) return 'text-blue-600 border-blue-200';
    if (depth >= 20) return 'text-cyan-600 border-cyan-200';
    return 'text-teal-600 border-teal-200';
  };

  const filteredEarthquakes = selectedMagnitude
    ? earthquakes.filter(eq => eq.magnitude >= selectedMagnitude)
    : earthquakes;

  return (
    <div className="space-y-6">
      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 p-4 bg-white rounded-lg shadow-sm">
        <button
          onClick={() => setSelectedMagnitude(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selectedMagnitude === null
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tümü
        </button>
        {[4, 5, 6].map(mag => (
          <button
            key={mag}
            onClick={() => setSelectedMagnitude(mag)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedMagnitude === mag
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {mag}.0+ Büyüklük
          </button>
        ))}
      </div>

      {/* Deprem Kartları */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEarthquakes.map((earthquake, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <div className="p-4 space-y-3">
              {/* Başlık ve Zaman */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getMagnitudeColor(earthquake.magnitude)}`}>
                    {earthquake.magnitude.toFixed(1)} ML
                  </span>
                  <p className="text-xs text-gray-500">
                    {format(new Date(earthquake.time), 'dd MMM yyyy HH:mm:ss', { locale: tr })}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${earthquake.latitude},${earthquake.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </a>
              </div>

              {/* Konum */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                  {earthquake.location}
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-xs border rounded-full ${getDepthColor(earthquake.depth)}`}>
                    {earthquake.depth.toFixed(1)} km derinlik
                  </span>
                  <span className="text-xs text-gray-500">
                    {earthquake.source}
                  </span>
                </div>
              </div>

              {/* Koordinatlar */}
              <div className="text-xs text-gray-500 space-x-2">
                <span>N: {earthquake.latitude?.toFixed(4)}</span>
                <span>E: {earthquake.longitude?.toFixed(4)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sonuç Sayısı */}
      <div className="text-center text-sm text-gray-500">
        Toplam {filteredEarthquakes.length} deprem gösteriliyor
        {selectedMagnitude && ` (${selectedMagnitude}.0+ büyüklüğünde)`}
      </div>
    </div>
  );
} 