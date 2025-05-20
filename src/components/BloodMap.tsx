// src/components/BloodMap.tsx
import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import L from "leaflet";

const truckIcon = L.divIcon({
  html: '🚚', // You can use an image too, if preferred
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});


interface BloodMapProps {
  from: string;
  to: string;
}

const BloodMap: React.FC<BloodMapProps> = ({ from, to }) => {
  const mapContainer = useRef(null);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainer.current!,
      style: 'https://demotiles.maplibre.org/style.json', // free map style
      center: [35.5, 33.9], // default center (Lebanon)
      zoom: 6
    });

    // Example coordinates (replace with actual geocoding if available)
    const locations = {
      Beirut: [35.5, 33.9],
      Tripoli: [35.85, 34.43],
      'Central Blood Bank': [35.49, 33.89],
    };

    const fromCoords = locations[from] || [35.5, 33.9];
    const toCoords = locations[to] || [35.85, 34.43];

    // Markers
    new maplibregl.Marker({ color: 'red' }).setLngLat(fromCoords).addTo(map);
    new maplibregl.Marker({ color: 'green' }).setLngLat(toCoords).addTo(map);

    // Route line
    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [fromCoords, toCoords],
          },
        },
      });

      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#888',
          'line-width': 4,
        },
      });
    });

    return () => map.remove();
  }, [from, to]);

  return <div ref={mapContainer} style={{ height: 300, width: '100%' }} />;
};

export default BloodMap;
