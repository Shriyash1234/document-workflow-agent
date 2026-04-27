import { Type } from "@google/genai";
import { generateGeminiContent } from "../llm/geminiClient.js";
import { createFallbackAnswer, validateSqlPlan } from "./querySafety.js";
import { queryResultSchema, sqlPlanSchema, type QueryResult, type SqlPlan } from "../schemas/query.js";
import { db } from "../storage/database.js";

const schemaDictionary = `
Database dialect: SQLite.

Tables and columns:

runs
- id: pipeline run id
- status: processing, completed, or failed
- outcome: auto_approve, human_review, or draft_amendment
- source_type: sample or upload
- created_at: when the run was created
- updated_at: when the run was last updated
- error_message: failure reason when status is failed
- raw_extraction_json: full extractor output JSON
- raw_validation_json: full validator output JSON
- raw_decision_json: full router output JSON

documents
- id: document row id
- run_id: foreign key to runs.id
- file_name: uploaded or sample file name
- file_type: MIME type
- sample_path: sample document path when source_type is sample
- size_bytes: document size
- created_at: when document row was stored

extracted_fields
- run_id: foreign key to runs.id
- field_key: consignee_name, hs_code, port_of_loading, port_of_discharge, incoterms, description_of_goods, gross_weight, invoice_number
- value: extracted field value
- confidence: extraction confidence from 0 to 1
- evidence: source snippet from the document
- created_at: when field row was stored

validation_results
- run_id: foreign key to runs.id
- field_key: same field keys as extracted_fields
- result: match, mismatch, or uncertain
- found: extracted value used for validation
- expected: expected value from customer rules
- confidence: extraction confidence used by validation
- reason: validation explanation
- created_at: when validation row was stored

decisions
- run_id: foreign key to runs.id
- outcome: auto_approve, human_review, or draft_amendment
- reasoning: router explanation
- amendment_draft: generated amendment request when outcome is draft_amendment
- created_at: when decision row was stored

query_history
- question: operator question
- answer: grounded answer returned by the query agent
- query_type: query agent strategy, usually llm_sql
- created_at: when question was asked

Business definitions:
- flagged shipment means runs.outcome is human_review or draft_amendment.
- approved shipment means runs.outcome is auto_approve.
- pending review means runs.outcome is human_review or draft_amendment.
- this week can be answered as created_at >= datetime('now', '-7 days') for this POC.
- shipment can be approximated as one pipeline run.
- document can be counted from documents.
- for invoice-specific questions, use the latest run containing that invoice_number unless the user explicitly asks for all runs.
- for discrepancy or mismatch questions, include validation_results.result IN ('mismatch', 'uncertain') because uncertain fields are also surfaced for review.
`.trim();

const sqlPlanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    sql: { type: Type.STRING },
    params: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    explanation: { type: Type.STRING },
  },
  required: ["sql", "params", "explanation"],
} as const;

const answerResponseSchema = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING },
  },
  required: ["answer"],
} as const;

export class QueryAgent {
  async answer(question: string): Promise<QueryResult> {
    const trimmedQuestion = question.trim();
    const plan = await this.createSqlPlan(trimmedQuestion);
    const safePlan = validateSqlPlan(plan);
    const rows = executeSelect(safePlan);
    const answer = await this.summarizeRows(trimmedQuestion, safePlan, rows);

    db.prepare("INSERT INTO query_history (question, answer, query_type) VALUES (?, ?, ?)").run(
      trimmedQuestion,
      answer,
      "llm_sql",
    );

    return queryResultSchema.parse({
      question: trimmedQuestion,
      queryType: "llm_sql",
      sql: safePlan.sql,
      params: safePlan.params,
      explanation: safePlan.explanation,
      answer,
      rows,
    });
  }

  private async createSqlPlan(question: string): Promise<SqlPlan> {
    const responseText = await generateGeminiContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
You are a SQL planner for a read-only logistics document validation database.

Use this schema dictionary:
${schemaDictionary}

User question:
${question}

Return one safe SQLite SELECT statement and params.

Rules:
- Return JSON only.
- SQL must be read-only SELECT.
- Use only the listed tables and columns.
- Use ? placeholders for user-provided values.
- Do not use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, REPLACE, PRAGMA, ATTACH, DETACH, or multiple statements.
- Add LIMIT 20 for row-listing queries. Aggregate count queries do not need LIMIT.
- Prefer explicit joins through run_id.
- For invoice-specific questions, identify the latest matching run with extracted_fields.field_key = 'invoice_number' and extracted_fields.value = ? before reading validation rows.
              `.trim(),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1200,
        responseMimeType: "application/json",
        responseSchema: sqlPlanResponseSchema,
      },
    });

    return sqlPlanSchema.parse(JSON.parse(responseText));
  }

  private async summarizeRows(question: string, plan: SqlPlan, rows: Array<Record<string, unknown>>) {
    try {
      const responseText = await generateGeminiContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `
You answer operator questions using only SQL result rows.

Question:
${question}

SQL:
${plan.sql}

Rows:
${JSON.stringify(rows)}

Return a concise grounded answer. If there are no rows, say that no matching records were found. Do not invent facts outside the rows.
              `.trim(),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1000,
          responseMimeType: "application/json",
          responseSchema: answerResponseSchema,
        },
      });

      const parsed = JSON.parse(responseText) as { answer?: string };
      return parsed.answer ?? createFallbackAnswer(rows);
    } catch {
      return createFallbackAnswer(rows);
    }
  }
}

function executeSelect(plan: SqlPlan) {
  return db.prepare(plan.sql).all(...plan.params) as Array<Record<string, unknown>>;
}
