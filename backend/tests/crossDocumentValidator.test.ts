import test from "node:test";
import assert from "node:assert/strict";
import { CrossDocumentValidator } from "../src/services/crossDocumentValidator.js";
import type { DocumentType, ExtractionResult } from "../src/schemas/extraction.js";
import { cleanExtractionFixture } from "./fixtures.js";

function documentFixture(
  documentType: DocumentType,
  fileName: string,
  extraction: ExtractionResult = cleanExtractionFixture,
) {
  return {
    documentType,
    fileName,
    extraction: {
      ...extraction,
      documentType,
      fields: structuredClone(extraction.fields),
    },
  };
}

test("CrossDocumentValidator marks fields as matching when all document values agree", () => {
  const validator = new CrossDocumentValidator();
  const results = validator.validate([
    documentFixture("commercial_invoice", "commercial-invoice.pdf"),
    documentFixture("bill_of_lading", "bill-of-lading.pdf"),
    documentFixture("packing_list", "packing-list.pdf"),
  ]);

  assert.ok(results.length > 0);
  assert.ok(results.every((result) => result.result === "match"));
});

test("CrossDocumentValidator marks a field as mismatched when high-confidence values conflict", () => {
  const billOfLadingExtraction = structuredClone(cleanExtractionFixture);
  billOfLadingExtraction.fields.hs_code.value = "847141";
  billOfLadingExtraction.fields.hs_code.confidence = 0.96;
  billOfLadingExtraction.fields.hs_code.evidence = "HS Code: 847141";

  const validator = new CrossDocumentValidator();
  const results = validator.validate([
    documentFixture("commercial_invoice", "commercial-invoice.pdf"),
    documentFixture("bill_of_lading", "bill-of-lading.pdf", billOfLadingExtraction),
    documentFixture("packing_list", "packing-list.pdf"),
  ]);

  const hsCodeResult = results.find((result) => result.fieldKey === "hs_code");

  assert.equal(hsCodeResult?.result, "mismatch");
  assert.equal(hsCodeResult?.valuesByDocument.length, 3);
  assert.match(hsCodeResult?.reason ?? "", /conflict/i);
});

test("CrossDocumentValidator marks a field as uncertain when an important document is missing it", () => {
  const packingListExtraction = structuredClone(cleanExtractionFixture);
  packingListExtraction.fields.incoterms.value = null;
  packingListExtraction.fields.incoterms.confidence = 0.31;
  packingListExtraction.fields.incoterms.evidence = null;

  const validator = new CrossDocumentValidator();
  const results = validator.validate([
    documentFixture("commercial_invoice", "commercial-invoice.pdf"),
    documentFixture("bill_of_lading", "bill-of-lading.pdf"),
    documentFixture("packing_list", "packing-list.pdf", packingListExtraction),
  ]);

  const incotermsResult = results.find((result) => result.fieldKey === "incoterms");

  assert.equal(incotermsResult?.result, "uncertain");
  assert.match(incotermsResult?.reason ?? "", /missing|low-confidence/i);
});
