import { z } from "zod";
import { validationResultSchema } from "./validation.js";

export const decisionOutcomeSchema = z.enum(["auto_approve", "human_review", "draft_amendment"]);

export const decisionResultSchema = z.object({
  outcome: decisionOutcomeSchema,
  reasoning: z.string(),
  amendmentDraft: z.string().nullable(),
  discrepancies: z.array(validationResultSchema),
});

export type DecisionOutcome = z.infer<typeof decisionOutcomeSchema>;
export type DecisionResult = z.infer<typeof decisionResultSchema>;
