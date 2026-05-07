import { randomUUID } from "node:crypto";
import { db } from "./database.js";
import type { DecisionResult } from "../schemas/decision.js";
import type { ExtractionResult } from "../schemas/extraction.js";
import type { ValidationSummary } from "../schemas/validation.js";

export type RunSourceType = "sample" | "upload" | "email";

export type StoredRun = {
  id: string;
  status: string;
  outcome: string | null;
  sourceType: string | null;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
  extraction: ExtractionResult | null;
  validation: ValidationSummary | null;
  decision: DecisionResult | null;
  documents: Array<{
    id: string;
    fileName: string;
    fileType: string | null;
    samplePath: string | null;
    sizeBytes: number | null;
    createdAt: string;
  }>;
};

type RunRow = {
  id: string;
  status: string;
  outcome: string | null;
  source_type: string | null;
  created_at: string;
  updated_at: string;
  error_message: string | null;
  raw_extraction_json: string | null;
  raw_validation_json: string | null;
  raw_decision_json: string | null;
};

type DocumentRow = {
  id: string;
  file_name: string;
  file_type: string | null;
  sample_path: string | null;
  size_bytes: number | null;
  created_at: string;
};

export function createRun(sourceType: RunSourceType) {
  const id = randomUUID();
  db.prepare("INSERT INTO runs (id, status, source_type) VALUES (?, ?, ?)").run(id, "processing", sourceType);
  return id;
}

export function saveDocument(input: {
  runId: string;
  fileName: string;
  fileType: string;
  samplePath?: string;
  sizeBytes: number;
}) {
  const id = randomUUID();
  db.prepare(
    "INSERT INTO documents (id, run_id, file_name, file_type, sample_path, size_bytes) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, input.runId, input.fileName, input.fileType, input.samplePath ?? null, input.sizeBytes);
  return id;
}

export function saveExtraction(runId: string, extraction: ExtractionResult) {
  const statement = db.prepare(
    "INSERT INTO extracted_fields (run_id, field_key, value, confidence, evidence) VALUES (?, ?, ?, ?, ?)",
  );

  for (const [fieldKey, field] of Object.entries(extraction.fields)) {
    statement.run(runId, fieldKey, field.value, field.confidence, field.evidence);
  }
}

export function saveValidation(runId: string, validation: ValidationSummary) {
  const statement = db.prepare(
    "INSERT INTO validation_results (run_id, field_key, result, found, expected, confidence, reason) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );

  for (const result of validation.results) {
    statement.run(
      runId,
      result.fieldKey,
      result.result,
      result.found,
      result.expected,
      result.confidence,
      result.reason,
    );
  }
}

export function saveDecision(runId: string, decision: DecisionResult) {
  db.prepare("INSERT INTO decisions (run_id, outcome, reasoning, amendment_draft) VALUES (?, ?, ?, ?)").run(
    runId,
    decision.outcome,
    decision.reasoning,
    decision.amendmentDraft,
  );
}

export function completeRun(input: {
  runId: string;
  extraction: ExtractionResult;
  validation: ValidationSummary;
  decision: DecisionResult;
}) {
  db.prepare(
    `UPDATE runs
     SET status = ?, outcome = ?, updated_at = CURRENT_TIMESTAMP,
         raw_extraction_json = ?, raw_validation_json = ?, raw_decision_json = ?
     WHERE id = ?`,
  ).run(
    "completed",
    input.decision.outcome,
    JSON.stringify(input.extraction),
    JSON.stringify(input.validation),
    JSON.stringify(input.decision),
    input.runId,
  );
}

export function failRun(runId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown pipeline error";
  db.prepare("UPDATE runs SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    "failed",
    message,
    runId,
  );
}

export function getRun(runId: string): StoredRun | null {
  const run = db.prepare("SELECT * FROM runs WHERE id = ?").get(runId) as RunRow | undefined;
  if (!run) return null;

  const documents = db.prepare("SELECT * FROM documents WHERE run_id = ? ORDER BY created_at ASC").all(runId) as
    | DocumentRow[]
    | undefined;

  return {
    id: run.id,
    status: run.status,
    outcome: run.outcome,
    sourceType: run.source_type,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    errorMessage: run.error_message,
    extraction: parseJson<ExtractionResult>(run.raw_extraction_json),
    validation: parseJson<ValidationSummary>(run.raw_validation_json),
    decision: parseJson<DecisionResult>(run.raw_decision_json),
    documents: (documents ?? []).map((document) => ({
      id: document.id,
      fileName: document.file_name,
      fileType: document.file_type,
      samplePath: document.sample_path,
      sizeBytes: document.size_bytes,
      createdAt: document.created_at,
    })),
  };
}

function parseJson<T>(value: string | null) {
  return value ? (JSON.parse(value) as T) : null;
}
