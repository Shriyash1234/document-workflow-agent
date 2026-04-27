import type { CustomerRules } from "../rules/customerRules.js";
import { decisionResultSchema, type DecisionResult } from "../schemas/decision.js";
import type { ValidationResult, ValidationSummary } from "../schemas/validation.js";

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

export class RouterAgent {
  decide(validation: ValidationSummary, rules: CustomerRules): DecisionResult {
    const mismatches = validation.results.filter((result) => result.result === "mismatch");
    const uncertain = validation.results.filter((result) => result.result === "uncertain");
    const criticalIssues = validation.results.filter(
      (result) => rules.criticalFields.includes(result.fieldKey) && result.result !== "match",
    );
    const nonCriticalIssues = validation.results.filter(
      (result) => !rules.criticalFields.includes(result.fieldKey) && result.result !== "match",
    );

    if (criticalIssues.length > 0) {
      return decisionResultSchema.parse({
        outcome: "draft_amendment",
        reasoning: this.reasonForAmendment(criticalIssues),
        amendmentDraft: this.createAmendmentDraft(validation.customer, criticalIssues),
        discrepancies: criticalIssues,
      });
    }

    if (nonCriticalIssues.length > 0) {
      return decisionResultSchema.parse({
        outcome: "human_review",
        reasoning: this.reasonForHumanReview(mismatches, uncertain),
        amendmentDraft: null,
        discrepancies: [...mismatches, ...uncertain],
      });
    }

    return decisionResultSchema.parse({
      outcome: "auto_approve",
      reasoning:
        "All required fields matched the configured customer rules with sufficient confidence, so the document can be stored as approved.",
      amendmentDraft: null,
      discrepancies: [],
    });
  }

  private reasonForAmendment(criticalIssues: ValidationResult[]) {
    const issueLabels = criticalIssues.map((result) => fieldLabels[result.fieldKey] ?? result.fieldKey).join(", ");
    const uncertainCount = criticalIssues.filter((result) => result.result === "uncertain").length;
    const uncertainSuffix =
      uncertainCount > 0 ? ` ${uncertainCount} critical uncertain field(s) need clarification before approval.` : "";

    return `Critical customer-rule issue detected in ${issueLabels}. Drafting an amendment request for CG review.${uncertainSuffix}`;
  }

  private reasonForHumanReview(mismatches: ValidationResult[], uncertain: ValidationResult[]) {
    const parts = [];
    if (mismatches.length > 0) {
      parts.push(`${mismatches.length} non-critical mismatch(es)`);
    }
    if (uncertain.length > 0) {
      parts.push(`${uncertain.length} uncertain field(s)`);
    }

    return `${parts.join(" and ")} require human review. The agent will not silently approve this document.`;
  }

  private createAmendmentDraft(customer: string, discrepancies: ValidationResult[]) {
    const lines = discrepancies.map((result) => {
      const label = fieldLabels[result.fieldKey] ?? result.fieldKey;
      const found = result.found ?? "missing / unreadable";
      const expected = result.expected ?? "required value";
      return `- ${label}: found "${found}", expected "${expected}".`;
    });

    return [
      "Subject: Amendment required for shipment documents",
      "",
      "Hello,",
      "",
      `CG reviewed the submitted document set for ${customer}. Please amend the following field(s) and resend the corrected document:`,
      "",
      ...lines,
      "",
      "The shipment will remain pending until CG verifies the corrected document.",
      "",
      "Regards,",
      "CG Validation Team",
    ].join("\n");
  }
}
