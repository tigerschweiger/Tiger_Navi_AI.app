import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api",
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("navi_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Coordinates {
  lat: number;
  lon: number;
  displayName: string;
}

export interface LineStringGeometry {
  type: "LineString";
  coordinates: [number, number][];
}

export interface NavigateResponse {
  origin: Coordinates;
  destination: Coordinates;
  route: {
    distanceMeters: number;
    durationSeconds: number;
    geometry: LineStringGeometry;
  };
}

export type Point = string | { lat: number; lon: number };

export async function navigate(origin: Point, destination: Point): Promise<NavigateResponse> {
  const { data } = await apiClient.post<NavigateResponse>("/navigate", { origin, destination });
  return data;
}
