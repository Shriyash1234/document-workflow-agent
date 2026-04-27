import test from "node:test";
import assert from "node:assert/strict";
import { createFallbackAnswer, validateSqlPlan } from "../src/agents/querySafety.js";

test("validateSqlPlan appends a limit to row-listing queries", () => {
  const plan = validateSqlPlan({
    sql: "SELECT id, outcome FROM runs ORDER BY created_at DESC",
    params: [],
    explanation: "List recent runs.",
  });

  assert.equal(plan.sql, "SELECT id, outcome FROM runs ORDER BY created_at DESC LIMIT 20");
});

test("validateSqlPlan keeps aggregate count queries unchanged", () => {
  const plan = validateSqlPlan({
    sql: "SELECT COUNT(*) AS count FROM runs",
    params: [],
    explanation: "Count runs.",
  });

  assert.equal(plan.sql, "SELECT COUNT(*) AS count FROM runs");
});

test("validateSqlPlan rejects disallowed SQL", () => {
  assert.throws(
    () =>
      validateSqlPlan({
        sql: "DELETE FROM runs",
        params: [],
        explanation: "Unsafe mutation.",
      }),
    /not a SELECT statement/,
  );

  assert.throws(
    () =>
      validateSqlPlan({
        sql: "SELECT * FROM users",
        params: [],
        explanation: "Unknown table.",
      }),
    /disallowed table/,
  );
});

test("createFallbackAnswer stays grounded in returned rows", () => {
  assert.equal(createFallbackAnswer([]), "No matching records were found.");
  assert.equal(createFallbackAnswer([{ count: 3 }]), "The query returned a count of 3.");
  assert.equal(
    createFallbackAnswer([{ id: "run_1" }, { id: "run_2" }]),
    "The query returned 2 row(s). See rows for the grounded details.",
  );
});
