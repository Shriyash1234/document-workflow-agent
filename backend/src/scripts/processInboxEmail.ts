import dotenv from "dotenv";
import { processSimulatedEmail } from "../services/shipmentProcessingService.js";

dotenv.config();

const requestedEmailIds = process.argv.slice(2);
const emailIds = requestedEmailIds.length > 0 ? requestedEmailIds : ["clean-shipment", "messy-shipment"];

for (const emailId of emailIds) {
  const shipment = await processSimulatedEmail(emailId);

  console.log(
    JSON.stringify(
      {
        emailId,
        shipmentId: shipment.shipmentId,
        status: shipment.status,
        outcome: shipment.decision?.outcome,
        documentsProcessed: shipment.documents.length,
        crossDocumentCounts: {
          match: shipment.crossDocumentResults.filter((result) => result.result === "match").length,
          mismatch: shipment.crossDocumentResults.filter((result) => result.result === "mismatch").length,
          uncertain: shipment.crossDocumentResults.filter((result) => result.result === "uncertain").length,
        },
      },
      null,
      2,
    ),
  );
}
