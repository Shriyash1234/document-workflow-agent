import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileText,
  Inbox,
  Mail,
  ShieldAlert,
} from "lucide-react";
import { toApiUrl } from "../api";
import type { CrossDocumentResult, InboxEmail, ShipmentDocumentResult, ShipmentVerification } from "../types";

const fieldLabels: Record<string, string> = {
  consignee_name: "Consignee",
  hs_code: "HS Code",
  port_of_loading: "Port of Loading",
  port_of_discharge: "Port of Discharge",
  incoterms: "Incoterms",
  description_of_goods: "Description",
  gross_weight: "Gross Weight",
  invoice_number: "Invoice Number",
};

type AttachmentView = {
  key: string;
  fileName: string;
  documentType: string;
  samplePath: string | null;
  previewUrl: string | null;
  issueCount: number;
};

export function OperatorWorkbench({
  inbox,
  selectedEmail,
  shipment,
  draftReply,
  busy,
  onSelectEmail,
  onProcessEmail,
  onDraftChange,
}: {
  inbox: InboxEmail[];
  selectedEmail: InboxEmail | null;
  shipment: ShipmentVerification | null;
  draftReply: string;
  busy: boolean;
  onSelectEmail: (email: InboxEmail) => void;
  onProcessEmail: (email: InboxEmail) => void;
  onDraftChange: (value: string) => void;
}) {
  const attachments = useMemo(() => buildAttachmentViews(selectedEmail, shipment), [selectedEmail, shipment]);
  const [selectedAttachmentKey, setSelectedAttachmentKey] = useState<string | null>(attachments[0]?.key ?? null);

  useEffect(() => {
    setSelectedAttachmentKey(attachments[0]?.key ?? null);
  }, [selectedEmail?.emailId, shipment?.shipmentId]);

  const selectedAttachment =
    attachments.find((attachment) => attachment.key === selectedAttachmentKey) ?? attachments[0] ?? null;

  return (
    <>
      <VerificationRibbon shipment={shipment} />
      <section className="workbench-grid">
        <InboxRail
          inbox={inbox}
          selectedEmailId={selectedEmail?.emailId ?? null}
          busy={busy}
          onSelectEmail={onSelectEmail}
          onProcessEmail={onProcessEmail}
        />
        <section className="review-column">
          <EmailContextPanel email={selectedEmail} />
          <AttachmentTabs
            attachments={attachments}
            selectedKey={selectedAttachment?.key ?? null}
            onSelect={setSelectedAttachmentKey}
          />
          <DocumentPreviewPane attachment={selectedAttachment} />
          <CrossDocumentIssueTable results={shipment?.crossDocumentResults ?? []} />
        </section>
        <section className="decision-column">
          <DraftReplyPanel draftReply={draftReply} shipment={shipment} onDraftChange={onDraftChange} />
        </section>
      </section>
    </>
  );
}

function InboxRail({
  inbox,
  selectedEmailId,
  busy,
  onSelectEmail,
  onProcessEmail,
}: {
  inbox: InboxEmail[];
  selectedEmailId: string | null;
  busy: boolean;
  onSelectEmail: (email: InboxEmail) => void;
  onProcessEmail: (email: InboxEmail) => void;
}) {
  return (
    <aside className="inbox-rail">
      <div className="section-heading">
        <p className="eyebrow">Supplier Intake</p>
        <h2>
          <Inbox size={18} /> SU Inbox
        </h2>
      </div>
      <div className="email-stack">
        {inbox.map((email) => (
          <button
            type="button"
            key={email.emailId}
            className={`email-card ${email.emailId === selectedEmailId ? "selected" : ""}`}
            onClick={() => onSelectEmail(email)}
          >
            <span className={`status-dot ${email.latestShipment?.decision?.outcome ?? email.status}`} />
            <span className="email-card-body">
              <strong>{email.subject}</strong>
              <small>{email.from}</small>
              <span>{email.attachments.length} attachments</span>
            </span>
            <span className={`result-badge ${email.latestShipment?.decision?.outcome ?? email.status}`}>
              {formatOutcome(email.latestShipment?.decision?.outcome ?? email.status)}
            </span>
          </button>
        ))}
      </div>
      {inbox.length > 0 && selectedEmailId && (
        <button
          className="primary-action"
          type="button"
          disabled={busy}
          onClick={() => {
            const email = inbox.find((candidate) => candidate.emailId === selectedEmailId);
            if (email) onProcessEmail(email);
          }}
        >
          <ClipboardCheck size={16} /> Process Email
        </button>
      )}
    </aside>
  );
}

function EmailContextPanel({ email }: { email: InboxEmail | null }) {
  if (!email) {
    return (
      <section className="context-panel">
        <p>No supplier email selected.</p>
      </section>
    );
  }

  return (
    <section className="context-panel">
      <div className="section-heading compact">
        <p className="eyebrow">Email Context</p>
        <h2>
          <Mail size={18} /> {email.customer}
        </h2>
      </div>
      <dl className="context-grid">
        <div>
          <dt>From</dt>
          <dd>{email.from}</dd>
        </div>
        <div>
          <dt>Subject</dt>
          <dd>{email.subject}</dd>
        </div>
        <div>
          <dt>Received</dt>
          <dd>{formatDate(email.receivedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}

function VerificationRibbon({ shipment }: { shipment: ShipmentVerification | null }) {
  const mismatches = shipment?.crossDocumentResults.filter((result) => result.result === "mismatch").length ?? 0;
  const uncertain = shipment?.crossDocumentResults.filter((result) => result.result === "uncertain").length ?? 0;
  const outcome = shipment?.decision?.outcome ?? "incoming";

  return (
    <section className={`verification-ribbon ${outcome}`}>
      <div>
        <p className="eyebrow">Verification Decision</p>
        <h2>
          {outcome === "approved" ? <CheckCircle2 size={22} /> : <ShieldAlert size={22} />}
          {shipment ? formatOutcome(outcome) : "Select and process an email"}
        </h2>
      </div>
      <div className="metric-row">
        <Metric label="Documents" value={shipment?.documents.length ?? 0} />
        <Metric label="Mismatches" value={mismatches} />
        <Metric label="Uncertain" value={uncertain} />
      </div>
      <p className="next-action">{getNextAction(shipment)}</p>
    </section>
  );
}

function AttachmentTabs({
  attachments,
  selectedKey,
  onSelect,
}: {
  attachments: AttachmentView[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <nav className="attachment-tabs" aria-label="Shipment attachments">
      {attachments.map((attachment) => (
        <button
          type="button"
          key={attachment.key}
          className={attachment.key === selectedKey ? "active" : ""}
          onClick={() => onSelect(attachment.key)}
        >
          <FileText size={16} />
          <span>
            {formatDocumentType(attachment.documentType)}
            <small>{attachment.issueCount} issues</small>
          </span>
        </button>
      ))}
    </nav>
  );
}

function DocumentPreviewPane({ attachment }: { attachment: AttachmentView | null }) {
  const src = toApiUrl(attachment?.previewUrl);

  return (
    <section className="document-preview">
      <div className="preview-head">
        <div>
          <p className="eyebrow">Document Preview</p>
          <h2>{attachment?.fileName ?? "No document selected"}</h2>
        </div>
        {attachment && <span className="file-pill">{formatDocumentType(attachment.documentType)}</span>}
      </div>
      {src ? (
        <div className="preview-frame">
          <img src={src} alt={`${attachment?.fileName ?? "Document"} preview`} />
        </div>
      ) : (
        <div className="preview-empty">Process or select an email to inspect source documents.</div>
      )}
    </section>
  );
}

function CrossDocumentIssueTable({ results }: { results: CrossDocumentResult[] }) {
  const [filter, setFilter] = useState<"issues" | "mismatch" | "uncertain" | "match">("issues");
  const counts = {
    issues: results.filter((result) => result.result !== "match").length,
    mismatch: results.filter((result) => result.result === "mismatch").length,
    uncertain: results.filter((result) => result.result === "uncertain").length,
    match: results.filter((result) => result.result === "match").length,
  };
  const visibleResults = results
    .filter((result) => {
      if (filter === "issues") return result.result !== "match";
      return result.result === filter;
    })
    .sort((a, b) => severityRank(a.result) - severityRank(b.result));

  useEffect(() => {
    setFilter("issues");
  }, [results]);

  return (
    <section className="issue-table-panel">
      <div className="section-heading compact">
        <p className="eyebrow">Cross-document validation</p>
        <h2>Discrepancies & Evidence</h2>
      </div>
      <div className="issue-toolbar" aria-label="Cross-document result filters">
        <button type="button" className={filter === "issues" ? "active" : ""} onClick={() => setFilter("issues")}>
          Issues <span>{counts.issues}</span>
        </button>
        <button type="button" className={filter === "mismatch" ? "active" : ""} onClick={() => setFilter("mismatch")}>
          Mismatch <span>{counts.mismatch}</span>
        </button>
        <button type="button" className={filter === "uncertain" ? "active" : ""} onClick={() => setFilter("uncertain")}>
          Uncertain <span>{counts.uncertain}</span>
        </button>
        <button type="button" className={filter === "match" ? "active" : ""} onClick={() => setFilter("match")}>
          Matched <span>{counts.match}</span>
        </button>
      </div>

      {visibleResults.length === 0 ? (
        <div className="issue-empty">No fields in this filter.</div>
      ) : (
        <div className="issue-card-list">
          {visibleResults.map((result) => (
            <article
              key={result.fieldKey}
              className={`issue-card ${result.result}`}
            >
              <span className="issue-card-head">
                <strong>{fieldLabels[result.fieldKey] ?? result.fieldKey}</strong>
                <span className={`result-badge ${result.result}`}>{result.result}</span>
              </span>
              <span className="issue-reason">{result.reason}</span>
              <span className="document-value-grid">
                {result.valuesByDocument.map((value) => (
                  <span key={`${result.fieldKey}-${value.fileName}`} className="document-value-cell">
                    <strong>{formatDocumentType(value.documentType)}</strong>
                    <span>{value.value ?? "missing / unreadable"}</span>
                    <small>{formatConfidence(value.confidence)}</small>
                    <em>{value.evidence ?? "No evidence snippet returned."}</em>
                  </span>
                ))}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DraftReplyPanel({
  draftReply,
  shipment,
  onDraftChange,
}: {
  draftReply: string;
  shipment: ShipmentVerification | null;
  onDraftChange: (value: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    setCopied(false);
    setReviewed(false);
  }, [shipment?.shipmentId]);

  return (
    <section className="draft-panel">
      <div className="section-heading compact">
        <p className="eyebrow">Human gate</p>
        <h2>Draft Reply</h2>
      </div>
      <p className="safety-note">Nova prepares this draft only. CG reviews and sends from the existing email process.</p>
      <textarea value={draftReply} onChange={(event) => onDraftChange(event.target.value)} />
      <div className="draft-actions">
        <button
          type="button"
          disabled={!draftReply}
          onClick={() => {
            void navigator.clipboard?.writeText(draftReply);
            setCopied(true);
          }}
        >
          <Copy size={16} /> {copied ? "Copied" : "Copy Draft"}
        </button>
        <button type="button" disabled={!shipment} onClick={() => setReviewed(true)}>
          <ClipboardCheck size={16} /> {reviewed ? "Reviewed" : "Mark Reviewed"}
        </button>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function buildAttachmentViews(email: InboxEmail | null, shipment: ShipmentVerification | null): AttachmentView[] {
  if (shipment?.documents.length) {
    return shipment.documents.map((document) => ({
      key: document.documentId,
      fileName: document.fileName,
      documentType: document.documentType,
      samplePath: document.samplePath,
      previewUrl: document.previewUrl ?? null,
      issueCount: countDocumentIssues(document, shipment),
    }));
  }

  return (
    email?.attachments.map((attachment) => ({
      key: attachment.samplePath,
      fileName: attachment.fileName,
      documentType: attachment.documentType,
      samplePath: attachment.samplePath,
      previewUrl: attachment.previewUrl ?? null,
      issueCount: 0,
    })) ?? []
  );
}

function countDocumentIssues(document: ShipmentDocumentResult, shipment: ShipmentVerification) {
  const documentLevelIssues = document.validation.results.filter((result) => result.result !== "match").length;
  const crossDocumentIssues = shipment.crossDocumentResults.filter(
    (result) =>
      result.result !== "match" && result.valuesByDocument.some((value) => value.fileName === document.fileName),
  ).length;

  return documentLevelIssues + crossDocumentIssues;
}

function getNextAction(shipment: ShipmentVerification | null) {
  if (!shipment) return "Select an SU email and process the attachments.";
  if (shipment.status === "failed") return shipment.errorMessage ?? "Processing failed. Review the error before retrying.";
  if (shipment.decision?.outcome === "approved") return "Review approval draft before continuing in the existing CG process.";
  if (shipment.decision?.outcome === "needs_amendment") return "Review discrepancy evidence, then copy the amendment draft.";
  return "Review uncertain fields. The workflow will not silently approve this shipment.";
}

function severityRank(result: CrossDocumentResult["result"]) {
  if (result === "mismatch") return 0;
  if (result === "uncertain") return 1;
  return 2;
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDocumentType(value: string) {
  return value
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function formatOutcome(outcome: string | null) {
  return outcome ? outcome.replaceAll("_", " ") : "-";
}
