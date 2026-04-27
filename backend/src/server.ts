import cors from "cors";
import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import morgan from "morgan";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCustomerRules } from "./rules/customerRules.js";
import { getDatabaseStatus } from "./storage/database.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(backendRoot, "..");
const samplesManifestPath = path.join(workspaceRoot, "samples", "manifest.json");

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(morgan("dev"));
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request: Request, response: Response) => {
  response.json({
    ok: true,
    service: "agentic-workflow-backend",
    environment: process.env.NODE_ENV ?? "development",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    database: getDatabaseStatus(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/samples", async (_request: Request, response: Response, next: NextFunction) => {
  try {
    const manifestText = await readFile(samplesManifestPath, "utf8");
    const manifest = JSON.parse(manifestText);

    response.json({
      ok: true,
      samplesRoot: "samples",
      manifest,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/rules/customer", async (_request: Request, response: Response, next: NextFunction) => {
  try {
    const rules = await loadCustomerRules();

    response.json({
      ok: true,
      rules,
    });
  } catch (error) {
    next(error);
  }
});

app.use((_request: Request, response: Response) => {
  response.status(404).json({
    ok: false,
    error: "Route not found",
  });
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : "Unknown server error";
  response.status(500).json({
    ok: false,
    error: message,
  });
});

app.listen(port, () => {
  console.log(`Agentic workflow backend running at http://localhost:${port}`);
});
