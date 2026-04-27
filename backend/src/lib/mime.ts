import path from "node:path";

const mimeTypesByExtension: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export function getMimeType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = mimeTypesByExtension[extension];

  if (!mimeType) {
    throw new Error(`Unsupported document type: ${extension || "unknown"}`);
  }

  return mimeType;
}
