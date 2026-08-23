"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET;
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
    name: zod_1.z.string().min(1),
});
router.post("/register", async (req, res, next) => {
    try {
        const { email, password, name } = registerSchema.parse(req.body);
        const existing = await db_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new errorHandler_1.HttpError(409, "An account with this email already exists");
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await db_1.prisma.user.create({
            data: { email, passwordHash, name },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
        res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
    }
    catch (err) {
        next(err);
    }
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await db_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new errorHandler_1.HttpError(401, "Invalid email or password");
        }
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid) {
            throw new errorHandler_1.HttpError(401, "Invalid email or password");
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    }
    catch (err) {
        next(err);
    }
});
router.get("/me", auth_1.authMiddleware, async (req, res, next) => {
    try {
        const user = await db_1.prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) {
            throw new errorHandler_1.HttpError(404, "User not found");
        }
        res.json({ user: { id: user.id, email: user.email, name: user.name } });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
