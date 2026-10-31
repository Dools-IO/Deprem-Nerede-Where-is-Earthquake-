'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Earthquake } from '@/types';
import { SOURCES } from '@/lib/sourceInfo';
import { formatDateTime, formatDepth, formatMagnitude, magnitudeColor, magnitudeRadius } from '@/lib/format';

interface Props {
  earthquakes: Earthquake[];
  arrivals: Map<string, number>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const HOUR = 3600_000;

/** Yaşa göre saydamlık: son 1 saat parlak, 24 saate doğru solar */
function opacityFor(time: string, now: number): number {
  const age = now - Date.parse(time);
  if (age < HOUR) return 0.85;
  if (age < 6 * HOUR) return 0.6;
  return 0.35;
}

/** Popup içeriği DOM API ile kuruluyor; dış kaynaktan gelen metin asla HTML olarak yorumlanmaz */
function buildPopup(eq: Earthquake): HTMLElement {
  const root = document.createElement('div');
  root.className = 'eq-popup';

  const head = document.createElement('div');
  head.className = 'eq-popup-head';
  const mag = document.createElement('span');
  mag.className = 'eq-popup-mag';
  mag.style.background = magnitudeColor(eq.magnitude);
  mag.textContent = formatMagnitude(eq.magnitude);
  const place = document.createElement('strong');
  place.textContent = eq.location || 'Konum belirtilmemiş';
  head.append(mag, place);
  root.append(head);

  const rows: [string, string][] = [
    ['Zaman', formatDateTime(eq.time)],
    ['Derinlik', formatDepth(eq.depth)],
    ['Koordinat', `${eq.latitude.toFixed(3)}, ${eq.longitude.toFixed(3)}`],
    ['Büyüklük tipi', eq.magType ?? '-'],
    [
      'Kaynak',
      [eq.source, ...(eq.alsoReportedBy ?? [])].map((s) => SOURCES[s]?.name ?? s).join(', '),
    ],
  ];
  const dl = document.createElement('dl');
  for (const [k, v] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    dl.append(dt, dd);
  }
  root.append(dl);

  if (eq.url && /^https?:\/\//.test(eq.url)) {
    const a = document.createElement('a');
    a.href = eq.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = `${SOURCES[eq.source]?.name ?? eq.source} sayfasında aç →`;
    root.append(a);
  }
  return root;
}

export default function LiveMap({ earthquakes, arrivals, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, { marker: L.CircleMarker; eq: Earthquake }>());
  const pulses = useRef(new Map<string, L.Marker>());
  const skipFly = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Haritayı bir kez kur
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [30, 20],
      zoom: 3,
      minZoom: 2,
      worldCopyJump: true,
      preferCanvas: true, // binlerce işaret için SVG yerine tek bir canvas
      zoomControl: false,
    });
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    // Anahtar gerektirmeyen koyu altlık (Esri). Ulaşılamazsa OpenStreetMap'e düşer.
    const esriAttribution = 'Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
    const base = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      { attribution: esriAttribution, maxZoom: 16 },
    ).addTo(map);
    // Yer adları altlığın üstünde, deprem işaretlerinin altında
    map.createPane('labels');
    map.getPane('labels')!.style.zIndex = '350';
    map.getPane('labels')!.style.pointerEvents = 'none';
    const labels = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 16, pane: 'labels' },
    ).addTo(map);
    let tileErrors = 0;
    base.on('tileerror', () => {
      if (++tileErrors !== 5) return;
      map.removeLayer(base);
      map.removeLayer(labels);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
    });
    map.on('click', () => onSelectRef.current(null));
    mapRef.current = map;

    const markerMap = markers.current;
    const pulseMap = pulses.current;
    return () => {
      map.remove();
      mapRef.current = null;
      markerMap.clear();
      pulseMap.clear();
    };
  }, []);

  // İşaretleri artımlı güncelle: yalnızca eklenen/değişen/silinenlere dokun
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const now = Date.now();
    const seen = new Set<string>();

    // Küçükler önce çizilsin ki büyükler üstte kalsın
    const ordered = [...earthquakes].sort((a, b) => a.magnitude - b.magnitude);
    for (const eq of ordered) {
      seen.add(eq.id);
      const existing = markers.current.get(eq.id);
      const style: L.CircleMarkerOptions = {
        radius: magnitudeRadius(eq.magnitude),
        color: eq.alsoReportedBy?.length ? '#e2e8f0' : magnitudeColor(eq.magnitude),
        weight: eq.alsoReportedBy?.length ? 1.5 : 1,
        fillColor: magnitudeColor(eq.magnitude),
        fillOpacity: opacityFor(eq.time, now),
      };
      if (existing) {
        if (existing.eq !== eq) {
          existing.marker.setLatLng([eq.latitude, eq.longitude]).setStyle(style).setRadius(style.radius!);
          existing.marker.setPopupContent(buildPopup(eq));
          existing.eq = eq;
        } else {
          existing.marker.setStyle({ fillOpacity: style.fillOpacity });
        }
        existing.marker.bringToFront();
      } else {
        const marker = L.circleMarker([eq.latitude, eq.longitude], style)
          .bindPopup(() => buildPopup(eq), { maxWidth: 320, className: 'eq-leaflet-popup' })
          .on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            skipFly.current = true;
            onSelectRef.current(eq.id);
          })
          .addTo(map);
        markers.current.set(eq.id, { marker, eq });
      }
    }
    for (const [id, { marker }] of markers.current) {
      if (!seen.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }

    // Son 1 saatte olan veya sayfa açıkken gelen M2.5+ depremler için nabız halkası
    const pulseIds = new Set(
      earthquakes
        .filter(
          (eq) =>
            (arrivals.has(eq.id) && eq.magnitude >= 1.5) ||
            (now - Date.parse(eq.time) < HOUR && eq.magnitude >= 2.5),
        )
        .slice(0, 60)
        .map((eq) => eq.id),
    );
    for (const [id, m] of pulses.current) {
      if (!pulseIds.has(id)) {
        m.remove();
        pulses.current.delete(id);
      }
    }
    for (const id of pulseIds) {
      if (pulses.current.has(id)) continue;
      const eq = markers.current.get(id)?.eq;
      if (!eq) continue;
      const size = Math.round(magnitudeRadius(eq.magnitude) * 2);
      const icon = L.divIcon({
        className: 'eq-pulse-icon',
        html: `<span class="eq-pulse" style="--c:${magnitudeColor(eq.magnitude)};--s:${size}px"></span>`,
        iconSize: [size, size],
      });
      const m = L.marker([eq.latitude, eq.longitude], { icon, interactive: false, keyboard: false }).addTo(map);
      pulses.current.set(id, m);
    }
  }, [earthquakes, arrivals]);

  // Listeden seçilen depreme uç ve popup'ını aç
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    if (skipFly.current) {
      skipFly.current = false;
      return;
    }
    const entry = markers.current.get(selectedId);
    if (!entry) return;
    const target = L.latLng(entry.eq.latitude, entry.eq.longitude);
    map.flyTo(target, Math.max(map.getZoom(), 6), { duration: 0.8 });
    entry.marker.openPopup();
  }, [selectedId]);

  return <div ref={containerRef} className="h-full w-full bg-slate-950" aria-label="Deprem haritası" />;
}
