import { RouterAgent } from "../agents/routerAgent.js";
import { ValidatorAgent } from "../agents/validatorAgent.js";
import { loadCustomerRules } from "../rules/customerRules.js";
import type { ExtractionResult } from "../schemas/extraction.js";

const cleanExtraction: ExtractionResult = {
  documentType: "commercial_invoice",
  fields: {
    consignee_name: { value: "Atlas Retail India Pvt Ltd", confidence: 1, evidence: "Atlas Retail India Pvt Ltd" },
    hs_code: { value: "847130", confidence: 1, evidence: "847130" },
    port_of_loading: { value: "Shanghai, China", confidence: 1, evidence: "Shanghai, China" },
    port_of_discharge: { value: "Nhava Sheva, India", confidence: 1, evidence: "Nhava Sheva, India" },
    incoterms: {
      value: "CIF Nhava Sheva, Incoterms 2020",
      confidence: 1,
      evidence: "CIF Nhava Sheva, Incoterms 2020",
    },
    description_of_goods: {
      value: "Laptop computers and accessories",
      confidence: 1,
      evidence: "Laptop computers and accessories",
    },
    gross_weight: { value: "1240 KG", confidence: 1, evidence: "1240 KG" },
    invoice_number: { value: "INV-2026-0417", confidence: 1, evidence: "INV-2026-0417" },
  },
};

const messyExtraction: ExtractionResult = {
  documentType: "commercial_invoice",
  fields: {
    consignee_name: { value: "Atlas Retail Pvt Ltd", confidence: 0.96, evidence: "Atlas Retail Pvt Ltd" },
    hs_code: { value: "847150", confidence: 0.98, evidence: "847150" },
    port_of_loading: { value: "Shanghai, China", confidence: 0.92, evidence: "Shanghai, China" },
    port_of_discharge: { value: "Nhava Sheva, India", confidence: 0.92, evidence: "Nhava Sheva, India" },
    incoterms: { value: null, confidence: 0, evidence: null },
    description_of_goods: {
      value: "Laptop computers and accessories",
      confidence: 0.9,
      evidence: "Laptop computers and accessories",
    },
    gross_weight: { value: "1280 KG", confidence: 0.94, evidence: "1280 KG" },
    invoice_number: { value: "INV-2026-0418", confidence: 0.95, evidence: "INV-2026-0418" },
  },
};

const fixture = process.argv[2] === "messy" ? messyExtraction : cleanExtraction;
const rules = await loadCustomerRules();
const validation = new ValidatorAgent().validate(fixture, rules);
const decision = new RouterAgent().decide(validation, rules);

console.log(JSON.stringify({ validation, decision }, null, 2));
