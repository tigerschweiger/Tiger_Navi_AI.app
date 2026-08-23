"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const geocode_1 = require("../services/geocode");
const ai_1 = require("../services/ai");
const router = (0, express_1.Router)();
const categoryValues = Object.values(client_1.BusinessCategory);
function summarize(business) {
    const reviewCount = business.reviews.length;
    const averageRating = reviewCount === 0
        ? null
        : business.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;
    return { averageRating, reviewCount };
}
const listQuerySchema = zod_1.z.object({
    minLat: zod_1.z.coerce.number(),
    minLon: zod_1.z.coerce.number(),
    maxLat: zod_1.z.coerce.number(),
    maxLon: zod_1.z.coerce.number(),
    category: zod_1.z.enum(categoryValues).optional(),
    q: zod_1.z.string().min(1).optional(),
});
router.get("/", async (req, res, next) => {
    try {
        const { minLat, minLon, maxLat, maxLon, category, q } = listQuerySchema.parse(req.query);
        const where = {
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
        const businesses = await db_1.prisma.business.findMany({
            where,
            include: { reviews: { select: { rating: true } } },
        });
        res.json({
            businesses: businesses.map(({ reviews, ...business }) => ({
                ...business,
                ...summarize({ reviews }),
            })),
        });
    }
    catch (err) {
        next(err);
    }
});
const businessInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    category: zod_1.z.enum(categoryValues),
    description: zod_1.z.string().min(1),
    address: zod_1.z.string().min(1),
});
router.post("/", auth_1.authMiddleware, async (req, res, next) => {
    try {
        const input = businessInputSchema.parse(req.body);
        const location = await (0, geocode_1.geocode)(input.address);
        const business = await db_1.prisma.business.create({
            data: {
                ...input,
                lat: location.lat,
                lon: location.lon,
                ownerId: req.userId,
            },
        });
        res.status(201).json({ business: { ...business, averageRating: null, reviewCount: 0 } });
    }
    catch (err) {
        next(err);
    }
});
router.get("/:id", async (req, res, next) => {
    try {
        const business = await db_1.prisma.business.findUnique({
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
            throw new errorHandler_1.HttpError(404, "Business not found");
        }
        const { reviews, ...rest } = business;
        res.json({
            business: { ...rest, ...summarize({ reviews }), reviews },
        });
    }
    catch (err) {
        next(err);
    }
});
router.get("/:id/summary", auth_1.authMiddleware, async (req, res, next) => {
    try {
        const business = await db_1.prisma.business.findUnique({
            where: { id: req.params.id },
            include: { reviews: { select: { rating: true, comment: true } } },
        });
        if (!business) {
            throw new errorHandler_1.HttpError(404, "Business not found");
        }
        if (business.reviews.length === 0) {
            return res.json({ summary: null });
        }
        const summary = await (0, ai_1.summarizeReviews)(business.name, business.reviews);
        res.json({ summary });
    }
    catch (err) {
        next(err);
    }
});
async function requireOwnedBusiness(id, userId) {
    const business = await db_1.prisma.business.findUnique({ where: { id } });
    if (!business) {
        throw new errorHandler_1.HttpError(404, "Business not found");
    }
    if (business.ownerId !== userId) {
        throw new errorHandler_1.HttpError(403, "You can only modify businesses you created");
    }
    return business;
}
router.put("/:id", auth_1.authMiddleware, async (req, res, next) => {
    try {
        await requireOwnedBusiness(req.params.id, req.userId);
        const input = businessInputSchema.parse(req.body);
        const location = await (0, geocode_1.geocode)(input.address);
        const business = await db_1.prisma.business.update({
            where: { id: req.params.id },
            data: { ...input, lat: location.lat, lon: location.lon },
        });
        res.json({ business });
    }
    catch (err) {
        next(err);
    }
});
router.delete("/:id", auth_1.authMiddleware, async (req, res, next) => {
    try {
        await requireOwnedBusiness(req.params.id, req.userId);
        await db_1.prisma.business.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
const reviewInputSchema = zod_1.z.object({
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().min(1),
});
router.post("/:id/reviews", auth_1.authMiddleware, async (req, res, next) => {
    try {
        const business = await db_1.prisma.business.findUnique({ where: { id: req.params.id } });
        if (!business) {
            throw new errorHandler_1.HttpError(404, "Business not found");
        }
        const { rating, comment } = reviewInputSchema.parse(req.body);
        const review = await db_1.prisma.review.upsert({
            where: { businessId_userId: { businessId: req.params.id, userId: req.userId } },
            update: { rating, comment },
            create: { businessId: req.params.id, userId: req.userId, rating, comment },
            include: { user: { select: { id: true, name: true } } },
        });
        res.status(201).json({ review });
    }
    catch (err) {
        next(err);
    }
});
router.delete("/:id/reviews/:reviewId", auth_1.authMiddleware, async (req, res, next) => {
    try {
        const review = await db_1.prisma.review.findUnique({ where: { id: req.params.reviewId } });
        if (!review || review.businessId !== req.params.id) {
            throw new errorHandler_1.HttpError(404, "Review not found");
        }
        if (review.userId !== req.userId) {
            throw new errorHandler_1.HttpError(403, "You can only delete your own review");
        }
        await db_1.prisma.review.delete({ where: { id: req.params.reviewId } });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
