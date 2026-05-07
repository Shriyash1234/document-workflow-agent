import { z } from "zod";
import { documentTypeSchema, fieldKeySchema } from "./extraction.js";
import { extractionResultSchema } from "./extraction.js";
import { validationSummarySchema } from "./validation.js";

export const shipmentStatusSchema = z.enum(["incoming", "processing", "verified", "failed"]);
export const shipmentDecisionOutcomeSchema = z.enum(["approved", "needs_amendment", "human_review"]);
export const crossDocumentStatusSchema = z.enum(["match", "mismatch", "uncertain"]);

export const simulatedEmailAttachmentSchema = z.object({
  fileName: z.string(),
  samplePath: z.string(),
  previewUrl: z.string().optional(),
  documentType: documentTypeSchema,
});

export const simulatedEmailSchema = z.object({
  emailId: z.string(),
  from: z.string(),
  subject: z.string(),
  receivedAt: z.string(),
  customer: z.string(),
  status: shipmentStatusSchema,
  attachments: z.array(simulatedEmailAttachmentSchema).min(1),
});

export const crossDocumentValueSchema = z.object({
  documentType: documentTypeSchema,
  fileName: z.string(),
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  evidence: z.string().nullable(),
});

export const crossDocumentResultSchema = z.object({
  fieldKey: fieldKeySchema,
  result: crossDocumentStatusSchema,
  valuesByDocument: z.array(crossDocumentValueSchema),
  reason: z.string(),
});

export const shipmentDecisionSchema = z.object({
  outcome: shipmentDecisionOutcomeSchema,
  reasoning: z.string(),
  draftReply: z.string(),
});

export const shipmentDocumentResultSchema = z.object({
  documentId: z.string(),
  runId: z.string(),
  fileName: z.string(),
  samplePath: z.string().nullable(),
  previewUrl: z.string().nullable().optional(),
  documentType: documentTypeSchema,
  extraction: extractionResultSchema,
  validation: validationSummarySchema,
});

export const shipmentVerificationSchema = z.object({
  shipmentId: z.string(),
  email: simulatedEmailSchema,
  status: shipmentStatusSchema,
  errorMessage: z.string().nullable(),
  documents: z.array(shipmentDocumentResultSchema),
  crossDocumentResults: z.array(crossDocumentResultSchema),
  decision: shipmentDecisionSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;
export type ShipmentDecisionOutcome = z.infer<typeof shipmentDecisionOutcomeSchema>;
export type CrossDocumentStatus = z.infer<typeof crossDocumentStatusSchema>;
export type SimulatedEmailAttachment = z.infer<typeof simulatedEmailAttachmentSchema>;
export type SimulatedEmail = z.infer<typeof simulatedEmailSchema>;
export type CrossDocumentValue = z.infer<typeof crossDocumentValueSchema>;
export type CrossDocumentResult = z.infer<typeof crossDocumentResultSchema>;
export type ShipmentDecision = z.infer<typeof shipmentDecisionSchema>;
export type ShipmentDocumentResult = z.infer<typeof shipmentDocumentResultSchema>;
export type ShipmentVerification = z.infer<typeof shipmentVerificationSchema>;
