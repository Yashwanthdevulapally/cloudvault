import express from "express";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get(
  "/",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;

      const activities = await prisma.activityLog.findMany({
        where: {
          userId: userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      });

      res.json(activities);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to fetch activity logs",
      });
    }
  }
);

export default router;