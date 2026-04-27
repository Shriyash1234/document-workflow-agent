import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..", "..");
const customerRulesPath = path.join(backendRoot, "data", "customer-rules.json");

export type FieldKey =
  | "consignee_name"
  | "hs_code"
  | "port_of_loading"
  | "port_of_discharge"
  | "incoterms"
  | "description_of_goods"
  | "gross_weight"
  | "invoice_number";

export type CustomerRules = {
  customer: string;
  description: string;
  confidenceThreshold: number;
  expected: Partial<Record<FieldKey, string>>;
  requiredFields: FieldKey[];
  criticalFields: FieldKey[];
  presenceOnlyFields: FieldKey[];
};

export async function loadCustomerRules(): Promise<CustomerRules> {
  const rulesText = await readFile(customerRulesPath, "utf8");
  return JSON.parse(rulesText) as CustomerRules;
}
