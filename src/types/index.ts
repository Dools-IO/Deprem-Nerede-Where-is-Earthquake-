export type SourceId =
  | 'afad'
  | 'kandilli'
  | 'emsc'
  | 'usgs'
  | 'ingv'
  | 'geonet'
  | 'ga'
  | 'jma'
  | 'ssn'
  | 'geofon'
  | 'sed'
  | 'renass'
  | 'ign'
  | 'ipma'
  | 'bmkg'
  | 'usp';

export interface Earthquake {
  /** Kaynağa göre sabit kimlik, ör. "usgs:us7000abcd" */
  id: string;
  /** UTC, ISO 8601 */
  time: string;
  latitude: number;
  longitude: number;
  /** km, pozitif aşağı doğru */
  depth: number;
  magnitude: number;
  magType?: string;
  location: string;
  source: SourceId;
  url?: string;
  /** Aynı depremi raporlayan diğer kaynaklar (birleştirme sonrası) */
  alsoReportedBy?: SourceId[];
}

export interface SourceStatus {
  id: SourceId;
  name: string;
  ok: boolean;
  /** İlk veri henüz yolda */
  pending?: boolean;
  count: number;
  /** Son başarılı güncelleme (ISO) */
  updatedAt: string | null;
  error?: string;
}

export interface EarthquakeFeed {
  updatedAt: string;
  windowHours: number;
  count: number;
  sources: SourceStatus[];
  earthquakes: Earthquake[];
}
