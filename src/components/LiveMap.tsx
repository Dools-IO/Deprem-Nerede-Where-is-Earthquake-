'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Earthquake } from '@/types';
import { SOURCES, reporterNames } from '@/lib/sourceInfo';
import { formatDepth, formatMagnitude, magnitudeColor, magnitudeRadius, type Formatters } from '@/lib/format';
import type { Dictionary } from '@/i18n';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  earthquakes: Earthquake[];
  arrivals: Map<string, number>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const HOUR = 3600_000;
/** Bir karede eklenecek en fazla işaret */
const MARKER_CHUNK = 1500;

/** Yaşa göre saydamlık: son 1 saat parlak, 24 saate doğru solar */
function opacityFor(time: string, now: number): number {
  const age = now - Date.parse(time);
  if (age < HOUR) return 0.85;
  if (age < 6 * HOUR) return 0.6;
  return 0.35;
}

/** Popup içeriği DOM API ile kuruluyor; dış kaynaktan gelen metin asla HTML olarak yorumlanmaz */
function buildPopup(eq: Earthquake, t: Dictionary, fmt: Formatters): HTMLElement {
  const root = document.createElement('div');
  root.className = 'eq-popup';

  const head = document.createElement('div');
  head.className = 'eq-popup-head';
  const mag = document.createElement('span');
  mag.className = 'eq-popup-mag';
  mag.style.background = magnitudeColor(eq.magnitude);
  mag.textContent = formatMagnitude(eq.magnitude);
  const place = document.createElement('strong');
  place.textContent = eq.location || t.common.unknownLocation;
  head.append(mag, place);
  root.append(head);

  const rows: [string, string][] = [
    [t.common.time, fmt.dateTime(eq.time)],
    [t.common.depth, formatDepth(eq.depth)],
    [t.map.coordinates, `${eq.latitude.toFixed(3)}, ${eq.longitude.toFixed(3)}`],
    [t.map.magType, eq.magType ?? '-'],
    [t.common.source, reporterNames(eq)],
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
    a.textContent = t.map.openAt(SOURCES[eq.source]?.name ?? eq.source);
    root.append(a);
  }
  return root;
}

interface MarkerEntry {
  marker: L.CircleMarker;
  eq: Earthquake;
  /** Çizimi etkileyen alanların özeti; değişmediyse işarete hiç dokunulmaz */
  sig: string;
  opacity: number;
}

const drawSignature = (eq: Earthquake) =>
  `${eq.latitude},${eq.longitude},${eq.magnitude},${eq.alsoReportedBy?.length ? 1 : 0}`;

function styleFor(eq: Earthquake, now: number): L.CircleMarkerOptions {
  return {
    radius: magnitudeRadius(eq.magnitude),
    color: eq.alsoReportedBy?.length ? '#e2e8f0' : magnitudeColor(eq.magnitude),
    weight: eq.alsoReportedBy?.length ? 1.5 : 1,
    fillColor: magnitudeColor(eq.magnitude),
    fillOpacity: opacityFor(eq.time, now),
  };
}

export default function LiveMap({ earthquakes, arrivals, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, MarkerEntry>());
  const pulses = useRef(new Map<string, L.Marker>());
  const skipFly = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  // Popup her açılışta kurulur; dil değişse de güncel sözlüğü kullansın
  const { t, fmt } = useI18n();
  const i18nRef = useRef({ t, fmt });
  i18nRef.current = { t, fmt };

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
      // Kare geçiş animasyonu her karede tüm karelerin saydamlığını günceller; mobilde zoom'u takıldırıyordu
      fadeAnimation: false,
      attributionControl: false,
    });
    L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map);
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    // Anahtar gerektirmeyen koyu altlık (Esri). Ulaşılamazsa OpenStreetMap'e düşer.
    // Zoom sırasında ara seviyelerin karelerini indirme; zoom bitince tek seferde yükle
    const tileOptions: L.TileLayerOptions = { maxZoom: 16, updateWhenZooming: false, keepBuffer: 1 };
    const esriAttribution = '&copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; OpenStreetMap';
    const base = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      { ...tileOptions, attribution: esriAttribution },
    ).addTo(map);
    // Yer adları altlığın üstünde, deprem işaretlerinin altında
    map.createPane('labels');
    map.getPane('labels')!.style.zIndex = '350';
    map.getPane('labels')!.style.pointerEvents = 'none';
    const labels = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      { ...tileOptions, pane: 'labels' },
    ).addTo(map);
    let tileErrors = 0;
    base.on('tileerror', () => {
      if (++tileErrors !== 5) return;
      map.removeLayer(base);
      map.removeLayer(labels);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        ...tileOptions,
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

    // Her yenilemede JSON'dan yeni nesneler gelir; kimlik yerine içerik karşılaştırılır.
    // Böylece değişmeyen binlerce işarete dokunulmaz, canvas yalnızca gerektiğinde çizilir.
    const added: Earthquake[] = [];
    for (const eq of earthquakes) {
      seen.add(eq.id);
      const entry = markers.current.get(eq.id);
      if (!entry) {
        added.push(eq);
        continue;
      }
      entry.eq = eq; // popup her açılışta güncel kaydı kullanır
      const sig = drawSignature(eq);
      if (sig !== entry.sig) {
        const style = styleFor(eq, now);
        entry.marker.setLatLng([eq.latitude, eq.longitude]).setStyle(style).setRadius(style.radius!);
        entry.sig = sig;
        entry.opacity = style.fillOpacity!;
      } else {
        const opacity = opacityFor(eq.time, now);
        if (opacity !== entry.opacity) {
          entry.marker.setStyle({ fillOpacity: opacity });
          entry.opacity = opacity;
        }
      }
    }
    for (const [id, { marker }] of markers.current) {
      if (!seen.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }

    // Yeni işaretler parça parça eklenir: ilk açılışta binlerce işaret ana iş parçacığını
    // tek seferde kilitlemez, harita ve panel hemen tepki verir.
    let cancelled = false;
    if (added.length) {
      // Küçükler önce eklensin ki büyükler üstte kalsın
      added.sort((a, b) => a.magnitude - b.magnitude);
      const hadMarkers = markers.current.size > 0;
      const addChunk = (from: number) => {
        if (cancelled) return;
        const to = Math.min(from + MARKER_CHUNK, added.length);
        for (let i = from; i < to; i++) {
          const eq = added[i];
          if (markers.current.has(eq.id)) continue;
          const style = styleFor(eq, now);
          const entry: MarkerEntry = {
            marker: L.circleMarker([eq.latitude, eq.longitude], style),
            eq,
            sig: drawSignature(eq),
            opacity: style.fillOpacity!,
          };
          entry.marker
            .bindPopup(() => buildPopup(entry.eq, i18nRef.current.t, i18nRef.current.fmt), { maxWidth: 320, className: 'eq-leaflet-popup' })
            .on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              skipFly.current = true;
              onSelectRef.current(entry.eq.id);
            })
            .addTo(map);
          markers.current.set(eq.id, entry);
        }
        if (to < added.length) {
          requestAnimationFrame(() => addChunk(to));
        } else if (hadMarkers || added.length > MARKER_CHUNK) {
          // Sonradan eklenen küçük işaretler büyükleri örtmesin: yalnızca M4+ öne alınır (az sayıda)
          [...markers.current.values()]
            .filter((m) => m.eq.magnitude >= 4)
            .sort((a, b) => a.eq.magnitude - b.eq.magnitude)
            .forEach((m) => m.marker.bringToFront());
        }
      };
      addChunk(0);
    }

    // Son 1 saatte olan veya sayfa açıkken gelen M2.5+ depremler için nabız halkası
    const pulseEqs = new Map(
      earthquakes
        .filter(
          (eq) =>
            (arrivals.has(eq.id) && eq.magnitude >= 1.5) ||
            (now - Date.parse(eq.time) < HOUR && eq.magnitude >= 2.5),
        )
        .slice(0, 60)
        .map((eq) => [eq.id, eq] as const),
    );
    for (const [id, m] of pulses.current) {
      if (!pulseEqs.has(id)) {
        m.remove();
        pulses.current.delete(id);
      }
    }
    for (const [id, eq] of pulseEqs) {
      if (pulses.current.has(id)) continue;
      const size = Math.round(magnitudeRadius(eq.magnitude) * 2);
      const icon = L.divIcon({
        className: 'eq-pulse-icon',
        html: `<span class="eq-pulse" style="--c:${magnitudeColor(eq.magnitude)};--s:${size}px"></span>`,
        iconSize: [size, size],
      });
      const m = L.marker([eq.latitude, eq.longitude], { icon, interactive: false, keyboard: false }).addTo(map);
      pulses.current.set(id, m);
    }
    return () => {
      cancelled = true;
    };
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

  return <div ref={containerRef} className="h-full w-full bg-slate-950" aria-label={t.map.ariaLabel} />;
}
