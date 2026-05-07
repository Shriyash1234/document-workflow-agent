import test from "node:test";
import assert from "node:assert/strict";
import { ExtractorAgent } from "../src/agents/extractorAgent.js";
import { cleanExtractionFixture } from "./fixtures.js";

test("ExtractorAgent retries once when Gemini returns malformed JSON", async () => {
  const responses = [
    '{"documentType":"bill_of_lading","fields":{"consignee_name":{"value":"Atlas',
    JSON.stringify({ ...cleanExtractionFixture, documentType: "bill_of_lading" }),
  ];
  const agent = new ExtractorAgent(async () => responses.shift() ?? "{}");

  const extraction = await agent.extractFromFile("../samples/messy/bill-of-lading-messy.pdf");

  assert.equal(extraction.documentType, "bill_of_lading");
  assert.equal(extraction.fields.consignee_name.value, "Atlas Retail India Pvt Ltd");
});
