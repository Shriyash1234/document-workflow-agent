import { readFile } from "node:fs/promises";
import { generateGeminiContent } from "../llm/geminiClient.js";
import { getMimeType } from "../lib/mime.js";
import { geminiExtractionResponseSchema } from "../schemas/geminiExtractionSchema.js";
import { extractionResultSchema, type ExtractionResult } from "../schemas/extraction.js";
import type { z } from "zod";

const extractionPrompt = `
You are the Extractor Agent for a governed trade-document workflow.

Read the attached trade document and extract exactly these fields:
- consignee_name
- hs_code
- port_of_loading
- port_of_discharge
- incoterms
- description_of_goods
- gross_weight
- invoice_number

Return JSON that matches the provided response schema.

Rules:
- Confidence must be between 0 and 1.
- If a field is missing, set value to null, confidence to 0, and evidence to null.
- Evidence must be a short exact or near-exact snippet from the document.
- Do not infer values from general knowledge. Only use the document.
`.trim();

type GenerateContent = typeof generateGeminiContent;

export class ExtractorAgent {
  constructor(private readonly generateContent: GenerateContent = generateGeminiContent) {}

  async extractFromFile(filePath: string): Promise<ExtractionResult> {
    const mimeType = getMimeType(filePath);
    const fileBuffer = await readFile(filePath);
    let lastParseError: unknown;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const responseText = await this.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: extractionPrompt },
              {
                inlineData: {
                  mimeType,
                  data: fileBuffer.toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2200,
          responseMimeType: "application/json",
          responseSchema: geminiExtractionResponseSchema,
        },
      });

      try {
        return extractionResultSchema.parse(JSON.parse(responseText));
      } catch (error) {
        lastParseError = error;
      }
    }

    throw createInvalidExtractionJsonError(lastParseError);
  }
}

function createInvalidExtractionJsonError(error: unknown) {
  if (error instanceof SyntaxError) {
    return new Error(`Extractor Agent received malformed JSON from Gemini: ${error.message}`);
  }

  const zodError = error as z.ZodError | undefined;
  if (zodError?.issues) {
    return new Error(`Extractor Agent received JSON that did not match the extraction schema: ${zodError.message}`);
  }

  return error instanceof Error ? error : new Error("Extractor Agent received invalid JSON from Gemini.");
}
