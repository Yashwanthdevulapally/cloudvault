/**
 * @swagger
 * /api/files/{id}/share:
 *   post:
 *     tags: [Files]
 *     summary: Create a shareable file link
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Share link created
 *       404:
 *         description: File not found
 *
 * /api/files/trash:
 *   get:
 *     tags: [Files]
 *     summary: Get deleted files
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of deleted files
 *
 * /api/files/{id}/restore:
 *   post:
 *     tags: [Files]
 *     summary: Restore a deleted file
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
 *         description: File restored
 *       404:
 *         description: File not found
 *
 * /api/files/{id}/permanent:
 *   delete:
 *     tags: [Files]
 *     summary: Permanently delete a file
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
 *         description: File permanently deleted
 *
 * /api/files/activity:
 *   get:
 *     tags: [Files]
 *     summary: Get file activity logs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity history
 *
 */

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File upload, download, search, trash and storage operations
 *
 * /api/files:
 *   get:
 *     tags: [Files]
 *     summary: Get user's active files
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of files
 *       401:
 *         description: Unauthorized
 *
 * /api/files/upload-url:
 *   post:
 *     tags: [Files]
 *     summary: Generate a presigned S3 upload URL
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - mimeType
 *               - size
 *             properties:
 *               filename:
 *                 type: string
 *               mimeType:
 *                 type: string
 *               size:
 *                 type: integer
 *               folderId:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Presigned S3 upload URL generated
 *       400:
 *         description: Invalid file information
 *       401:
 *         description: Unauthorized
 *
 * /api/files/upload-complete:
 *   post:
 *     tags: [Files]
 *     summary: Save metadata after S3 upload
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - s3Key
 *               - mimeType
 *               - size
 *             properties:
 *               filename:
 *                 type: string
 *               s3Key:
 *                 type: string
 *               mimeType:
 *                 type: string
 *               size:
 *                 type: integer
 *               folderId:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       201:
 *         description: File metadata saved
 *       400:
 *         description: Missing metadata
 *       401:
 *         description: Unauthorized
 *
 * /api/files/{id}/download:
 *   get:
 *     tags: [Files]
 *     summary: Generate a presigned S3 download URL
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
 *         description: Presigned download URL
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 *
 * /api/files/storage/stats:
 *   get:
 *     tags: [Files]
 *     summary: Get storage statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage statistics
 *       401:
 *         description: Unauthorized
 *
 * /api/files/search:
 *   get:
 *     tags: [Files]
 *     summary: Search user's files
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Matching files
 *       401:
 *         description: Unauthorized
 */


import express from "express";
import multer from "multer";
import crypto from "crypto";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import {
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";

import { env } from "../config/env";

import prisma from "../lib/prisma";
import redis from "../lib/redis";
import { invalidateStorageCache } from "../lib/cache";
import fs from "fs";

import {
  authenticate,
  AuthRequest,
} from "../middleware/auth";

import { logActivity } from "../utils/activityLogger";

const router = express.Router();

const sanitizeFilename = (filename: string) => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 200);
};

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "video/mp4",
  "audio/mpeg",
];

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("This file type is not allowed"));
    }
  },
});

const s3 = new S3Client({
  region: env.AWS_REGION,

  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});


// ======================================================
// STORAGE STATISTICS
// ======================================================

router.get(
  "/storage/stats",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const cacheKey = "storage:stats:" + userId;

      // Check Redis cache first
      const cachedStats = await redis.get(cacheKey);

      if (cachedStats) {
        console.log("⚡ Storage stats served from Redis");

        return res.json(JSON.parse(cachedStats));
      }

      // Cache miss → query PostgreSQL
      const result = await prisma.file.aggregate({
        where: {
          userId,
          deletedAt: null,
        },
        _sum: {
          size: true,
        },
        _count: {
          id: true,
        },
      });

      const response = {
        totalFiles: result._count.id,
        totalStorage: result._sum.size || 0,
        maxStorage: 1024 * 1024 * 1024,
      };

      // Store result in Redis for 30 seconds
      await redis.set(
        cacheKey,
        JSON.stringify(response),
        "EX",
        30
      );

      console.log("💾 Storage stats cached in Redis");

      return res.json(response);
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Failed to fetch storage statistics",
      });
    }
  }
);


// ======================================================
// UPLOAD FILE
// ======================================================

router.post(
  "/upload-url",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;

      const {
        filename,
        mimeType,
        size,
        folderId,
      } = req.body;

      if (
        typeof filename !== "string" ||
        !filename.trim()
      ) {
        return res.status(400).json({
          message: "Filename is required",
        });
      }

      if (
        typeof mimeType !== "string" ||
        !allowedMimeTypes.includes(mimeType)
      ) {
        return res.status(400).json({
          message: "This file type is not allowed",
        });
      }

      const fileSize = Number(size);

      if (
        !Number.isFinite(fileSize) ||
        fileSize <= 0 ||
        fileSize > 10 * 1024 * 1024
      ) {
        return res.status(400).json({
          message: "File size must be between 1 byte and 10 MB",
        });
      }

      const parsedFolderId = folderId
        ? Number(folderId)
        : null;

      if (parsedFolderId) {
        const folder = await prisma.folder.findFirst({
          where: {
            id: parsedFolderId,
            userId,
          },
        });

        if (!folder) {
          return res.status(404).json({
            message: "Folder not found",
          });
        }
      }

      const safeFilename = sanitizeFilename(
        filename.trim()
      );

      if (!safeFilename) {
        return res.status(400).json({
          message: "Invalid filename",
        });
      }

      const s3Key =
        Date.now() + "-" + crypto.randomBytes(8).toString("hex") + "-" + safeFilename;

      const command = new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET_NAME,
        Key: s3Key,
        ContentType: mimeType,
      });

      const uploadUrl = await getSignedUrl(
        s3,
        command,
        { expiresIn: 300 }
      );

      res.json({
        uploadUrl,
        s3Key,
        filename: safeFilename,
        mimeType,
        size: fileSize,
        folderId: parsedFolderId,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to create upload URL",
      });
    }
  }
);

router.post(
  "/upload-complete",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;

      const {
        filename,
        s3Key,
        mimeType,
        size,
        folderId,
      } = req.body;

      if (
        !filename ||
        !s3Key ||
        !mimeType ||
        !size
      ) {
        return res.status(400).json({
          message: "Missing file metadata",
        });
      }

      const fileSize = Number(size);

      const file = await prisma.file.create({
        data: {
          filename,
          s3Key,
          size: fileSize,
          mimeType,
          userId,
          folderId: folderId || null,
        },
      });

      await logActivity(
        userId,
        "FILE_UPLOADED",
        "Uploaded " + filename
      );

      await invalidateStorageCache(userId);

      res.status(201).json({
        message: "File uploaded successfully",
        file,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to save uploaded file",
      });
    }
  }
);


// ======================================================
// LIST ACTIVE FILES
// ======================================================

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

      const [files, total] = await Promise.all([
        prisma.file.findMany({
          where: {
            userId: userId,
            deletedAt: null,
          },

          include: {
            folder: true,
          },

          orderBy: {
            createdAt: "desc",
          },

          skip,
          take: limit,
        }),

        prisma.file.count({
          where: {
            userId: userId,
            deletedAt: null,
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        files,
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
        message: "Failed to fetch files",
      });
    }
  }
);


// ======================================================
// RENAME FILE
// ======================================================

router.patch(
  "/:id/rename",
  authenticate,

  async (req: AuthRequest, res) => {
    try {
      const fileId = Number(req.params.id);
      const userId = req.userId!;
      const newFilename = req.body.filename;

      if (
        typeof newFilename !== "string" ||
        !newFilename.trim()
      ) {
        return res.status(400).json({
          message: "Filename is required",
        });
      }

      const safeFilename = sanitizeFilename(
        newFilename.trim()
      );

      if (!safeFilename) {
        return res.status(400).json({
          message: "Invalid filename",
        });
      }

      const file = await prisma.file.findFirst({
        where: {
          id: fileId,
          userId: userId,
          deletedAt: null,
        },
      });

      if (!file) {
        return res.status(404).json({
          message: "File not found",
        });
      }

      const updatedFile = await prisma.file.update({
        where: {
          id: fileId,
        },

        data: {
          filename: safeFilename,
        },
      });

      await logActivity(
        userId,
        "FILE_RENAMED",
        `Renamed ${file.filename} to ${safeFilename}`
      );

      res.json({
        message: "File renamed successfully",
        file: updatedFile,
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to rename file",
      });
    }
  }
);


// ======================================================
// TRASH FILE
// ======================================================

router.patch(
  "/:id/trash",
  authenticate,

  async (req: AuthRequest, res) => {
    try {
      const fileId = Number(req.params.id);
      const userId = req.userId!;

      const file = await prisma.file.findFirst({
        where: {
          id: fileId,
          userId: userId,
          deletedAt: null,
        },
      });

      if (!file) {
        return res.status(404).json({
          message: "File not found",
        });
      }

      await prisma.file.update({
        where: {
          id: fileId,
        },

        data: {
          deletedAt: new Date(),
          shareToken: null,
          shareExpiresAt: null,
        },
      });

      await logActivity(
        userId,
        "FILE_TRASHED",
        "Moved " + file.filename + " to trash"
      );

      res.json({
        message: "File moved to trash",
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to move file to trash",
      });
    }
  }
);


// ======================================================
// GET TRASH
// ======================================================

router.get(
  "/trash/list",
  authenticate,

  async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;

      const files = await prisma.file.findMany({
        where: {
          userId: userId,
          deletedAt: {
            not: null,
          },
        },

        include: {
          folder: true,
        },

        orderBy: {
          deletedAt: "desc",
        },
      });

      res.json(files);

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to fetch trash",
      });
    }
  }
);


// ======================================================
// RESTORE FILE
// ======================================================

router.patch(
  "/:id/restore",
  authenticate,

  async (req: AuthRequest, res) => {
    try {
      const fileId = Number(req.params.id);
      const userId = req.userId!;

      const file = await prisma.file.findFirst({
        where: {
          id: fileId,
          userId: userId,
          deletedAt: {
            not: null,
          },
        },
      });

      if (!file) {
        return res.status(404).json({
          message: "File not found in trash",
        });
      }

      await prisma.file.update({
        where: {
          id: fileId,
        },

        data: {
          deletedAt: null,
        },
      });

      await logActivity(
        userId,
        "FILE_RESTORED",
        "Restored " + file.filename
      );

      res.json({
        message: "File restored successfully",
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to restore file",
      });
    }
  }
);


// ======================================================
// PERMANENT DELETE
// ======================================================

router.delete(
  "/:id/permanent",
  authenticate,

  async (req: AuthRequest, res) => {
    try {
      const fileId = Number(req.params.id);
      const userId = req.userId!;

      const file = await prisma.file.findFirst({
        where: {
          id: fileId,
          userId: userId,
          deletedAt: {
            not: null,
          },
        },
      });

      if (!file) {
        return res.status(404).json({
          message: "File not found in trash",
        });
      }

      await s3.send(
        new DeleteObjectCommand({
          Bucket: env.AWS_S3_BUCKET_NAME,
          Key: file.s3Key,
        })
      );

      await prisma.file.delete({
        where: {
          id: fileId,
        },
      });

      await logActivity(
        userId,
        "FILE_PERMANENTLY_DELETED",
        "Permanently deleted " + file.filename
      );

      await invalidateStorageCache(userId);

      res.json({
        message: "File permanently deleted",
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Permanent delete failed",
      });
    }
  }
);


// ======================================================
// CREATE SHARE LINK
// ======================================================

router.post(
  "/:id/share",
  authenticate,

  async (req: AuthRequest, res) => {
    try {
      const fileId = Number(req.params.id);
      const userId = req.userId!;

      const file = await prisma.file.findFirst({
        where: {
          id: fileId,
          userId: userId,
          deletedAt: null,
        },
      });

      if (!file) {
        return res.status(404).json({
          message: "File not found",
        });
      }

      const shareToken =
        crypto.randomBytes(32).toString("hex");

      const shareExpiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      );

      await prisma.file.update({
        where: {
          id: fileId,
        },

        data: {
          shareToken: shareToken,
          shareExpiresAt: shareExpiresAt,
        },
      });

      await logActivity(
        userId,
        "SHARE_CREATED",
        "Created share link for " + file.filename
      );

      const shareLink =
        "http://localhost:5173/share/" +
        shareToken;

      res.json({
        message: "Share link created successfully",
        shareLink: shareLink,
        expiresAt: shareExpiresAt,
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to create share link",
      });
    }
  }
);


// ======================================================
// DISABLE SHARE
// ======================================================

router.delete(
  "/:id/share",
  authenticate,

  async (req: AuthRequest, res) => {
    try {
      const fileId = Number(req.params.id);
      const userId = req.userId!;

      const file = await prisma.file.findFirst({
        where: {
          id: fileId,
          userId: userId,
        },
      });

      if (!file) {
        return res.status(404).json({
          message: "File not found",
        });
      }

      await prisma.file.update({
        where: {
          id: fileId,
        },

        data: {
          shareToken: null,
          shareExpiresAt: null,
        },
      });

      await logActivity(
        userId,
        "SHARE_REVOKED",
        "Revoked share link for " + file.filename
      );

      res.json({
        message: "Share link disabled",
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to disable share link",
      });
    }
  }
);


// ======================================================
// DOWNLOAD SHARED FILE
// ======================================================

router.get(
  "/shared/:token",

  async (req, res) => {
    try {
      const token = req.params.token;

      const file = await prisma.file.findUnique({
        where: {
          shareToken: token,
        },
      });

      if (!file) {
        return res.status(404).json({
          message: "Share link is invalid",
        });
      }

      if (file.deletedAt) {
        return res.status(404).json({
          message: "File is no longer available",
        });
      }

      if (
        file.shareExpiresAt &&
        file.shareExpiresAt < new Date()
      ) {
        return res.status(410).json({
          message: "Share link has expired",
        });
      }

      const downloadCommand = new GetObjectCommand({
        Bucket: env.AWS_S3_BUCKET_NAME,
        Key: file.s3Key,
      });

      const downloadUrl = await getSignedUrl(
        s3,
        downloadCommand,
        { expiresIn: 60 }
      );

      await logActivity(
        file.userId,
        "SHARED_FILE_DOWNLOADED",
        "Shared file downloaded: " + file.filename
      );

      return res.json({
        downloadUrl,
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Shared download failed",
      });
    }
  }
);


// ======================================================
// DOWNLOAD FILE
// ======================================================

router.get(
  "/:id/download",
  authenticate,

  async (req: AuthRequest, res) => {
    try {
      const fileId = Number(req.params.id);
      const userId = req.userId!;

      const file = await prisma.file.findFirst({
        where: {
          id: fileId,
          userId: userId,
          deletedAt: null,
        },
      });

      if (!file) {
        return res.status(404).json({
          message: "File not found",
        });
      }

      const downloadCommand = new GetObjectCommand({
        Bucket: env.AWS_S3_BUCKET_NAME,
        Key: file.s3Key,
      });

      const downloadUrl = await getSignedUrl(
        s3,
        downloadCommand,
        { expiresIn: 60 }
      );

      await logActivity(
        userId,
        "FILE_DOWNLOADED",
        "Downloaded " + file.filename
      );

      return res.json({
        downloadUrl,
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Download failed",
      });
    }
  }
);

export default router;
