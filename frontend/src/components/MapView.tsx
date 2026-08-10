import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { NavigateResponse } from "../api/client";

// Vite doesn't resolve Leaflet's default marker asset paths automatically; wire them up explicitly.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER: [number, number] = [39.9042, 116.4074]; // Beijing, used before any route exists

function FitToRoute({ result }: { result: NavigateResponse }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(
      result.route.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, result]);
  return null;
}

export function MapView({ result }: { result: NavigateResponse | null }) {
  const positions = result
    ? (result.route.geometry.coordinates.map(([lon, lat]) => [lat, lon]) as [number, number][])
    : [];

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={12} className="map-view">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {result && (
        <>
          <Marker position={[result.origin.lat, result.origin.lon]} />
          <Marker position={[result.destination.lat, result.destination.lon]} />
          <Polyline positions={positions} color="#2563eb" weight={5} />
          <FitToRoute result={result} />
        </>
      )}
    </MapContainer>
  );
}
