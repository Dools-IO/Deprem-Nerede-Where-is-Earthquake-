# Earthquake Data Scraper Modules

This directory contains scraper modules used to fetch earthquake information from various seismological data sources.

## Available Data Sources

### 1. EMSC (Seismic Portal)
- **File:** `emsc.ts`
- **Data Source:** European-Mediterranean Seismological Centre 
- **API URL:** https://www.seismicportal.eu/fdsnws/event/1/query
- **Features:** WebSocket real-time data, REST API
- **Details:** Provides comprehensive earthquake data across Europe and the Mediterranean region with real-time updates via WebSocket

### 2. KOERI (Kandilli Observatory)
- **File:** `koeri.ts`
- **Data Source:** Boğaziçi University Kandilli Observatory and Earthquake Research Institute
- **URL:** http://www.koeri.boun.edu.tr/scripts/lst0.asp
- **Features:** Web page scraping
- **Details:** Specialized in earthquakes occurring in Turkey and surrounding regions

### 3. USGS (United States Geological Survey)
- **File:** `usgs.ts`
- **Data Source:** United States Geological Survey
- **API URL:** https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson
- **Features:** REST API, GeoJSON format
- **Details:** Global earthquake data with extensive metadata and documentation

### 4. IRIS (Incorporated Research Institutions for Seismology)
- **File:** `iris.ts`
- **Data Source:** IRIS Consortium
- **API URL:** http://service.iris.edu/fdsnws/event/1/query
- **Features:** REST API
- **Details:** Academic-focused earthquake data with research-grade accuracy

### 5. ESM (European Strong-Motion Database)
- **File:** `esm.ts`
- **Data Source:** European Strong-Motion Database
- **API URL:** https://esm-db.eu/fdsnws/event/1/query
- **Features:** REST API, supports both JSON & XML formats
- **Details:** Specialized in strong-motion earthquake recordings across European regions

### 6. JMA (Japan Meteorological Agency)
- **File:** `jma.ts`
- **Data Source:** Japan Meteorological Agency
- **API URL:** Various JMA endpoints
- **Features:** REST API, specialized in Japanese earthquakes
- **Details:** Provides detailed information about seismic events in Japan, including tsunami warnings

### 7. FDSNWS (FDSN Web Service)
- **File:** `fdsnws.ts`
- **Data Source:** Generic FDSN-compatible seismological institutions
- **Features:** Standardized FDSN Web Service protocol
- **Details:** A generic client for seismological institutions following the FDSN standard

## Usage

All scrapers use a similar interface:

```typescript
import { fetchAllEarthquakes } from '@/lib/scrapers';

// To fetch data from all sources
const allEarthquakes = await fetchAllEarthquakes();

// To fetch data from a specific source
import { fetchESMEarthquakes } from '@/lib/scrapers/esm';

// Get earthquakes from the ESM database for a specific time range
const startTime = "2023-01-01T00:00:00";
const endTime = "2023-12-31T23:59:59";
const minMagnitude = 5;
const earthquakes = await fetchESMEarthquakes(startTime, endTime, minMagnitude);
```

## ESM API Usage

The European Strong-Motion Database (ESM) API supports the following parameters for fetching earthquake data:

### Parameters

- `starttime`: Start date (format: YYYY-MM-DDThh:mm:ss)
- `endtime`: End date (format: YYYY-MM-DDThh:mm:ss)
- `minmagnitude`: Minimum magnitude value
- `maxmagnitude`: Maximum magnitude value
- `mindepth`: Minimum depth (km)
- `maxdepth`: Maximum depth (km)
- `minlat`: Minimum latitude 
- `maxlat`: Maximum latitude
- `minlon`: Minimum longitude
- `maxlon`: Maximum longitude
- `includeallmagnitudes`: Include all magnitude calculations (True/False)
- `format`: Data format (json or xml)

### Example URLs

```
# Earthquakes with magnitude 6 and above in 2023
https://esm-db.eu/fdsnws/event/1/query?starttime=2023-01-01T00:00:00&endtime=2023-12-31T23:59:59&minmagnitude=6&includeallmagnitudes=True&format=json

# Earthquakes in the last 30 days
https://esm-db.eu/fdsnws/event/1/query?starttime=2023-05-01T00:00:00&endtime=2023-05-31T23:59:59&format=json

# Earthquakes in the Turkey region (approximate)
https://esm-db.eu/fdsnws/event/1/query?minlat=36&maxlat=42&minlon=26&maxlon=45&format=json