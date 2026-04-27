import cors from "cors";
import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import morgan from "morgan";
import { QueryAgent } from "./agents/queryAgent.js";
import { loadCustomerRules } from "./rules/customerRules.js";
import { runSamplePipeline } from "./services/pipelineService.js";
import { loadSamplesManifest } from "./services/sampleDocuments.js";
import { getDatabaseStatus } from "./storage/database.js";
import { getRun } from "./storage/runRepository.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const queryAgent = new QueryAgent();

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
    const manifest = await loadSamplesManifest();

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

app.post("/api/runs/sample", async (request: Request, response: Response, next: NextFunction) => {
  try {
    const samplePath = request.body?.samplePath;
    if (typeof samplePath !== "string" || samplePath.trim().length === 0) {
      response.status(400).json({
        ok: false,
        error: "samplePath is required.",
      });
      return;
    }

    const run = await runSamplePipeline(samplePath);

    response.status(201).json({
      ok: true,
      run,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/runs/:id", (request: Request, response: Response) => {
  const runId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  const run = getRun(runId);
  if (!run) {
    response.status(404).json({
      ok: false,
      error: "Run not found",
    });
    return;
  }

  response.json({
    ok: true,
    run,
  });
});

app.post("/api/query", async (request: Request, response: Response, next: NextFunction) => {
  try {
    const question = request.body?.question;
    if (typeof question !== "string" || question.trim().length === 0) {
      response.status(400).json({
        ok: false,
        error: "question is required.",
      });
      return;
    }

    const result = await queryAgent.answer(question);

    response.json({
      ok: true,
      result,
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
