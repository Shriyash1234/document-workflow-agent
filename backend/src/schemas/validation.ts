import { z } from "zod";
import { fieldKeySchema } from "./extraction.js";

export const validationStatusSchema = z.enum(["match", "mismatch", "uncertain"]);

export const validationResultSchema = z.object({
  fieldKey: fieldKeySchema,
  result: validationStatusSchema,
  found: z.string().nullable(),
  expected: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export const validationSummarySchema = z.object({
  customer: z.string(),
  confidenceThreshold: z.number().min(0).max(1),
  results: z.array(validationResultSchema),
  counts: z.object({
    match: z.number().int().nonnegative(),
    mismatch: z.number().int().nonnegative(),
    uncertain: z.number().int().nonnegative(),
  }),
});

export type ValidationStatus = z.infer<typeof validationStatusSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type ValidationSummary = z.infer<typeof validationSummarySchema>;
