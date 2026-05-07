import test from "node:test";
import assert from "node:assert/strict";
import { createShipmentDecision } from "../src/services/shipmentDecisionService.js";
import type { CrossDocumentResult } from "../src/schemas/shipment.js";
import { testRules } from "./fixtures.js";

function crossResult(
  fieldKey: CrossDocumentResult["fieldKey"],
  result: CrossDocumentResult["result"],
): CrossDocumentResult {
  return {
    fieldKey,
    result,
    valuesByDocument: [
      {
        documentType: "commercial_invoice",
        fileName: "commercial-invoice.pdf",
        value: result === "uncertain" ? null : "847130",
        confidence: result === "uncertain" ? 0.31 : 0.98,
        evidence: result === "uncertain" ? null : "HS Code: 847130",
      },
      {
        documentType: "bill_of_lading",
        fileName: "bill-of-lading.pdf",
        value: result === "mismatch" ? "847141" : "847130",
        confidence: 0.96,
        evidence: result === "mismatch" ? "HS Code: 847141" : "HS Code: 847130",
      },
    ],
    reason:
      result === "match"
        ? "All high-confidence document values match."
        : "High-confidence values conflict across documents.",
  };
}

test("createShipmentDecision approves a shipment when every cross-document field matches", () => {
  const decision = createShipmentDecision(
    testRules.customer,
    [
      crossResult("consignee_name", "match"),
      crossResult("hs_code", "match"),
      crossResult("gross_weight", "match"),
    ],
    testRules,
  );

  assert.equal(decision.outcome, "approved");
  assert.match(decision.draftReply, /Documents verified for shipment/);
});

test("createShipmentDecision requests amendment for a critical cross-document mismatch", () => {
  const decision = createShipmentDecision(
    testRules.customer,
    [crossResult("hs_code", "mismatch"), crossResult("invoice_number", "match")],
    testRules,
  );

  assert.equal(decision.outcome, "needs_amendment");
  assert.match(decision.reasoning, /critical/i);
  assert.match(decision.draftReply, /HS code/);
  assert.match(decision.draftReply, /commercial-invoice\.pdf/);
  assert.match(decision.draftReply, /bill-of-lading\.pdf/);
});

test("createShipmentDecision routes uncertainty to human review when there is no critical mismatch", () => {
  const decision = createShipmentDecision(
    testRules.customer,
    [crossResult("invoice_number", "uncertain"), crossResult("hs_code", "match")],
    testRules,
  );

  assert.equal(decision.outcome, "human_review");
  assert.match(decision.reasoning, /uncertain/i);
  assert.match(decision.draftReply, /review/i);
});
