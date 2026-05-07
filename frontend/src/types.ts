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

export type SimulatedEmailAttachment = {
  fileName: string;
  samplePath: string;
  previewUrl?: string;
  documentType: string;
};

export type SimulatedEmail = {
  emailId: string;
  from: string;
  subject: string;
  receivedAt: string;
  customer: string;
  status: "incoming" | "processing" | "verified" | "failed";
  attachments: SimulatedEmailAttachment[];
};

export type InboxEmail = SimulatedEmail & {
  latestShipment: ShipmentVerification | null;
};

export type CrossDocumentValue = {
  documentType: string;
  fileName: string;
  value: string | null;
  confidence: number;
  evidence: string | null;
};

export type CrossDocumentResult = {
  fieldKey: string;
  result: "match" | "mismatch" | "uncertain";
  valuesByDocument: CrossDocumentValue[];
  reason: string;
};

export type ShipmentDecision = {
  outcome: "approved" | "needs_amendment" | "human_review";
  reasoning: string;
  draftReply: string;
};

export type ShipmentDocumentResult = {
  documentId: string;
  runId: string;
  fileName: string;
  samplePath: string | null;
  previewUrl?: string | null;
  documentType: string;
  extraction: ExtractionResult;
  validation: ValidationSummary;
};

export type ShipmentVerification = {
  shipmentId: string;
  email: SimulatedEmail;
  status: "incoming" | "processing" | "verified" | "failed";
  errorMessage: string | null;
  documents: ShipmentDocumentResult[];
  crossDocumentResults: CrossDocumentResult[];
  decision: ShipmentDecision | null;
  createdAt: string;
  updatedAt: string;
};
