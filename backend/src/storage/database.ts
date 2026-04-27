import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..", "..");

function resolveDatabasePath() {
  const configuredPath = process.env.DATABASE_PATH;
  if (!configuredPath) {
    return path.join(backendRoot, "data", "agentic-workflow.db");
  }

  return path.isAbsolute(configuredPath) ? configuredPath : path.resolve(backendRoot, configuredPath);
}

export const databasePath = resolveDatabasePath();

mkdirSync(path.dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    outcome TEXT,
    source_type TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT,
    raw_extraction_json TEXT,
    raw_validation_json TEXT,
    raw_decision_json TEXT
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    sample_path TEXT,
    size_bytes INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS extracted_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    field_key TEXT NOT NULL,
    value TEXT,
    confidence REAL,
    evidence TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS validation_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    field_key TEXT NOT NULL,
    result TEXT NOT NULL,
    found TEXT,
    expected TEXT,
    confidence REAL,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    outcome TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    amendment_draft TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS query_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    query_type TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_documents_run_id ON documents(run_id);
  CREATE INDEX IF NOT EXISTS idx_extracted_fields_run_id ON extracted_fields(run_id);
  CREATE INDEX IF NOT EXISTS idx_validation_results_run_id ON validation_results(run_id);
  CREATE INDEX IF NOT EXISTS idx_decisions_run_id ON decisions(run_id);
  CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at);
  CREATE INDEX IF NOT EXISTS idx_runs_outcome ON runs(outcome);
`);

export function getDatabaseStatus() {
  const row = db.prepare("SELECT COUNT(*) AS table_count FROM sqlite_master WHERE type = 'table'").get() as {
    table_count: number;
  };

  return {
    configured: true,
    path: databasePath,
    tableCount: row.table_count,
  };
}
