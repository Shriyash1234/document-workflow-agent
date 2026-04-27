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

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
    contents: request.contents,
    config: request.generationConfig,
  });

  if (!response.text) {
    throw new Error("Gemini response did not include text.");
  }

  return response.text;
}
