import { ExtractorAgent } from "../agents/extractorAgent.js";
import { RouterAgent } from "../agents/routerAgent.js";
import { ValidatorAgent } from "../agents/validatorAgent.js";
import { loadCustomerRules } from "../rules/customerRules.js";
import type { RunSourceType } from "../storage/runRepository.js";
import {
  completeRun,
  createRun,
  failRun,
  getRun,
  saveDecision,
  saveDocument,
  saveExtraction,
  saveValidation,
} from "../storage/runRepository.js";
import { resolveSampleDocument } from "./sampleDocuments.js";

const extractorAgent = new ExtractorAgent();
const validatorAgent = new ValidatorAgent();
const routerAgent = new RouterAgent();

type PipelineDocument = {
  absolutePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  samplePath?: string;
};

export async function runDocumentPipeline(document: PipelineDocument, sourceType: RunSourceType) {
  const runId = createRun(sourceType);

  try {
    saveDocument({
      runId,
      fileName: document.fileName,
      fileType: document.mimeType,
      samplePath: document.samplePath,
      sizeBytes: document.sizeBytes,
    });

    const rules = await loadCustomerRules();
    const extraction = await extractorAgent.extractFromFile(document.absolutePath);
    const validation = validatorAgent.validate(extraction, rules);
    const decision = routerAgent.decide(validation, rules);

    saveExtraction(runId, extraction);
    saveValidation(runId, validation);
    saveDecision(runId, decision);
    completeRun({ runId, extraction, validation, decision });

    const storedRun = getRun(runId);
    if (!storedRun) {
      throw new Error(`Run was not found after completion: ${runId}`);
    }

    return storedRun;
  } catch (error) {
    failRun(runId, error);
    throw error;
  }
}

export async function runSamplePipeline(samplePath: string) {
  const sample = await resolveSampleDocument(samplePath);
  return runDocumentPipeline(
    {
      absolutePath: sample.absolutePath,
      fileName: sample.fileName,
      mimeType: sample.mimeType,
      samplePath: sample.samplePath,
      sizeBytes: sample.sizeBytes,
    },
    "sample",
  );
}
