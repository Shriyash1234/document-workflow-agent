import type { CustomerRules } from "../src/rules/customerRules.js";
import { extractionResultSchema, type ExtractionResult } from "../src/schemas/extraction.js";
import { validationSummarySchema, type ValidationSummary } from "../src/schemas/validation.js";

export const testRules: CustomerRules = {
  customer: "Atlas Retail India Pvt Ltd",
  description: "Fixture rules for deterministic validator and router tests.",
  confidenceThreshold: 0.75,
  expected: {
    consignee_name: "Atlas Retail India Pvt Ltd",
    hs_code: "847130",
    port_of_loading: "Shanghai, China",
    port_of_discharge: "Nhava Sheva, India",
    incoterms: "CIF Nhava Sheva, Incoterms 2020",
    description_of_goods: "Laptop computers and accessories",
    gross_weight: "1240 KG",
  },
  requiredFields: [
    "consignee_name",
    "hs_code",
    "port_of_loading",
    "port_of_discharge",
    "incoterms",
    "description_of_goods",
    "gross_weight",
    "invoice_number",
  ],
  criticalFields: [
    "consignee_name",
    "hs_code",
    "port_of_loading",
    "port_of_discharge",
    "incoterms",
    "gross_weight",
  ],
  presenceOnlyFields: ["invoice_number"],
};

export const cleanExtractionFixture: ExtractionResult = extractionResultSchema.parse({
  documentType: "commercial_invoice",
  fields: {
    consignee_name: {
      value: "Atlas Retail India Pvt Ltd",
      confidence: 0.98,
      evidence: "Consignee: Atlas Retail India Pvt Ltd",
    },
    hs_code: {
      value: "847130",
      confidence: 0.99,
      evidence: "HS Code 847130",
    },
    port_of_loading: {
      value: "Shanghai, China",
      confidence: 0.96,
      evidence: "Port of Loading: Shanghai, China",
    },
    port_of_discharge: {
      value: "Nhava Sheva, India",
      confidence: 0.97,
      evidence: "Port of Discharge: Nhava Sheva, India",
    },
    incoterms: {
      value: "CIF Nhava Sheva, Incoterms 2020",
      confidence: 0.95,
      evidence: "Terms: CIF Nhava Sheva, Incoterms 2020",
    },
    description_of_goods: {
      value: "Laptop computers and accessories",
      confidence: 0.94,
      evidence: "Description: Laptop computers and accessories",
    },
    gross_weight: {
      value: "1240 KG",
      confidence: 0.97,
      evidence: "Gross Weight: 1240 KG",
    },
    invoice_number: {
      value: "INV-2026-0418",
      confidence: 0.99,
      evidence: "Invoice Number: INV-2026-0418",
    },
  },
});

export const messyExtractionFixture: ExtractionResult = extractionResultSchema.parse({
  documentType: "commercial_invoice",
  fields: {
    consignee_name: {
      value: "Atlas Retail Imports Pvt Ltd",
      confidence: 0.97,
      evidence: "Consignee: Atlas Retail Imports Pvt Ltd",
    },
    hs_code: {
      value: "847141",
      confidence: 0.96,
      evidence: "HS Code 847141",
    },
    port_of_loading: {
      value: "Shanghai, China",
      confidence: 0.94,
      evidence: "Port of Loading: Shanghai, China",
    },
    port_of_discharge: {
      value: "Nhava Sheva, India",
      confidence: 0.95,
      evidence: "Port of Discharge: Nhava Sheva, India",
    },
    incoterms: {
      value: null,
      confidence: 0.42,
      evidence: null,
    },
    description_of_goods: {
      value: "Laptop computers and accessories",
      confidence: 0.92,
      evidence: "Description: Laptop computers and accessories",
    },
    gross_weight: {
      value: "1290 KG",
      confidence: 0.97,
      evidence: "Gross Weight: 1290 KG",
    },
    invoice_number: {
      value: "INV-2026-0418",
      confidence: 0.98,
      evidence: "Invoice Number: INV-2026-0418",
    },
  },
});

export function createValidationSummary(results: ValidationSummary["results"]): ValidationSummary {
  return validationSummarySchema.parse({
    customer: testRules.customer,
    confidenceThreshold: testRules.confidenceThreshold,
    results,
    counts: {
      match: results.filter((result) => result.result === "match").length,
      mismatch: results.filter((result) => result.result === "mismatch").length,
      uncertain: results.filter((result) => result.result === "uncertain").length,
    },
  });
}
