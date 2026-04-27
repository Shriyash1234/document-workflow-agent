import { GoogleGenAI } from "@google/genai";

type GeminiPart =
  | { text: string }
  | {
      inlineData: {
        mimeType: string;
        data: string;
      };
    };

type GeminiGenerateContentRequest = {
  contents: Array<{
    role?: "user" | "model";
    parts: GeminiPart[];
  }>;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: unknown;
  };
};

export async function generateGeminiContent(request: GeminiGenerateContentRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const primaryModel = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL ?? "gemini-2.5-flash";
  const models = [...new Set([primaryModel, fallbackModel])];
  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: request.contents,
          config: request.generationConfig,
        });

        if (!response.text) {
          throw new Error("Gemini response did not include text.");
        }

        return response.text;
      } catch (error) {
        lastError = error;
        const status = getErrorStatus(error);
        if (status === 429 || attempt === 2 || !isRetryableGeminiError(error)) {
          break;
        }

        await delay(750 * attempt);
      }
    }
  }

  throw lastError;
}

function isRetryableGeminiError(error: unknown) {
  const status = getErrorStatus(error);
  const message = error instanceof Error ? error.message : String(error);
  return status === 429 || status === 500 || status === 503 || message.includes("UNAVAILABLE");
}

function getErrorStatus(error: unknown) {
  return (error as { status?: number }).status;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
