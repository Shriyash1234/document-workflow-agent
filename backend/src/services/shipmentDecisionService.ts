import type { CustomerRules } from "../rules/customerRules.js";
import type { CrossDocumentResult, ShipmentDecision } from "../schemas/shipment.js";
import { shipmentDecisionSchema } from "../schemas/shipment.js";

const fieldLabels: Record<string, string> = {
  consignee_name: "Consignee name",
  hs_code: "HS code",
  port_of_loading: "Port of loading",
  port_of_discharge: "Port of discharge",
  incoterms: "Incoterms",
  description_of_goods: "Description of goods",
  gross_weight: "Gross weight",
  invoice_number: "Invoice number",
};

export function createShipmentDecision(
  customer: string,
  crossDocumentResults: CrossDocumentResult[],
  rules: CustomerRules,
): ShipmentDecision {
  const mismatches = crossDocumentResults.filter((result) => result.result === "mismatch");
  const uncertain = crossDocumentResults.filter((result) => result.result === "uncertain");
  const criticalMismatches = mismatches.filter((result) => rules.criticalFields.includes(result.fieldKey));

  if (criticalMismatches.length > 0) {
    return shipmentDecisionSchema.parse({
      outcome: "needs_amendment",
      reasoning: `${criticalMismatches.length} critical cross-document mismatch(es) require supplier correction before CG can approve the shipment.`,
      draftReply: createAmendmentDraft(customer, [...criticalMismatches, ...uncertain]),
    });
  }

  if (uncertain.length > 0 || mismatches.length > 0) {
    return shipmentDecisionSchema.parse({
      outcome: "human_review",
      reasoning:
        "The shipment has uncertainty or non-critical mismatches. A CG operator must review it before any supplier response is sent.",
      draftReply: createHumanReviewDraft(customer, [...mismatches, ...uncertain]),
    });
  }

  return shipmentDecisionSchema.parse({
    outcome: "approved",
    reasoning: "All cross-document fields matched with sufficient confidence, so the document set is ready for CG approval.",
    draftReply: createApprovalDraft(customer),
  });
}

function createApprovalDraft(customer: string) {
  return [
    "Subject: Documents verified for shipment",
    "",
    "Hello,",
    "",
    `CG has verified the submitted document set for ${customer}. The documents are approved for the next step.`,
    "",
    "Regards,",
    "CG Validation Team",
  ].join("\n");
}

function createAmendmentDraft(customer: string, issues: CrossDocumentResult[]) {
  return [
    "Subject: Amendment required for shipment documents",
    "",
    "Hello,",
    "",
    `CG reviewed the submitted document set for ${customer}. Please correct the following discrepancies and resend the updated documents:`,
    "",
    ...issues.map(formatIssueLine),
    "",
    "The shipment will remain pending until CG verifies the corrected documents.",
    "",
    "Regards,",
    "CG Validation Team",
  ].join("\n");
}

function createHumanReviewDraft(customer: string, issues: CrossDocumentResult[]) {
  return [
    "Subject: Shipment documents under review",
    "",
    "Hello,",
    "",
    `CG is reviewing the submitted document set for ${customer}. We will confirm the next step after a manual check of the following field(s):`,
    "",
    ...issues.map(formatIssueLine),
    "",
    "Regards,",
    "CG Validation Team",
  ].join("\n");
}

function formatIssueLine(issue: CrossDocumentResult) {
  const label = fieldLabels[issue.fieldKey] ?? issue.fieldKey;
  const values = issue.valuesByDocument
    .map((value) => {
      const found = value.value ?? "missing / unreadable";
      return `${value.fileName}: "${found}" (${Math.round(value.confidence * 100)}%)`;
    })
    .join("; ");

  return `- ${label}: ${values}.`;
}
