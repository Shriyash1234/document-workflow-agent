import type { SqlPlan } from "../schemas/query.js";

const allowedTables = new Set([
  "runs",
  "documents",
  "extracted_fields",
  "validation_results",
  "decisions",
  "query_history",
]);

const forbiddenSqlPattern =
  /\b(insert|update|delete|drop|alter|create|replace|truncate|attach|detach|pragma|vacuum|reindex)\b/i;

export function validateSqlPlan(plan: SqlPlan): SqlPlan {
  const sql = normalizeSql(plan.sql);

  if (!sql.toLowerCase().startsWith("select ")) {
    throw new Error("Generated SQL was rejected because it is not a SELECT statement.");
  }

  if (forbiddenSqlPattern.test(sql)) {
    throw new Error("Generated SQL was rejected because it contains a forbidden SQL keyword.");
  }

  if (hasMultipleStatements(sql)) {
    throw new Error("Generated SQL was rejected because multiple statements are not allowed.");
  }

  validateTables(sql);

  return {
    ...plan,
    sql: ensureLimit(sql),
    params: plan.params.map((param) => String(param)),
  };
}

export function createFallbackAnswer(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return "No matching records were found.";
  }

  if (rows.length === 1 && "count" in rows[0]) {
    return `The query returned a count of ${String(rows[0].count)}.`;
  }

  return `The query returned ${rows.length} row(s). See rows for the grounded details.`;
}

function normalizeSql(sql: string) {
  return sql.trim().replace(/;+\s*$/, "");
}

function hasMultipleStatements(sql: string) {
  return sql.includes(";") || sql.includes("--") || sql.includes("/*") || sql.includes("*/");
}

function validateTables(sql: string) {
  const tableMatches = sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi);

  for (const match of tableMatches) {
    const tableName = match[1].toLowerCase();
    if (!allowedTables.has(tableName)) {
      throw new Error(`Generated SQL referenced a disallowed table: ${tableName}`);
    }
  }
}

function ensureLimit(sql: string) {
  const normalized = sql.toLowerCase();
  if (normalized.includes(" limit ") || /\bcount\s*\(/i.test(sql)) {
    return sql;
  }

  return `${sql} LIMIT 20`;
}
