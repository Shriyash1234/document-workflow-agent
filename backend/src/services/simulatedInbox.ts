import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { simulatedEmailSchema, type SimulatedEmailAttachment } from "../schemas/shipment.js";
import { resolveSampleDocument } from "./sampleDocuments.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..", "..");
const workspaceRoot = path.resolve(backendRoot, "..");
const inboxFixturePath = path.join(workspaceRoot, "samples", "inbox", "emails.json");

const simulatedInboxSchema = simulatedEmailSchema.array();

export async function loadSimulatedInbox() {
  const fixtureText = await readFile(inboxFixturePath, "utf8");
  const fixture = JSON.parse(fixtureText) as { emails: unknown };
  return simulatedInboxSchema.parse(fixture.emails);
}

export async function getSimulatedEmail(emailId: string) {
  const emails = await loadSimulatedInbox();
  const email = emails.find((candidate) => candidate.emailId === emailId);
  if (!email) {
    throw new Error(`Simulated inbox email was not found: ${emailId}`);
  }

  return email;
}

export async function resolveInboxAttachment(attachment: SimulatedEmailAttachment) {
  const sample = await resolveSampleDocument(attachment.samplePath);

  return {
    ...sample,
    documentType: attachment.documentType,
    emailFileName: attachment.fileName,
  };
}
