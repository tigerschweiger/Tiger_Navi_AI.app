import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import { NavigateResponse } from "../api/client";
import { DEFAULT_CENTER, OSM_ATTRIBUTION, OSM_TILE_URL } from "./leafletSetup";

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
      <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
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
