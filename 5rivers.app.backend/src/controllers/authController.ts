import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export async function login(req: Request, res: Response, next: NextFunction) {
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
    if (!user || user.password !== password) {
      console.error(user);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { userId: user.userId, email: user.email },
      JWT_SECRET,
      {
        expiresIn: "2h",
      }
    );
    res.json({ token });
  } catch (error) {
    next(error);
  }
}
