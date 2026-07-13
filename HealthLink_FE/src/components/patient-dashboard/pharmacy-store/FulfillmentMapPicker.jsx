import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import MapSurfaceErrorBoundary from './MapSurfaceErrorBoundary';

function PinSelector({ onSelect }) {
  useMapEvents({ click: (event) => onSelect(event.latlng.lat, event.latlng.lng) });
  return null;
}

export default function FulfillmentMapPicker({ latitude, longitude, onSelect }) {
  const hasPin = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const center = hasPin ? [Number(latitude), Number(longitude)] : [10.7769, 106.7009];
  return (
    <MapSurfaceErrorBoundary>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <PinSelector onSelect={onSelect} />
        {hasPin && <Marker position={center} />}
      </MapContainer>
    </MapSurfaceErrorBoundary>
  );
}
