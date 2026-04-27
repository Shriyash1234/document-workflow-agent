import type { CustomerRules, FieldKey } from "../rules/customerRules.js";
import type { ExtractionResult } from "../schemas/extraction.js";
import type { ValidationResult, ValidationSummary } from "../schemas/validation.js";
import { validationSummarySchema } from "../schemas/validation.js";
import { valuesMatch } from "../lib/normalize.js";

export class ValidatorAgent {
  validate(extraction: ExtractionResult, rules: CustomerRules): ValidationSummary {
    const results = rules.requiredFields.map((fieldKey) => this.validateField(fieldKey, extraction, rules));
    const counts = {
      match: results.filter((result) => result.result === "match").length,
      mismatch: results.filter((result) => result.result === "mismatch").length,
      uncertain: results.filter((result) => result.result === "uncertain").length,
    };

    return validationSummarySchema.parse({
      customer: rules.customer,
      confidenceThreshold: rules.confidenceThreshold,
      results,
      counts,
    });
  }

  private validateField(fieldKey: FieldKey, extraction: ExtractionResult, rules: CustomerRules): ValidationResult {
    const extractedField = extraction.fields[fieldKey];
    const found = extractedField.value?.trim() || null;
    const expected = rules.expected[fieldKey] ?? null;
    const confidence = extractedField.confidence;

    if (!found) {
      return {
        fieldKey,
        result: "uncertain",
        found,
        expected,
        confidence,
        reason: "Field was missing or unreadable in the document.",
      };
    }

    if (confidence < rules.confidenceThreshold) {
      return {
        fieldKey,
        result: "uncertain",
        found,
        expected,
        confidence,
        reason: `Extraction confidence ${confidence} is below threshold ${rules.confidenceThreshold}.`,
      };
    }

    if (rules.presenceOnlyFields.includes(fieldKey)) {
      return {
        fieldKey,
        result: "match",
        found,
        expected,
        confidence,
        reason: "Field is required for presence only and was found with sufficient confidence.",
      };
    }

    if (!expected) {
      return {
        fieldKey,
        result: "uncertain",
        found,
        expected,
        confidence,
        reason: "No expected rule was configured for this required field.",
      };
    }

    if (valuesMatch(found, expected)) {
      return {
        fieldKey,
        result: "match",
        found,
        expected,
        confidence,
        reason: "Extracted value matches the configured customer rule.",
      };
    }

    return {
      fieldKey,
      result: "mismatch",
      found,
      expected,
      confidence,
      reason: "Extracted value conflicts with the configured customer rule.",
    };
  }
}
