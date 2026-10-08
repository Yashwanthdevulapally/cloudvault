/**
 * @swagger
 * tags:
 *   name: Folders
 *   description: Folder management
 *
 * /api/folders:
 *   get:
 *     tags: [Folders]
 *     summary: Get user's folders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of folders
 *
 *   post:
 *     tags: [Folders]
 *     summary: Create a folder
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Folder created
 *
 * /api/folders/{id}:
 *   delete:
 *     tags: [Folders]
 *     summary: Delete a folder
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Folder deleted
 *       404:
 *         description: Folder not found
 */

import express from "express";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = express.Router();

// Create folder
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    const userId = req.userId!;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Folder name is required",
      });
    }

    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        userId,
      },
    });

    res.status(201).json({
      message: "Folder created successfully",
      folder,
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "P2002") {
      return res.status(400).json({
        message: "A folder with this name already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create folder",
    });
  }
});

// Get user's folders
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const folders = await prisma.folder.findMany({
      where: {
        userId,
      },
      include: {
        _count: {
          select: {
            files: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(folders);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch folders",
    });
  }
});

// Delete folder
router.delete(
  "/:id",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const folderId = Number(req.params.id);
      const userId = req.userId!;

      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId,
        },
      });

      if (!folder) {
        return res.status(404).json({
          message: "Folder not found",
        });
      }

      await prisma.folder.delete({
        where: {
          id: folderId,
        },
      });

      res.json({
        message: "Folder deleted successfully",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to delete folder",
      });
    }
  }
);

export default router;