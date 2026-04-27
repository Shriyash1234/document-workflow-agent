import type { QueryResult, SampleOutput, StoredRun } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed with ${response.status}`);
  }

  return data as T;
}

export async function getHealth() {
  return requestJson<{
    ok: boolean;
    service: string;
    geminiConfigured: boolean;
    database: { configured: boolean; tableCount: number };
  }>("/api/health");
}

export async function getSamples() {
  const data = await requestJson<{
    ok: boolean;
    manifest: { outputs: SampleOutput[] };
  }>("/api/samples");

  return data.manifest.outputs;
}

export async function runSample(samplePath: string) {
  const data = await requestJson<{ ok: boolean; run: StoredRun }>("/api/runs/sample", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ samplePath }),
  });

  return data.run;
}

export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append("document", file);

  const data = await requestJson<{ ok: boolean; run: StoredRun }>("/api/runs", {
    method: "POST",
    body: formData,
  });

  return data.run;
}

export async function askQuery(question: string) {
  const data = await requestJson<{ ok: boolean; result: QueryResult }>("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  return data.result;
}
