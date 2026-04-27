import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ExtractorAgent } from "../agents/extractorAgent.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..", "..");
const workspaceRoot = path.resolve(backendRoot, "..");
const sampleArg = process.argv[2] ?? "samples/clean/commercial-invoice.pdf";
const samplePath = path.isAbsolute(sampleArg)
  ? sampleArg
  : process.argv[2]
    ? path.resolve(process.cwd(), sampleArg)
    : path.resolve(workspaceRoot, sampleArg);

const extractor = new ExtractorAgent();
const result = await extractor.extractFromFile(samplePath);

console.log(JSON.stringify(result, null, 2));
