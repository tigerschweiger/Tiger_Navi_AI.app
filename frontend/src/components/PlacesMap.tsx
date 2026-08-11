import { MapContainer, Marker, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { Bounds, BusinessSummary, CATEGORY_LABELS } from "../api/places";
import { DEFAULT_CENTER, OSM_ATTRIBUTION, OSM_TILE_URL } from "./leafletSetup";

const DEBOUNCE_MS = 500;

function boundsFromMap(map: L.Map): Bounds {
  const bounds = map.getBounds();
  return {
    minLat: bounds.getSouth(),
    minLon: bounds.getWest(),
    maxLat: bounds.getNorth(),
    maxLon: bounds.getEast(),
  };
}

function BoundsWatcher({ onBoundsChange }: { onBoundsChange: (bounds: Bounds) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const map = useMapEvents({
    moveend: () => schedule(),
    zoomend: () => schedule(),
  });

  function schedule() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onBoundsChange(boundsFromMap(map)), DEBOUNCE_MS);
  }

  useEffect(() => {
    onBoundsChange(boundsFromMap(map));
    // Only run once on mount — the map instance is stable for the component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

interface PlacesMapProps {
  businesses: BusinessSummary[];
  onBoundsChange: (bounds: Bounds) => void;
}

export function PlacesMap({ businesses, onBoundsChange }: PlacesMapProps) {
  const navigate = useNavigate();

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={13} className="map-view">
      <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
      <BoundsWatcher onBoundsChange={onBoundsChange} />
      {businesses.map((business) => (
        <Marker
          key={business.id}
          position={[business.lat, business.lon]}
          eventHandlers={{ click: () => navigate(`/places/${business.id}`) }}
        >
          <Tooltip>
            {business.name} · {CATEGORY_LABELS[business.category]}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
