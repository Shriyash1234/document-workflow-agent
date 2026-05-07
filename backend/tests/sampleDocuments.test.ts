import test from "node:test";
import assert from "node:assert/strict";
import { resolveSamplePreview } from "../src/services/sampleDocuments.js";

test("resolveSamplePreview maps a manifest PDF sample to its PNG preview", async () => {
  const preview = await resolveSamplePreview("messy/commercial-invoice-messy.pdf");

  assert.equal(preview.samplePath, "messy/commercial-invoice-messy.png");
  assert.ok(preview.absolutePath.endsWith("messy\\commercial-invoice-messy.png"));
  assert.equal(preview.mimeType, "image/png");
  assert.ok(preview.sizeBytes > 0);
});

test("resolveSamplePreview rejects paths that are not manifest-backed samples", async () => {
  await assert.rejects(() => resolveSamplePreview("../README.md"), /Sample preview path is not in the manifest/);
});
