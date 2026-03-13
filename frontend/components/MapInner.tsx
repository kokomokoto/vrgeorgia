'use client';

import 'leaflet/dist/leaflet.css';
import React, { useEffect, useRef, useState } from 'react';
import type { Property } from '@/lib/types';

interface MapInnerProps {
  properties: Property[];
  onPick?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  center?: { lat: number; lng: number };
  zoom?: number;
}

export default function MapInner({ properties, onPick, selectedLocation, center, zoom }: MapInnerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const onPickRef = useRef(onPick);
  const selectedMarkerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // Default center და zoom
  const defaultCenter = center || { lat: 42.1, lng: 43.5 };
  const defaultZoom = zoom || 7;

  // onPick-ის განახლება ref-ში
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // დინამიურად ჩავტვირთავთ leaflet-ს
    import('leaflet').then((L) => {
      if (mapInstanceRef.current) return;

      // Default icon fix
      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      const map = L.map(mapRef.current!).setView([defaultCenter.lat, defaultCenter.lng], defaultZoom);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // კლიკის handler - ყოველთვის ref-ზე მიმართვა
      map.on('click', (e: any) => {
        if (onPickRef.current) {
          onPickRef.current(e.latlng.lat, e.latlng.lng);
        }
      });

      mapInstanceRef.current = map;
      setReady(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // მარკერების განახლება
  useEffect(() => {
    if (!mapInstanceRef.current || !ready) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      
      // ფერადი მარკერები property type-ის მიხედვით
      const markerColors: Record<string, string> = {
        apartment: 'blue',
        house: 'green',
        commercial: 'orange',
        land: 'yellow',
        cottage: 'violet',
        hotel: 'gold',
        building: 'red',
        warehouse: 'grey',
        parking: 'black'
      };

      const createColoredIcon = (color: string) => L.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // ძველი მარკერების წაშლა (გარდა selectedMarker-ისა)
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker && layer !== selectedMarkerRef.current) {
          map.removeLayer(layer);
        }
      });

      // ახალი მარკერების დამატება
      properties.forEach((p) => {
        const color = markerColors[p.type] || 'blue';
        const icon = createColoredIcon(color);
        const marker = L.marker([p.location.lat, p.location.lng], { icon }).addTo(map);
        marker.bindPopup(`
          <div style="min-width: 150px;">
            <a href="/property/${p._id}" style="font-size: 14px; font-weight: 600; color: #1e40af; text-decoration: none; display: block; margin-bottom: 4px;">
              ${p.title}
            </a>
            <div style="font-size: 13px; color: #059669; font-weight: 500;">
              $${p.price.toLocaleString()}
            </div>
            ${p.city ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${p.city}</div>` : ''}
          </div>
        `);
      });
    });
  }, [properties, ready]);

  // არჩეული ლოკაციის მარკერი (upload გვერდისთვის)
  useEffect(() => {
    if (!mapInstanceRef.current || !ready) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;

      // ძველი selected მარკერის წაშლა
      if (selectedMarkerRef.current) {
        map.removeLayer(selectedMarkerRef.current);
        selectedMarkerRef.current = null;
      }

      // ახალი მარკერის დამატება
      if (selectedLocation) {
        const redIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        selectedMarkerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], { icon: redIcon }).addTo(map);
        selectedMarkerRef.current.bindPopup('არჩეული ლოკაცია').openPopup();
      }
    });
  }, [selectedLocation, ready]);

  // center და zoom-ის ცვლილება (მისამართის ძებნიდან)
  useEffect(() => {
    if (!mapInstanceRef.current || !ready || !center) return;
    mapInstanceRef.current.setView([center.lat, center.lng], zoom || 17);
  }, [center, zoom, ready]);

  return <div ref={mapRef} className="h-full w-full" />;
}
