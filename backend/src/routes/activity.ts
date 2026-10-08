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

      const page = Math.max(
        Number(req.query.page) || 1,
        1
      );

      const limit = Math.min(
        Math.max(Number(req.query.limit) || 10, 1),
        50
      );

      const skip = (page - 1) * limit;

      const [activities, total] = await Promise.all([
        prisma.activityLog.findMany({
          where: {
            userId: userId,
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        }),

        prisma.activityLog.count({
          where: {
            userId: userId,
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to fetch activity logs",
      });
    }
  }
);

export default router;
