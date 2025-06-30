"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
async function login(req, res, next) {
    try {
        const { loginId, password } = req.body;
        if (!loginId || !password) {
            return res
                .status(400)
                .json({ error: "Email/User ID and password are required" });
        }
        // Find user by userId or email
        const user = await prisma.user.findFirst({
            where: {
                OR: [{ userId: loginId }, { email: loginId }],
            },
        });
        console.log('user', user);
        if (!user || user.password !== password) {
            console.error(user);
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.userId, email: user.email }, JWT_SECRET, {
            expiresIn: "2h",
        });
        res.json({ token });
    }
    catch (error) {
        next(error);
    }
}
