// components/TrackingMapDialog.tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

interface TrackingMapDialogProps {
  fromCoords: [number, number];
  toCoords: [number, number];
}

export const TrackingMapDialog = ({ fromCoords, toCoords }: TrackingMapDialogProps) => {
  return (
    <MapContainer
      center={fromCoords}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={fromCoords}>
        <Popup>From (Donation Center)</Popup>
      </Marker>
      <Marker position={toCoords}>
        <Popup>To (Hospital)</Popup>
      </Marker>
    </MapContainer>
  );
};
