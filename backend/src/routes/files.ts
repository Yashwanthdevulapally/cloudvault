
import express from "express";
import multer from "multer";
import crypto from "crypto";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import prisma from "../lib/prisma";
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
  region: process.env.AWS_REGION,

  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});


// ======================================================
// UPLOAD FILE
// ======================================================

router.post(
  "/upload",
  authenticate,
  upload.single("file"),

  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
        });
      }

      const userId = req.userId!;

      const folderId = req.body.folderId
        ? Number(req.body.folderId)
        : null;

      if (folderId) {
        const folder = await prisma.folder.findFirst({
          where: {
            id: folderId,
            userId: userId,
          },
        });

        if (!folder) {
          return res.status(404).json({
            message: "Folder not found",
          });
        }
      }

      const fileBuffer = fs.readFileSync(req.file.path);

      const safeFilename = sanitizeFilename(
        req.file.originalname
      );

      const s3Key =
        Date.now() + "-" + safeFilename;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: req.file.mimetype,
        })
      );

      const file = await prisma.file.create({
        data: {
          filename: safeFilename,
          s3Key: s3Key,
          size: req.file.size,
          mimeType: req.file.mimetype,
          userId: userId,
          folderId: folderId,
        },
      });

      fs.unlinkSync(req.file.path);

      await logActivity(
        userId,
        "FILE_UPLOADED",
        "Uploaded " + safeFilename
      );

      res.status(201).json({
        message: "File uploaded successfully",
        file: file,
      });

    } catch (error) {
      console.error(error);

      if (
        req.file?.path &&
        fs.existsSync(req.file.path)
      ) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        message: "S3 upload failed",
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

      const files = await prisma.file.findMany({
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
      });

      res.json(files);

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to fetch files",
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
          Bucket: process.env.AWS_S3_BUCKET_NAME,
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

      const result = await s3.send(
        new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: file.s3Key,
        })
      );

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=\"" +
        file.filename +
        "\""
      );

      res.setHeader(
        "Content-Type",
        file.mimeType
      );

      if (result.Body) {
        const body = result.Body as any;
        const chunks: Buffer[] = [];

        for await (const chunk of body) {
          chunks.push(Buffer.from(chunk));
        }

        res.send(Buffer.concat(chunks));

        await logActivity(
          file.userId,
          "SHARED_FILE_DOWNLOADED",
          "Shared file downloaded: " +
          file.filename
        );
      }

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

      const result = await s3.send(
        new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: file.s3Key,
        })
      );

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=\"" +
        file.filename +
        "\""
      );

      res.setHeader(
        "Content-Type",
        file.mimeType
      );

      if (result.Body) {
        const body = result.Body as any;
        const chunks: Buffer[] = [];

        for await (const chunk of body) {
          chunks.push(Buffer.from(chunk));
        }

        res.send(Buffer.concat(chunks));

        await logActivity(
          userId,
          "FILE_DOWNLOADED",
          "Downloaded " + file.filename
        );
      }

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Download failed",
      });
    }
  }
);

export default router;
