import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { geocode, Coordinates } from "../services/geocode";
import { getRoute } from "../services/routing";

const router = Router();

const pointSchema = z.union([
  z.string().min(1),
  z.object({ lat: z.number(), lon: z.number() }),
]);

const navigateSchema = z.object({
  origin: pointSchema,
  destination: pointSchema,
});

async function resolvePoint(point: z.infer<typeof pointSchema>): Promise<Coordinates> {
  if (typeof point === "string") {
    return geocode(point);
  }
  return { lat: point.lat, lon: point.lon, displayName: `${point.lat}, ${point.lon}` };
}

router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { origin, destination } = navigateSchema.parse(req.body);

    const [originCoords, destinationCoords] = await Promise.all([
      resolvePoint(origin),
      resolvePoint(destination),
    ]);

    const route = await getRoute(originCoords, destinationCoords);

    res.json({
      origin: originCoords,
      destination: destinationCoords,
      route,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
