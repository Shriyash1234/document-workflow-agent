import { z } from "zod";

export const documentTypeSchema = z.enum([
  "commercial_invoice",
  "packing_list",
  "bill_of_lading",
  "unknown",
]);

export const fieldKeySchema = z.enum([
  "consignee_name",
  "hs_code",
  "port_of_loading",
  "port_of_discharge",
  "incoterms",
  "description_of_goods",
  "gross_weight",
  "invoice_number",
]);

export const extractedFieldSchema = z.object({
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  evidence: z.string().nullable(),
});

export const extractionResultSchema = z.object({
  documentType: documentTypeSchema,
  fields: z.object({
    consignee_name: extractedFieldSchema,
    hs_code: extractedFieldSchema,
    port_of_loading: extractedFieldSchema,
    port_of_discharge: extractedFieldSchema,
    incoterms: extractedFieldSchema,
    description_of_goods: extractedFieldSchema,
    gross_weight: extractedFieldSchema,
    invoice_number: extractedFieldSchema,
  }),
});

export type DocumentType = z.infer<typeof documentTypeSchema>;
export type FieldKey = z.infer<typeof fieldKeySchema>;
export type ExtractedField = z.infer<typeof extractedFieldSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;
