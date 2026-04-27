import { Type } from "@google/genai";

export const geminiExtractionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    documentType: {
      type: Type.STRING,
      enum: ["commercial_invoice", "packing_list", "bill_of_lading", "unknown"],
    },
    fields: {
      type: Type.OBJECT,
      properties: {
        consignee_name: { type: "object", properties: fieldProperties(), required: fieldRequired() },
        hs_code: { type: "object", properties: fieldProperties(), required: fieldRequired() },
        port_of_loading: { type: "object", properties: fieldProperties(), required: fieldRequired() },
        port_of_discharge: { type: "object", properties: fieldProperties(), required: fieldRequired() },
        incoterms: { type: "object", properties: fieldProperties(), required: fieldRequired() },
        description_of_goods: { type: "object", properties: fieldProperties(), required: fieldRequired() },
        gross_weight: { type: "object", properties: fieldProperties(), required: fieldRequired() },
        invoice_number: { type: "object", properties: fieldProperties(), required: fieldRequired() },
      },
      required: [
        "consignee_name",
        "hs_code",
        "port_of_loading",
        "port_of_discharge",
        "incoterms",
        "description_of_goods",
        "gross_weight",
        "invoice_number",
      ],
    },
  },
  required: ["documentType", "fields"],
} as const;

function fieldProperties() {
  return {
    value: {
      type: Type.STRING,
      nullable: true,
    },
    confidence: {
      type: Type.NUMBER,
    },
    evidence: {
      type: Type.STRING,
      nullable: true,
    },
  } as const;
}

function fieldRequired() {
  return ["value", "confidence", "evidence"] as const;
}
