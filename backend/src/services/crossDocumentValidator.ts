import { normalizeComparable } from "../lib/normalize.js";
import type { DocumentType, ExtractionResult, FieldKey } from "../schemas/extraction.js";
import type { CrossDocumentResult, CrossDocumentValue } from "../schemas/shipment.js";

const CROSS_DOCUMENT_FIELDS: FieldKey[] = [
  "consignee_name",
  "hs_code",
  "port_of_loading",
  "port_of_discharge",
  "incoterms",
  "gross_weight",
  "invoice_number",
];

export type CrossDocumentInput = {
  documentType: DocumentType;
  fileName: string;
  extraction: ExtractionResult;
};

export class CrossDocumentValidator {
  constructor(private readonly confidenceThreshold = 0.75) {}

  validate(documents: CrossDocumentInput[]): CrossDocumentResult[] {
    return CROSS_DOCUMENT_FIELDS.map((fieldKey) => this.validateField(fieldKey, documents));
  }

  private validateField(fieldKey: FieldKey, documents: CrossDocumentInput[]): CrossDocumentResult {
    const valuesByDocument = documents.map((document): CrossDocumentValue => {
      const field = document.extraction.fields[fieldKey];

      return {
        documentType: document.documentType,
        fileName: document.fileName,
        value: field.value,
        confidence: field.confidence,
        evidence: field.evidence,
      };
    });

    const highConfidenceValues = valuesByDocument.filter(
      (value) => value.value !== null && value.confidence >= this.confidenceThreshold,
    );
    const normalizedValues = new Set(highConfidenceValues.map((value) => normalizeComparable(value.value ?? "")));
    const hasMissingOrLowConfidenceValue = valuesByDocument.some(
      (value) => value.value === null || value.confidence < this.confidenceThreshold,
    );

    if (highConfidenceValues.length >= 2 && normalizedValues.size > 1) {
      return {
        fieldKey,
        result: "mismatch",
        valuesByDocument,
        reason: "High-confidence values conflict across documents.",
      };
    }

    if (highConfidenceValues.length === 0 || hasMissingOrLowConfidenceValue) {
      return {
        fieldKey,
        result: "uncertain",
        valuesByDocument,
        reason: "At least one important document has a missing or low-confidence value.",
      };
    }

    return {
      fieldKey,
      result: "match",
      valuesByDocument,
      reason: "All high-confidence document values match.",
    };
  }
}
