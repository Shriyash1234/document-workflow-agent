import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { documentTypeSchema } from "../schemas/extraction.js";
import { resolveSampleDocument } from "./sampleDocuments.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..", "..");
const workspaceRoot = path.resolve(backendRoot, "..");
const inboxFixturePath = path.join(workspaceRoot, "samples", "inbox", "emails.json");

const inboxAttachmentSchema = z.object({
  fileName: z.string(),
  samplePath: z.string(),
  documentType: documentTypeSchema,
});

const simulatedEmailSchema = z.object({
  emailId: z.string(),
  from: z.string(),
  subject: z.string(),
  receivedAt: z.string(),
  customer: z.string(),
  status: z.enum(["incoming", "processing", "verified", "failed"]),
  attachments: z.array(inboxAttachmentSchema).min(1),
});

const simulatedInboxSchema = z.object({
  emails: z.array(simulatedEmailSchema),
});

export type SimulatedInboxAttachment = z.infer<typeof inboxAttachmentSchema>;
export type SimulatedEmail = z.infer<typeof simulatedEmailSchema>;

export async function loadSimulatedInbox() {
  const fixtureText = await readFile(inboxFixturePath, "utf8");
  return simulatedInboxSchema.parse(JSON.parse(fixtureText)).emails;
}

export async function getSimulatedEmail(emailId: string) {
  const emails = await loadSimulatedInbox();
  const email = emails.find((candidate) => candidate.emailId === emailId);
  if (!email) {
    throw new Error(`Simulated inbox email was not found: ${emailId}`);
  }

  return email;
}

export async function resolveInboxAttachment(attachment: SimulatedInboxAttachment) {
  const sample = await resolveSampleDocument(attachment.samplePath);

  return {
    ...sample,
    documentType: attachment.documentType,
    emailFileName: attachment.fileName,
  };
}
