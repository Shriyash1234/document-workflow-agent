import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getMimeType } from "../lib/mime.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..", "..");
const workspaceRoot = path.resolve(backendRoot, "..");
const samplesRoot = path.join(workspaceRoot, "samples");
export const samplesManifestPath = path.join(samplesRoot, "manifest.json");

type SampleManifestOutput = {
  html: string;
  png: string;
  pdf: string;
};

export type SampleManifest = {
  generatedAt: string;
  cleanShipment: Record<string, unknown>;
  messyShipmentNotes: {
    purpose: string;
    mismatches: string[];
  };
  outputs: SampleManifestOutput[];
};

export type ResolvedSampleDocument = {
  samplePath: string;
  absolutePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export async function loadSamplesManifest(): Promise<SampleManifest> {
  const manifestText = await readFile(samplesManifestPath, "utf8");
  return JSON.parse(manifestText) as SampleManifest;
}

export async function resolveSampleDocument(samplePath: string): Promise<ResolvedSampleDocument> {
  const normalizedSamplePath = samplePath.replaceAll("\\", "/").replace(/^samples\//, "");
  const manifest = await loadSamplesManifest();
  const allowedPaths = new Set(manifest.outputs.flatMap((output) => [output.pdf, output.png]));

  if (!allowedPaths.has(normalizedSamplePath)) {
    throw new Error(`Sample path is not in the manifest: ${samplePath}`);
  }

  const absolutePath = path.resolve(samplesRoot, normalizedSamplePath);
  if (!absolutePath.startsWith(samplesRoot)) {
    throw new Error("Resolved sample path escaped the samples directory.");
  }

  const fileStats = await stat(absolutePath);

  return {
    samplePath: normalizedSamplePath,
    absolutePath,
    fileName: path.basename(absolutePath),
    mimeType: getMimeType(absolutePath),
    sizeBytes: fileStats.size,
  };
}

export async function resolveSamplePreview(samplePath: string): Promise<ResolvedSampleDocument> {
  const normalizedSamplePath = samplePath.replaceAll("\\", "/").replace(/^samples\//, "");
  const manifest = await loadSamplesManifest();
  const output = manifest.outputs.find((candidate) =>
    [candidate.pdf, candidate.png].includes(normalizedSamplePath),
  );

  if (!output) {
    throw new Error(`Sample preview path is not in the manifest: ${samplePath}`);
  }

  return resolveSampleDocument(output.png);
}

export function createSamplePreviewUrl(samplePath: string) {
  return `/api/sample-preview?samplePath=${encodeURIComponent(samplePath)}`;
}
