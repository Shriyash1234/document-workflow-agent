import test from "node:test";
import assert from "node:assert/strict";
import { ValidatorAgent } from "../src/agents/validatorAgent.js";
import { cleanExtractionFixture, messyExtractionFixture, testRules } from "./fixtures.js";

test("ValidatorAgent marks the clean fixture as matching", () => {
  const agent = new ValidatorAgent();
  const summary = agent.validate(cleanExtractionFixture, testRules);

  assert.equal(summary.counts.match, 8);
  assert.equal(summary.counts.mismatch, 0);
  assert.equal(summary.counts.uncertain, 0);
  assert.ok(summary.results.every((result) => result.result === "match"));
});

test("ValidatorAgent surfaces mismatches and uncertainty for the messy fixture", () => {
  const agent = new ValidatorAgent();
  const summary = agent.validate(messyExtractionFixture, testRules);

  assert.equal(summary.counts.match, 4);
  assert.equal(summary.counts.mismatch, 3);
  assert.equal(summary.counts.uncertain, 1);

  const byField = Object.fromEntries(summary.results.map((result) => [result.fieldKey, result]));
  assert.equal(byField.consignee_name.result, "mismatch");
  assert.equal(byField.hs_code.result, "mismatch");
  assert.equal(byField.gross_weight.result, "mismatch");
  assert.equal(byField.incoterms.result, "uncertain");
});
