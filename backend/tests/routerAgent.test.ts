import test from "node:test";
import assert from "node:assert/strict";
import { RouterAgent } from "../src/agents/routerAgent.js";
import { ValidatorAgent } from "../src/agents/validatorAgent.js";
import { cleanExtractionFixture, createValidationSummary, messyExtractionFixture, testRules } from "./fixtures.js";

test("RouterAgent auto-approves a fully matching validation summary", () => {
  const validation = new ValidatorAgent().validate(cleanExtractionFixture, testRules);
  const decision = new RouterAgent().decide(validation, testRules);

  assert.equal(decision.outcome, "auto_approve");
  assert.equal(decision.amendmentDraft, null);
  assert.equal(decision.discrepancies.length, 0);
});

test("RouterAgent drafts an amendment when critical issues exist", () => {
  const validation = new ValidatorAgent().validate(messyExtractionFixture, testRules);
  const decision = new RouterAgent().decide(validation, testRules);

  assert.equal(decision.outcome, "draft_amendment");
  assert.ok(decision.amendmentDraft?.includes("Consignee name"));
  assert.ok(decision.amendmentDraft?.includes("HS code"));
  assert.ok(decision.amendmentDraft?.includes("Gross weight"));
  assert.equal(decision.discrepancies.length, 4);
});

test("RouterAgent sends non-critical issues to human review", () => {
  const validation = createValidationSummary([
    {
      fieldKey: "description_of_goods",
      result: "mismatch",
      found: "Laptop accessories bundle",
      expected: "Laptop computers and accessories",
      confidence: 0.94,
      reason: "Extracted value conflicts with the configured customer rule.",
    },
    {
      fieldKey: "invoice_number",
      result: "uncertain",
      found: "INV-2026-0418",
      expected: null,
      confidence: 0.6,
      reason: "Extraction confidence 0.6 is below threshold 0.75.",
    },
  ]);

  const decision = new RouterAgent().decide(validation, testRules);

  assert.equal(decision.outcome, "human_review");
  assert.equal(decision.amendmentDraft, null);
  assert.equal(decision.discrepancies.length, 2);
});
