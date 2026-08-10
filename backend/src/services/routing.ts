import { HttpError } from "../middleware/errorHandler";
import { Coordinates } from "./geocode";

const OSRM_BASE_URL = process.env.OSRM_BASE_URL as string;

export interface LineStringGeometry {
  type: "LineString";
  coordinates: [number, number][];
}

export interface Route {
  distanceMeters: number;
  durationSeconds: number;
  geometry: LineStringGeometry;
}

export async function getRoute(origin: Coordinates, destination: Coordinates): Promise<Route> {
  const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
  const url = new URL(`/route/v1/driving/${coords}`, OSRM_BASE_URL);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");

  const response = await fetch(url);
  if (!response.ok) {
    throw new HttpError(502, "Routing service is unavailable right now");
  }

  const data = (await response.json()) as {
    code: string;
    routes?: Array<{ distance: number; duration: number; geometry: LineStringGeometry }>;
  };

  if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
    throw new HttpError(422, "Could not find a route between these two locations");
  }

  const [best] = data.routes;
  return { distanceMeters: best.distance, durationSeconds: best.duration, geometry: best.geometry };
}
