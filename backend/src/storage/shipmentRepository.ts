import { randomUUID } from "node:crypto";
import { db } from "./database.js";
import type {
  CrossDocumentResult,
  ShipmentDecision,
  ShipmentDocumentResult,
  ShipmentStatus,
  ShipmentVerification,
  SimulatedEmail,
} from "../schemas/shipment.js";
import { shipmentVerificationSchema } from "../schemas/shipment.js";
import { getRun } from "./runRepository.js";

type ShipmentRow = {
  id: string;
  email_id: string;
  status: ShipmentStatus;
  customer: string;
  email_from: string;
  email_subject: string;
  email_received_at: string;
  decision_outcome: ShipmentDecision["outcome"] | null;
  decision_reasoning: string | null;
  draft_reply: string | null;
  raw_email_json: string;
  raw_cross_document_json: string | null;
  raw_decision_json: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type ShipmentDocumentRow = {
  id: string;
  run_id: string;
  document_type: ShipmentDocumentResult["documentType"];
  file_name: string;
  sample_path: string | null;
};

type CrossDocumentRow = {
  field_key: CrossDocumentResult["fieldKey"];
  result: CrossDocumentResult["result"];
  values_json: string;
  reason: string;
};

export function createShipment(email: SimulatedEmail) {
  const id = randomUUID();

  db.prepare(
    `INSERT INTO shipments (
      id, email_id, status, customer, email_from, email_subject, email_received_at, raw_email_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    email.emailId,
    "processing",
    email.customer,
    email.from,
    email.subject,
    email.receivedAt,
    JSON.stringify(email),
  );

  return id;
}

export function linkShipmentDocument(input: {
  shipmentId: string;
  runId: string;
  documentType: ShipmentDocumentResult["documentType"];
  fileName: string;
  samplePath?: string;
}) {
  const id = randomUUID();

  db.prepare(
    `INSERT INTO shipment_documents (
      id, shipment_id, run_id, document_type, file_name, sample_path
    ) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, input.shipmentId, input.runId, input.documentType, input.fileName, input.samplePath ?? null);

  return id;
}

export function saveCrossDocumentResults(shipmentId: string, results: CrossDocumentResult[]) {
  const statement = db.prepare(
    `INSERT INTO cross_document_results (
      shipment_id, field_key, result, values_json, reason
    ) VALUES (?, ?, ?, ?, ?)`,
  );

  for (const result of results) {
    statement.run(
      shipmentId,
      result.fieldKey,
      result.result,
      JSON.stringify(result.valuesByDocument),
      result.reason,
    );
  }
}

export function completeShipment(input: {
  shipmentId: string;
  crossDocumentResults: CrossDocumentResult[];
  decision: ShipmentDecision;
}) {
  db.prepare(
    `UPDATE shipments
     SET status = ?, decision_outcome = ?, decision_reasoning = ?, draft_reply = ?,
         raw_cross_document_json = ?, raw_decision_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(
    "verified",
    input.decision.outcome,
    input.decision.reasoning,
    input.decision.draftReply,
    JSON.stringify(input.crossDocumentResults),
    JSON.stringify(input.decision),
    input.shipmentId,
  );
}

export function failShipment(shipmentId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown shipment pipeline error";
  db.prepare("UPDATE shipments SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    "failed",
    message,
    shipmentId,
  );
}

export function getShipment(shipmentId: string): ShipmentVerification | null {
  const shipment = db.prepare("SELECT * FROM shipments WHERE id = ?").get(shipmentId) as ShipmentRow | undefined;
  if (!shipment) return null;

  return buildShipmentVerification(shipment);
}

export function getLatestShipmentForEmail(emailId: string): ShipmentVerification | null {
  const shipment = db
    .prepare("SELECT * FROM shipments WHERE email_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(emailId) as ShipmentRow | undefined;
  if (!shipment) return null;

  return buildShipmentVerification(shipment);
}

function buildShipmentVerification(shipment: ShipmentRow): ShipmentVerification {
  const documents = db
    .prepare("SELECT * FROM shipment_documents WHERE shipment_id = ? ORDER BY created_at ASC")
    .all(shipment.id) as ShipmentDocumentRow[];

  const crossRows = db
    .prepare("SELECT * FROM cross_document_results WHERE shipment_id = ? ORDER BY id ASC")
    .all(shipment.id) as CrossDocumentRow[];

  const documentResults = documents.map((document): ShipmentDocumentResult => {
    const run = getRun(document.run_id);
    if (!run?.extraction || !run.validation) {
      throw new Error(`Shipment document run is incomplete: ${document.run_id}`);
    }

    return {
      documentId: document.id,
      runId: document.run_id,
      fileName: document.file_name,
      documentType: document.document_type,
      extraction: run.extraction,
      validation: run.validation,
    };
  });

  const decision = parseJson<ShipmentDecision>(shipment.raw_decision_json);
  const crossDocumentResults =
    crossRows.length > 0
      ? crossRows.map((row) => ({
          fieldKey: row.field_key,
          result: row.result,
          valuesByDocument: parseJson(row.values_json) ?? [],
          reason: row.reason,
        }))
      : parseJson<CrossDocumentResult[]>(shipment.raw_cross_document_json) ?? [];

  return shipmentVerificationSchema.parse({
    shipmentId: shipment.id,
    email: parseJson(shipment.raw_email_json),
    status: shipment.status,
    errorMessage: shipment.error_message,
    documents: documentResults,
    crossDocumentResults,
    decision,
    createdAt: shipment.created_at,
    updatedAt: shipment.updated_at,
  });
}

function parseJson<T>(value: string | null) {
  return value ? (JSON.parse(value) as T) : null;
}
