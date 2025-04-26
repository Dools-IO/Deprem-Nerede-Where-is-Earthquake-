export interface Earthquake {
  id: string;
  time: string;
  latitude: number;
  longitude: number;
  depth: number;
  magnitude: number;
  location: string;
  source: 'Kandilli' | 'USGS' | 'ESM/USGS Database' | 'ESM Database' | 'EMSC' | 'IRIS' | 'JMA' | 'FDSNWS' | 'GA' | 'GeoNet' | 'SSN' | 'INGV';
  url?: string;
}

export interface EarthquakeResponse {
  earthquakes: Earthquake[];
  lastUpdated: Date;
} 