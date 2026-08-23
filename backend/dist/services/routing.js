"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoute = getRoute;
const errorHandler_1 = require("../middleware/errorHandler");
const OSRM_BASE_URL = process.env.OSRM_BASE_URL;
async function getRoute(origin, destination) {
    const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
    const url = new URL(`/route/v1/driving/${coords}`, OSRM_BASE_URL);
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");
    const response = await fetch(url);
    if (!response.ok) {
        throw new errorHandler_1.HttpError(502, "Routing service is unavailable right now");
    }
    const data = (await response.json());
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        throw new errorHandler_1.HttpError(422, "Could not find a route between these two locations");
    }
    const [best] = data.routes;
    return { distanceMeters: best.distance, durationSeconds: best.duration, geometry: best.geometry };
}
