import { z } from "zod";

export const sqlPlanSchema = z.object({
  sql: z.string(),
  params: z.array(z.string()),
  explanation: z.string(),
});

export const queryResultSchema = z.object({
  question: z.string(),
  queryType: z.literal("llm_sql"),
  sql: z.string(),
  params: z.array(z.string()),
  explanation: z.string(),
  answer: z.string(),
  rows: z.array(z.record(z.string(), z.unknown())),
});

export type SqlPlan = z.infer<typeof sqlPlanSchema>;
export type QueryResult = z.infer<typeof queryResultSchema>;
