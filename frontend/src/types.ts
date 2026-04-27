export type ExtractedField = {
  value: string | null;
  confidence: number;
  evidence: string | null;
};

export type ExtractionResult = {
  documentType: string;
  fields: Record<string, ExtractedField>;
};

export type ValidationResult = {
  fieldKey: string;
  result: "match" | "mismatch" | "uncertain";
  found: string | null;
  expected: string | null;
  confidence: number;
  reason: string;
};

export type ValidationSummary = {
  customer: string;
  confidenceThreshold: number;
  results: ValidationResult[];
  counts: {
    match: number;
    mismatch: number;
    uncertain: number;
  };
};

export type DecisionResult = {
  outcome: "auto_approve" | "human_review" | "draft_amendment";
  reasoning: string;
  amendmentDraft: string | null;
  discrepancies: ValidationResult[];
};

export type StoredRun = {
  id: string;
  status: string;
  outcome: string | null;
  sourceType: string | null;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
  extraction: ExtractionResult | null;
  validation: ValidationSummary | null;
  decision: DecisionResult | null;
  documents: Array<{
    id: string;
    fileName: string;
    fileType: string | null;
    samplePath: string | null;
    sizeBytes: number | null;
    createdAt: string;
  }>;
};

export type QueryResult = {
  question: string;
  queryType: "llm_sql";
  sql: string;
  params: string[];
  explanation: string;
  answer: string;
  rows: Array<Record<string, unknown>>;
};

export type SampleOutput = {
  png: string;
  pdf: string;
};
