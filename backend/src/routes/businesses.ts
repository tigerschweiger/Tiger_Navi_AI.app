import { Router } from "express";
import { z } from "zod";
import { BusinessCategory, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { authMiddleware, AuthedRequest } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";
import { geocode } from "../services/geocode";
import { summarizeReviews } from "../services/ai";

const router = Router();

const categoryValues = Object.values(BusinessCategory) as [BusinessCategory, ...BusinessCategory[]];

function summarize(business: { reviews: { rating: number }[] }) {
  const reviewCount = business.reviews.length;
  const averageRating =
    reviewCount === 0
      ? null
      : business.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;
  return { averageRating, reviewCount };
}

const listQuerySchema = z.object({
  minLat: z.coerce.number(),
  minLon: z.coerce.number(),
  maxLat: z.coerce.number(),
  maxLon: z.coerce.number(),
  category: z.enum(categoryValues).optional(),
  q: z.string().min(1).optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const { minLat, minLon, maxLat, maxLon, category, q } = listQuerySchema.parse(req.query);

    const where: Prisma.BusinessWhereInput = {
      lat: { gte: minLat, lte: maxLat },
      lon: { gte: minLon, lte: maxLon },
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const businesses = await prisma.business.findMany({
      where,
      include: { reviews: { select: { rating: true } } },
    });

    res.json({
      businesses: businesses.map(({ reviews, ...business }) => ({
        ...business,
        ...summarize({ reviews }),
      })),
    });
  } catch (err) {
    next(err);
  }
});

const businessInputSchema = z.object({
  name: z.string().min(1),
  category: z.enum(categoryValues),
  description: z.string().min(1),
  address: z.string().min(1),
});

router.post("/", authMiddleware, async (req: AuthedRequest, res, next) => {
  try {
    const input = businessInputSchema.parse(req.body);
    const location = await geocode(input.address);

    const business = await prisma.business.create({
      data: {
        ...input,
        lat: location.lat,
        lon: location.lon,
        ownerId: req.userId!,
      },
    });

    res.status(201).json({ business: { ...business, averageRating: null, reviewCount: 0 } });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!business) {
      throw new HttpError(404, "Business not found");
    }

    const { reviews, ...rest } = business;
    res.json({
      business: { ...rest, ...summarize({ reviews }), reviews },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/summary", authMiddleware, async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.id },
      include: { reviews: { select: { rating: true, comment: true } } },
    });

    if (!business) {
      throw new HttpError(404, "Business not found");
    }

    if (business.reviews.length === 0) {
      return res.json({ summary: null });
    }

    const summary = await summarizeReviews(business.name, business.reviews);
    res.json({ summary });
  } catch (err) {
    next(err);
  }
});

async function requireOwnedBusiness(id: string, userId: string) {
  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) {
    throw new HttpError(404, "Business not found");
  }
  if (business.ownerId !== userId) {
    throw new HttpError(403, "You can only modify businesses you created");
  }
  return business;
}

router.put("/:id", authMiddleware, async (req: AuthedRequest, res, next) => {
  try {
    await requireOwnedBusiness(req.params.id, req.userId!);
    const input = businessInputSchema.parse(req.body);
    const location = await geocode(input.address);

    const business = await prisma.business.update({
      where: { id: req.params.id },
      data: { ...input, lat: location.lat, lon: location.lon },
    });

    res.json({ business });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authMiddleware, async (req: AuthedRequest, res, next) => {
  try {
    await requireOwnedBusiness(req.params.id, req.userId!);
    await prisma.business.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

const reviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
});

router.post("/:id/reviews", authMiddleware, async (req: AuthedRequest, res, next) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.params.id } });
    if (!business) {
      throw new HttpError(404, "Business not found");
    }

    const { rating, comment } = reviewInputSchema.parse(req.body);

    const review = await prisma.review.upsert({
      where: { businessId_userId: { businessId: req.params.id, userId: req.userId! } },
      update: { rating, comment },
      create: { businessId: req.params.id, userId: req.userId!, rating, comment },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/reviews/:reviewId", authMiddleware, async (req: AuthedRequest, res, next) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.reviewId } });
    if (!review || review.businessId !== req.params.id) {
      throw new HttpError(404, "Review not found");
    }
    if (review.userId !== req.userId) {
      throw new HttpError(403, "You can only delete your own review");
    }

    await prisma.review.delete({ where: { id: req.params.reviewId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
