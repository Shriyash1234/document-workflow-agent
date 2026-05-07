import { loadCustomerRules } from "../rules/customerRules.js";
import type { ShipmentVerification } from "../schemas/shipment.js";
import {
  completeShipment,
  createShipment,
  failShipment,
  getShipment,
  linkShipmentDocument,
  saveCrossDocumentResults,
} from "../storage/shipmentRepository.js";
import { CrossDocumentValidator, type CrossDocumentInput } from "./crossDocumentValidator.js";
import { runDocumentPipeline } from "./pipelineService.js";
import { createShipmentDecision } from "./shipmentDecisionService.js";
import { getSimulatedEmail, resolveInboxAttachment } from "./simulatedInbox.js";

const crossDocumentValidator = new CrossDocumentValidator();

export async function processSimulatedEmail(emailId: string): Promise<ShipmentVerification> {
  const email = await getSimulatedEmail(emailId);
  const shipmentId = createShipment(email);
  const processedDocuments: CrossDocumentInput[] = [];

  try {
    for (const attachment of email.attachments) {
      const document = await resolveInboxAttachment(attachment);
      const run = await runDocumentPipeline(
        {
          absolutePath: document.absolutePath,
          fileName: attachment.fileName,
          mimeType: document.mimeType,
          samplePath: document.samplePath,
          sizeBytes: document.sizeBytes,
        },
        "email",
      );

      linkShipmentDocument({
        shipmentId,
        runId: run.id,
        documentType: attachment.documentType,
        fileName: attachment.fileName,
        samplePath: attachment.samplePath,
      });

      if (!run.extraction) {
        throw new Error(`Document extraction was not stored for run: ${run.id}`);
      }

      processedDocuments.push({
        documentType: attachment.documentType,
        fileName: attachment.fileName,
        extraction: run.extraction,
      });
    }

    const rules = await loadCustomerRules();
    const crossDocumentResults = crossDocumentValidator.validate(processedDocuments);
    const decision = createShipmentDecision(email.customer, crossDocumentResults, rules);

    saveCrossDocumentResults(shipmentId, crossDocumentResults);
    completeShipment({ shipmentId, crossDocumentResults, decision });

    return requireShipment(shipmentId);
  } catch (error) {
    failShipment(shipmentId, error);
    throw error;
  }
}

function requireShipment(shipmentId: string) {
  const shipment = getShipment(shipmentId);
  if (!shipment) {
    throw new Error(`Shipment was not found after processing: ${shipmentId}`);
  }

  return shipment;
}
