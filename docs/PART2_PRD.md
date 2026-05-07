# Part 2 PRD: CG Email-to-Verification Workflow

## Personas

### CG Operator

CG receives shipment documents from SU, validates every field against customer requirements, and decides whether the shipment document set is approved or needs correction. CG cares about speed, accuracy, auditability, and not sending wrong documents to the customer.

### SU Supplier

SU prepares and emails shipment documents such as Bill of Lading, Commercial Invoice, and Packing List. SU cares about quick acceptance, clear correction requests, and avoiding repeated amendment cycles.

## Jobs To Be Done

1. When SU emails a shipment document set, I want Nova to automatically process all attachments and show CG a verification result, so that CG does not manually open and compare every document.
2. When Nova finds a discrepancy, I want CG to see the field, found value, expected value, source evidence, and draft reply, so that CG can send a clear correction request without writing it from scratch.

## North-Star Metric

Median time from SU email received to CG-ready verification decision.

Success means CG can move from incoming email to reviewed approval/amendment draft faster while preserving accuracy and human control.

## Worst Failure Mode

The worst failure mode is the agent approving or sending a reply when a critical mismatch exists, such as wrong consignee, HS code, Incoterms, or gross weight.

Prevention:
Nova never sends email automatically. It only produces a verification result and editable draft reply. Critical mismatches route to `needs_amendment`, uncertain critical fields route to human review, and CG must review before anything is sent to SU or the customer.
