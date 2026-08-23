"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const geocode_1 = require("../services/geocode");
const routing_1 = require("../services/routing");
const router = (0, express_1.Router)();
const pointSchema = zod_1.z.union([
    zod_1.z.string().min(1),
    zod_1.z.object({ lat: zod_1.z.number(), lon: zod_1.z.number() }),
]);
const navigateSchema = zod_1.z.object({
    origin: pointSchema,
    destination: pointSchema,
});
async function resolvePoint(point) {
    if (typeof point === "string") {
        return (0, geocode_1.geocode)(point);
    }
    return { lat: point.lat, lon: point.lon, displayName: `${point.lat}, ${point.lon}` };
}
router.post("/", auth_1.authMiddleware, async (req, res, next) => {
    try {
        const { origin, destination } = navigateSchema.parse(req.body);
        const [originCoords, destinationCoords] = await Promise.all([
            resolvePoint(origin),
            resolvePoint(destination),
        ]);
        const route = await (0, routing_1.getRoute)(originCoords, destinationCoords);
        res.json({
            origin: originCoords,
            destination: destinationCoords,
            route,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
