import test from "node:test";
import assert from "node:assert/strict";
import { loadSimulatedInbox, resolveInboxAttachment } from "../src/services/simulatedInbox.js";

test("simulated inbox fixture exposes clean and messy shipment emails with three attachments each", async () => {
  const emails = await loadSimulatedInbox();

  assert.deepEqual(
    emails.map((email) => email.emailId),
    ["clean-shipment", "messy-shipment"],
  );
  assert.ok(emails.every((email) => email.attachments.length === 3));
  assert.ok(emails.every((email) => email.attachments.some((attachment) => attachment.documentType === "bill_of_lading")));
  assert.ok(
    emails.every((email) => email.attachments.some((attachment) => attachment.documentType === "commercial_invoice")),
  );
  assert.ok(emails.every((email) => email.attachments.some((attachment) => attachment.documentType === "packing_list")));
});

test("simulated inbox attachments resolve to manifest-backed sample files", async () => {
  const [cleanEmail] = await loadSimulatedInbox();
  const resolved = await Promise.all(cleanEmail.attachments.map((attachment) => resolveInboxAttachment(attachment)));

  assert.ok(resolved.every((attachment) => attachment.absolutePath.endsWith(".pdf")));
  assert.ok(resolved.every((attachment) => attachment.sizeBytes > 0));
});
