import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { getMimeType } from "../lib/mime.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..", "..");
const uploadsRoot = path.join(backendRoot, "uploads");

mkdirSync(uploadsRoot, { recursive: true });

const allowedMimeTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, uploadsRoot);
  },
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error("Unsupported upload type. Use PDF, PNG, JPG, JPEG, or WEBP."));
      return;
    }

    try {
      getMimeType(file.originalname);
      callback(null, true);
    } catch (error) {
      callback(error as Error);
    }
  },
});

export function uploadedFileToPipelineDocument(file: Express.Multer.File) {
  return {
    absolutePath: file.path,
    fileName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
  };
}
